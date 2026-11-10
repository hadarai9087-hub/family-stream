"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ChevronLeft,
  Server,
  Maximize,
  Minimize,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FastForward,
  Play,
  RotateCw,
  Subtitles as SubtitlesIcon,
} from "lucide-react";
import { MediaItem, StreamSource, SubtitleTrack } from "@/types";
import { resolveStreamSources } from "@/lib/streamResolvers";
import { storageManager } from "@/lib/supabase";
import { getHebrewSubtitles, parseWebVttCues, SubtitleCue } from "@/lib/subtitles";
import { SubtitleControls } from "./SubtitleControls";

interface PlayerModalProps {
  item: MediaItem;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeName?: string | null;
  initialProgressSeconds?: number;
  profileId: string;
  onClose: () => void;
  onNextEpisode?: () => void;
}

const WATCHDOG_TIMEOUT_MS = 6500;

export const PlayerModal: React.FC<PlayerModalProps> = ({
  item,
  seasonNumber = 1,
  episodeNumber = 1,
  episodeName,
  initialProgressSeconds = 0,
  profileId,
  onClose,
  onNextEpisode,
}) => {
  const [sources, setSources] = useState<StreamSource[]>([]);
  const [selectedSourceIndex, setSelectedSourceIndex] = useState(0);
  const currentSource = sources[selectedSourceIndex];

  // Server Connection & Watchdog Status State
  const [serverStatus, setServerStatus] = useState<"loading" | "ready" | "fallback">("loading");
  const [statusMessage, setStatusMessage] = useState<string>("מתחבר לשרת הזרמה...");
  const [statusVisible, setStatusVisible] = useState(true);
  const statusFadeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const watchdogTimerRef = useRef<NodeJS.Timeout | null>(null);

  // HUD & UI Visibility State
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isServerMenuOpen, setIsServerMenuOpen] = useState(false);
  const [isSubtitlesOpen, setIsSubtitlesOpen] = useState(false);

  // Subtitle State
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [subtitleCues, setSubtitleCues] = useState<SubtitleCue[]>([]);
  const [subtitleOffsetMs, setSubtitleOffsetMs] = useState(0);

  // Watch Progress Tracking
  const [currentTime, setCurrentTime] = useState(initialProgressSeconds);
  const duration = item.runtime ? item.runtime * 60 : 7200;
  const lastSavedTimeRef = useRef(initialProgressSeconds);
  const currentTimeRef = useRef(initialProgressSeconds);

  // Next Episode Countdown
  const [showAutoNext, setShowAutoNext] = useState(false);
  const [nextCountdown, setNextCountdown] = useState(6);

  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hudTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep ref synchronized with currentTime
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  // Listen for embed postMessage timeupdate & player events (R3.04)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data && (data.type === "PLAYER_EVENT" || data.event === "timeupdate")) {
          const t = data.currentTime || data.data?.currentTime || data.time;
          if (typeof t === "number" && !isNaN(t)) {
            const rounded = Math.floor(t);
            setCurrentTime(rounded);
            currentTimeRef.current = rounded;
          }
        }
      } catch {}
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Progress Persistence to Supabase / LocalStorage
  const saveProgress = useCallback(
    (time: number, force = false) => {
      if (time <= 0) return;
      const percentage = Math.min(100, Math.round((time / Math.max(1, duration)) * 100));
      const genreIds = item.genre_ids || (item.genres ? item.genres.map((g) => g.id) : undefined);
      storageManager.saveWatchProgress(
        {
          profile_id: profileId,
          userId: profileId,
          media_id: item.id,
          media_type: item.media_type,
          title: item.title,
          poster_path: item.poster_path,
          backdrop_path: item.backdrop_path,
          season_number: item.media_type === "tv" ? seasonNumber : undefined,
          episode_number: item.media_type === "tv" ? episodeNumber : undefined,
          episode_name: episodeName,
          progress_seconds: time,
          duration_seconds: duration,
          percentage,
          genre_ids: genreIds,
          updated_at: new Date().toISOString(),
        },
        { force }
      );
      lastSavedTimeRef.current = time;
    },
    [profileId, item, seasonNumber, episodeNumber, episodeName, duration]
  );

  // Skip Intro State (Aether & Netflix Style - R4)
  const [hasSkippedIntro, setHasSkippedIntro] = useState(false);
  const isIntroWindow =
    item.media_type === "tv" && currentTime >= 5 && currentTime <= 95 && !hasSkippedIntro;

  // Reset skip flag when rewinding back before intro window (R4.05)
  useEffect(() => {
    if (currentTime < 5 && hasSkippedIntro) {
      setHasSkippedIntro(false);
    }
  }, [currentTime, hasSkippedIntro]);

  const handleSkipIntro = useCallback(() => {
    setHasSkippedIntro(true);
    const targetTime = currentTimeRef.current + 85;
    setCurrentTime(targetTime);
    currentTimeRef.current = targetTime;
    setStatusMessage("דילגת על הפתיח (+85 שניות)");
    setStatusVisible(true);
    setTimeout(() => setStatusVisible(false), 2500);

    saveProgress(targetTime, true);

    try {
      const win = iframeRef.current?.contentWindow;
      if (win) {
        win.postMessage(JSON.stringify({ event: "command", func: "seekTo", args: [targetTime, true] }), "*");
        win.postMessage(JSON.stringify({ type: "SEEK", data: targetTime }), "*");
        win.postMessage({ type: "SEEK", data: targetTime }, "*");
        win.postMessage(JSON.stringify({ event: "seek", time: targetTime }), "*");
      }
    } catch {}
  }, [saveProgress]);

  // Auto-skip Intro if enabled in user settings (like Aether)
  useEffect(() => {
    if (isIntroWindow && !hasSkippedIntro) {
      try {
        const savedSettings = localStorage.getItem("hm_app_settings");
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          if (parsed.autoSkipIntro) {
            handleSkipIntro();
          }
        }
      } catch {}
    }
  }, [isIntroWindow, hasSkippedIntro, handleSkipIntro]);

  // Load Subtitle Tracks
  useEffect(() => {
    let isMounted = true;
    getHebrewSubtitles({
      tmdbId: item.tmdb_id || item.id,
      mediaType: item.media_type,
      season: seasonNumber,
      episode: episodeNumber,
    }).then((tracks) => {
      if (!isMounted) return;
      setSubtitles(tracks);
      // Keep overlay null by default to avoid duplicate overlapping subtitles with native player CC
      setSelectedTrackId(null);
    });

    return () => {
      isMounted = false;
    };
  }, [item, seasonNumber, episodeNumber]);

  // Load and Parse Active Subtitle Track WebVTT Content
  useEffect(() => {
    if (!selectedTrackId) {
      setSubtitleCues([]);
      return;
    }

    const activeTrack = subtitles.find((t) => t.id === selectedTrackId);
    if (!activeTrack?.url) return;

    let isMounted = true;
    fetch(activeTrack.url)
      .then((res) => res.text())
      .then((vttText) => {
        if (!isMounted) return;
        const cues = parseWebVttCues(vttText);
        setSubtitleCues(cues);
      })
      .catch((err) => {
        console.warn("Failed to load subtitle WebVTT cues:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedTrackId, subtitles]);

  // Compute Active Subtitle Cue based on currentTime and offset
  const effectiveSeconds = currentTime + subtitleOffsetMs / 1000;
  const activeCue = subtitleCues.find(
    (c) => effectiveSeconds >= c.startTime && effectiveSeconds <= c.endTime
  );

  // Initialize Stream Sources on Mount or Media/Episode Change
  useEffect(() => {
    const activeSub = subtitles.find((t) => t.id === selectedTrackId);
    const resolved = resolveStreamSources({
      tmdbId: item.tmdb_id || item.id,
      mediaType: item.media_type,
      season: seasonNumber,
      episode: episodeNumber,
      startAt: currentTimeRef.current,
      subtitleUrl: activeSub?.url,
    });
    setSources(resolved);
    setSelectedSourceIndex(0);
  }, [item, seasonNumber, episodeNumber, subtitles, selectedTrackId]);

  // Advance to next server (manually or via fallback on error/watchdog timeout)
  const advanceToNextServer = useCallback(
    (reason?: string) => {
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }

      const activeSub = subtitles.find((t) => t.id === selectedTrackId);
      const reResolved = resolveStreamSources({
        tmdbId: item.tmdb_id || item.id,
        mediaType: item.media_type,
        season: seasonNumber,
        episode: episodeNumber,
        startAt: currentTimeRef.current,
        subtitleUrl: activeSub?.url,
      });

      setSources(reResolved);
      setSelectedSourceIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % reResolved.length;
        const nextServer = reResolved[nextIndex];

        setServerStatus("fallback");
        setStatusMessage(
          reason
            ? `${reason} - מעביר לשרת (${nextIndex + 1}/${reResolved.length}): ${nextServer.name}`
            : `מעביר לשרת (${nextIndex + 1}/${reResolved.length}): ${nextServer.name}`
        );
        setStatusVisible(true);

        return nextIndex;
      });
    },
    [item, seasonNumber, episodeNumber, subtitles, selectedTrackId]
  );

  // 6.5s Client-Side Watchdog Timer & Source Switch Status Management
  useEffect(() => {
    if (!currentSource) return;

    if (statusFadeTimerRef.current) clearTimeout(statusFadeTimerRef.current);
    if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);

    setServerStatus("loading");
    setStatusVisible(true);
    setStatusMessage(
      `מתחבר לשרת (${selectedSourceIndex + 1}/${sources.length}): ${currentSource.name}...`
    );

    // Arm the 6.5s watchdog fallback timer
    watchdogTimerRef.current = setTimeout(() => {
      advanceToNextServer("זמן תגובה חרג מהמותר (6.5 שניות)");
    }, WATCHDOG_TIMEOUT_MS);

    return () => {
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }
    };
  }, [selectedSourceIndex, currentSource, sources.length, advanceToNextServer]);

  // Iframe onLoad Handler: Disarm watchdog timer and mark ready
  const handleIframeLoad = () => {
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }

    setServerStatus("ready");
    setStatusMessage(`מחובר: ${currentSource?.name || "שרת הזרמה"}`);
    setStatusVisible(true);

    if (statusFadeTimerRef.current) clearTimeout(statusFadeTimerRef.current);
    statusFadeTimerRef.current = setTimeout(() => {
      setStatusVisible(false);
    }, 2500);
  };

  // Iframe onError Handler
  const handleIframeError = () => {
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
    advanceToNextServer("שגיאת טעינה בשרת");
  };

  // Header auto-hide timer (reveals on mouse move or remote keypress)
  const revealHeader = useCallback(() => {
    setIsHeaderVisible(true);
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    hudTimeoutRef.current = setTimeout(() => {
      setIsHeaderVisible(false);
      setIsServerMenuOpen(false);
    }, 3500);
  }, []);

  useEffect(() => {
    revealHeader();
    return () => {
      if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    };
  }, [revealHeader]);


  // Track playback time and periodically persist
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        const next = prev + 1;
        if (Math.abs(next - lastSavedTimeRef.current) >= 15) {
          saveProgress(next, false);
        }
        return next;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      if (currentTimeRef.current > 0) {
        saveProgress(currentTimeRef.current, true);
      }
    };
  }, [saveProgress]);

  // Save progress on page unload or exit
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentTimeRef.current > 0) {
        saveProgress(currentTimeRef.current, true);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (currentTimeRef.current > 0) {
        saveProgress(currentTimeRef.current, true);
      }
    };
  }, [saveProgress]);

  // Fullscreen Handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {
        document.documentElement.requestFullscreen().catch(() => {});
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Play / Pause Media Control State
  const [isPlaying, setIsPlaying] = useState(true);

  const handleTogglePlayPause = useCallback(() => {
    setIsPlaying((prev) => {
      const next = !prev;
      setStatusMessage(next ? "מנגן" : "מושהה");
      setStatusVisible(true);
      setTimeout(() => setStatusVisible(false), 2000);
      try {
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: next ? "playVideo" : "pauseVideo", args: "" }),
          "*"
        );
      } catch {}
      return next;
    });
  }, []);

  // Listen for Remote Play/Pause and Back events
  useEffect(() => {
    const onRemotePlayPause = () => {
      handleTogglePlayPause();
    };
    const onRemoteBack = (e: Event) => {
      e.preventDefault();
      if (isSubtitlesOpen) {
        setIsSubtitlesOpen(false);
      } else if (isServerMenuOpen) {
        setIsServerMenuOpen(false);
      } else {
        onClose();
      }
    };

    window.addEventListener("tv-play-pause-pressed", onRemotePlayPause);
    window.addEventListener("tv-back-pressed", onRemoteBack);
    return () => {
      window.removeEventListener("tv-play-pause-pressed", onRemotePlayPause);
      window.removeEventListener("tv-back-pressed", onRemoteBack);
    };
  }, [handleTogglePlayPause, isSubtitlesOpen, isServerMenuOpen, onClose]);

  // Keyboard & TV Remote Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      revealHeader();

      const activeEl = document.activeElement as HTMLElement | null;
      const isInput =
        activeEl?.tagName === "INPUT" ||
        activeEl?.tagName === "TEXTAREA" ||
        activeEl?.isContentEditable;

      // Exit shortcuts: Escape, Backspace, Tizen (10009), LG webOS (461)
      if (
        e.key === "Escape" ||
        (e.key === "Backspace" && !isInput) ||
        e.keyCode === 10009 ||
        e.keyCode === 461
      ) {
        e.preventDefault();
        e.stopPropagation();
        if (isSubtitlesOpen) {
          setIsSubtitlesOpen(false);
        } else if (isServerMenuOpen) {
          setIsServerMenuOpen(false);
        } else {
          onClose();
        }
        return;
      } else if (
        e.code === "MediaPlayPause" ||
        e.key === "MediaPlayPause" ||
        e.key === "MediaPlay" ||
        e.key === "MediaPause" ||
        (e.key === " " && !isInput)
      ) {
        e.preventDefault();
        e.stopPropagation();
        handleTogglePlayPause();
        return;
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      } else if (e.key === "s" || e.key === "S" || e.key === "ד") {
        advanceToNextServer("החלפה יזומה");
      } else if (e.key === "c" || e.key === "C" || e.key === "ש") {
        // Toggle subtitles on/off
        setSelectedTrackId((prev) => (prev === null ? subtitles[0]?.id || null : null));
        setStatusMessage(selectedTrackId === null ? "כתוביות הופעלו" : "כתוביות כובו");
        setStatusVisible(true);
        setTimeout(() => setStatusVisible(false), 2000);
      } else if (e.key === "[") {
        e.preventDefault();
        const delta = e.shiftKey ? -1000 : -250;
        setSubtitleOffsetMs((prev) => {
          const next = Math.max(-10000, Math.min(10000, prev + delta));
          setStatusMessage(`סנכרון כתוביות: ${next > 0 ? `+${next}` : next}ms`);
          setStatusVisible(true);
          setTimeout(() => setStatusVisible(false), 2000);
          return next;
        });
      } else if (e.key === "]") {
        e.preventDefault();
        const delta = e.shiftKey ? 1000 : 250;
        setSubtitleOffsetMs((prev) => {
          const next = Math.max(-10000, Math.min(10000, prev + delta));
          setStatusMessage(`סנכרון כתוביות: ${next > 0 ? `+${next}` : next}ms`);
          setStatusVisible(true);
          setTimeout(() => setStatusVisible(false), 2000);
          return next;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    onClose,
    isServerMenuOpen,
    isSubtitlesOpen,
    advanceToNextServer,
    revealHeader,
    subtitles,
    selectedTrackId,
    handleTogglePlayPause,
  ]);

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      onMouseMove={revealHeader}
      onClick={revealHeader}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none overflow-hidden"
    >
      {/* Top Touch/Hover Zone to reliably reveal Header Bar */}
      <div
        onMouseEnter={revealHeader}
        className="absolute top-0 inset-x-0 h-20 z-30 pointer-events-auto"
      />

      {/* Video Display (Clean Edge-to-Edge Sandboxed Iframe) */}
      <div className="absolute inset-0 w-full h-full pointer-events-auto bg-black">
        {currentSource ? (
          <iframe
            ref={iframeRef}
            key={currentSource.url}
            src={currentSource.url}
            tabIndex={-1}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            className="w-full h-full border-0 bg-black"
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture; screen-wake-lock; clipboard-write"
            allowFullScreen
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-neutral-400 gap-3">
            <Loader2 className="animate-spin text-[var(--accent-theme)]" size={36} />
            <p className="text-sm font-semibold">טוען שרתי הזרמה...</p>
          </div>
        )}
      </div>

      {/* Universal Hebrew Subtitle Overlay */}
      {activeCue && selectedTrackId && (
        <div className="absolute bottom-12 md:bottom-20 inset-x-0 z-30 pointer-events-none flex justify-center px-4 animate-in fade-in duration-100">
          <div
            dir="rtl"
            className="bg-black/80 border border-white/10 text-white font-semibold text-base md:text-2xl px-5 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md max-w-3xl text-center leading-relaxed"
            style={{
              textShadow: "0 2px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.8)",
              fontFamily: "var(--font-assistant), sans-serif",
            }}
          >
            {activeCue.text.split("\n").map((line, idx) => (
              <div key={idx}>{line}</div>
            ))}
          </div>
        </div>
      )}

      {/* Styled Hebrew 'Skip Intro' Button (Visual Reference Match) */}
      {isIntroWindow && (
        <div className="absolute bottom-16 md:bottom-20 left-8 md:left-14 z-40 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <button
            type="button"
            onClick={handleSkipIntro}
            className="flex items-center gap-2.5 px-5 py-2.5 rounded-md bg-white hover:bg-neutral-200 text-black font-extrabold text-sm md:text-base shadow-[0_4px_25px_rgba(0,0,0,0.8)] transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer tv-focusable border border-black/10"
          >
            <span>דלג על פתיח</span>
            <span className="text-base tracking-tighter">▶|</span>
          </button>
        </div>
      )}

      {/* Top Status & Server Toast */}
      {statusVisible && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-top-4 duration-200 pointer-events-none">
          <div className="bg-black/85 border border-white/20 text-white px-4 py-2 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2.5 text-xs font-medium">
            {serverStatus === "loading" && (
              <Loader2 size={14} className="animate-spin text-[var(--accent-theme)]" />
            )}
            {serverStatus === "ready" && (
              <CheckCircle2 size={14} className="text-green-500" />
            )}
            {serverStatus === "fallback" && (
              <AlertCircle size={14} className="text-amber-400" />
            )}
            <span>{statusMessage}</span>
          </div>
        </div>
      )}

      {/* Next Episode Countdown Prompt (TV Series) */}
      {showAutoNext && onNextEpisode && (
        <div className="absolute bottom-8 left-8 z-40 bg-[#181818]/95 border border-white/20 p-4 rounded-2xl shadow-2xl flex flex-col gap-2.5 w-64 backdrop-blur-md animate-in slide-in-from-left duration-300">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400 font-medium">הפרק הבא מתחיל בעוד</span>
            <span className="text-[var(--accent-theme)] font-black">{nextCountdown} שניות</span>
          </div>
          <button
            onClick={() => {
              setShowAutoNext(false);
              onNextEpisode();
            }}
            className="w-full bg-[var(--accent-theme)] hover:bg-[var(--accent-hover)] text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors tv-focusable cursor-pointer"
          >
            <Play size={14} className="fill-white" />
            <span>נגן עכשיו</span>
          </button>
        </div>
      )}

      {/* Sleek Apple TV Top Header Bar (Auto-hides after 3.5s of inactivity) */}
      <div
        className={`absolute top-0 inset-x-0 z-40 p-6 md:p-8 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/50 to-transparent transition-opacity duration-300 ${
          isHeaderVisible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Right side (RTL start): Back Button & Title */}
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-3 rounded-full bg-black/60 hover:bg-white text-white hover:text-black border border-white/10 backdrop-blur-md transition-all duration-200 tv-focusable cursor-pointer shadow-lg"
            aria-label="חזור לדף הקודם"
            title="חזור (Escape)"
          >
            <ChevronLeft size={22} className="rotate-180" />
          </button>
          <div className="flex flex-col">
            <h2 className="text-lg md:text-xl font-black text-white drop-shadow-md">
              {item.title}
            </h2>
            {item.media_type === "tv" && (
              <p className="text-xs text-neutral-300 font-medium">
                {`עונה ${seasonNumber} פרק ${episodeNumber}${episodeName ? `: ${episodeName}` : ""}`}
              </p>
            )}
          </div>
        </div>

        {/* Left side (RTL end): Server, Subtitles & Fullscreen Controls */}
        <div className="flex items-center gap-2.5">
          {/* Subtitle Settings Button */}
          <button
            onClick={() => setIsSubtitlesOpen(true)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border backdrop-blur-md text-xs font-semibold tv-focusable transition-all cursor-pointer shadow-md ${
              selectedTrackId !== null
                ? "bg-[rgba(var(--accent-rgb),0.2)] border-[rgba(var(--accent-rgb),0.5)] text-white"
                : "bg-black/65 hover:bg-white text-neutral-300 hover:text-black border-white/15"
            }`}
            title="הגדרות כתוביות (מקש C)"
          >
            <SubtitlesIcon size={14} className={selectedTrackId ? "text-[var(--accent-theme)]" : ""} />
            <span>כתוביות</span>
            {selectedTrackId !== null && subtitleOffsetMs !== 0 && (
              <span className="text-[10px] text-amber-300 font-mono">
                {subtitleOffsetMs > 0 ? `+${subtitleOffsetMs}` : subtitleOffsetMs}ms
              </span>
            )}
          </button>

          {/* Quick "Next Server" Action Button */}
          <button
            onClick={() => advanceToNextServer("החלפה יזומה")}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/25 active:bg-[var(--accent-theme)] text-neutral-100 hover:text-white px-3.5 py-2 rounded-xl border border-white/15 backdrop-blur-md text-xs font-semibold tv-focusable transition-all cursor-pointer shadow-md"
            title="החלף לשרת הבא (מקש S)"
          >
            <RotateCw size={14} />
            <span>שרת הבא</span>
          </button>

          {/* Server Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsServerMenuOpen(!isServerMenuOpen)}
              className="flex items-center gap-2 bg-black/65 hover:bg-black/90 text-neutral-200 hover:text-white px-3.5 py-2 rounded-xl border border-white/15 backdrop-blur-md text-xs font-semibold tv-focusable transition-colors cursor-pointer shadow-md"
              title="בחר שרת הזרמה"
            >
              <Server size={14} className="text-[var(--accent-theme)]" />
              <span className="max-w-[140px] truncate">{currentSource?.name || "שרת הזרמה"}</span>
            </button>

            {isServerMenuOpen && (
              <div className="absolute left-0 mt-2 w-72 bg-[#141414] border border-white/20 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
                <div className="px-4 py-2 text-[11px] text-neutral-400 font-bold border-b border-white/10 flex items-center justify-between">
                  <span>בחר שרת הזרמה ({sources.length}):</span>
                  <span className="text-[10px] text-green-400">גיבוי אוטומטי (6.5s)</span>
                </div>
                <div className="max-h-72 overflow-y-auto py-1 no-scrollbar">
                  {sources.map((src, idx) => (
                    <button
                      key={src.id || src.name}
                      onClick={() => {
                        setSelectedSourceIndex(idx);
                        setIsServerMenuOpen(false);
                      }}
                      className={`w-full text-right px-4 py-2.5 text-xs flex items-center justify-between hover:bg-white/10 transition-colors cursor-pointer ${
                        idx === selectedSourceIndex
                          ? "text-[var(--accent-theme)] font-black bg-white/5"
                          : "text-neutral-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-neutral-500 text-[10px] font-mono">
                          T{src.tier || 1}
                        </span>
                        <span className="truncate">{src.name}</span>
                      </div>
                      <span className="text-[10px] text-neutral-400 bg-white/10 px-1.5 py-0.5 rounded ml-2 shrink-0">
                        {src.quality}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* TV Next Episode Button (if episode available) */}
          {item.media_type === "tv" && onNextEpisode && (
            <button
              onClick={onNextEpisode}
              className="flex items-center gap-1.5 bg-black/65 hover:bg-white text-white hover:text-black px-3.5 py-2 rounded-xl border border-white/15 backdrop-blur-md text-xs font-semibold tv-focusable transition-all cursor-pointer shadow-md"
              title="עבור לפרק הבא"
            >
              <FastForward size={14} />
              <span>פרק הבא</span>
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-black/65 hover:bg-white text-neutral-200 hover:text-black border border-white/15 backdrop-blur-md tv-focusable transition-all cursor-pointer shadow-md"
            title={isFullscreen ? "צא ממסך מלא (F)" : "מסך מלא (F)"}
            aria-label="מסך מלא"
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      </div>

      {/* Subtitle Controls Modal */}
      <SubtitleControls
        isOpen={isSubtitlesOpen}
        onClose={() => setIsSubtitlesOpen(false)}
        tracks={subtitles}
        selectedTrackId={selectedTrackId}
        onSelectTrack={(trackId) => setSelectedTrackId(trackId)}
        offsetMs={subtitleOffsetMs}
        onOffsetChange={(offset) => setSubtitleOffsetMs(offset)}
      />
    </div>
  );
};
