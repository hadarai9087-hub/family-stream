"use client";

import React from "react";
import { SubtitleTrack } from "@/types";
import {
  Subtitles,
  X,
  Plus,
  Minus,
  RotateCcw,
  Check,
  Languages,
} from "lucide-react";

interface SubtitleControlsProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: SubtitleTrack[];
  selectedTrackId: string | null; // null means subtitles disabled
  onSelectTrack: (trackId: string | null) => void;
  offsetMs: number;
  onOffsetChange: (offsetMs: number) => void;
}

export const SubtitleControls: React.FC<SubtitleControlsProps> = ({
  isOpen,
  onClose,
  tracks,
  selectedTrackId,
  onSelectTrack,
  offsetMs,
  onOffsetChange,
}) => {
  if (!isOpen) return null;

  const handleStep = (deltaMs: number) => {
    const clamped = Math.max(-10000, Math.min(10000, offsetMs + deltaMs));
    onOffsetChange(clamped);
  };

  const handleReset = () => {
    onOffsetChange(0);
  };

  const formatOffset = (ms: number) => {
    if (ms === 0) return "0ms";
    return ms > 0 ? `+${ms}ms` : `${ms}ms`;
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#181818]/95 border border-white/15 rounded-3xl p-6 shadow-2xl backdrop-blur-xl flex flex-col gap-5 text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[rgba(var(--accent-rgb),0.2)] text-[var(--accent-theme)]">
              <Subtitles size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">הגדרות כתוביות ותרגום</h3>
              <p className="text-xs text-neutral-400">בחר רצועת כתוביות וכוונון סנכרון</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer tv-focusable"
            aria-label="סגור"
          >
            <X size={18} />
          </button>
        </div>

        {/* Track Selection List */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
            <Languages size={14} className="text-[var(--accent-theme)]" />
            <span>רצועת כתוביות:</span>
          </span>

          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-0.5 no-scrollbar">
            {/* Off Option */}
            <button
              onClick={() => onSelectTrack(null)}
              className={`w-full text-right px-4 py-2.5 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer tv-focusable ${
                selectedTrackId === null
                  ? "bg-[var(--accent-theme)] text-white font-bold shadow-lg"
                  : "bg-white/5 hover:bg-white/10 text-neutral-300"
              }`}
            >
              <span>ללא כתוביות (כבוי)</span>
              {selectedTrackId === null && <Check size={16} />}
            </button>

            {/* Subtitle Tracks */}
            {tracks.map((track) => {
              const isSelected = selectedTrackId === track.id;
              return (
                <button
                  key={track.id}
                  onClick={() => onSelectTrack(track.id)}
                  className={`w-full text-right px-4 py-2.5 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer tv-focusable ${
                    isSelected
                      ? "bg-[var(--accent-theme)] text-white font-bold shadow-lg"
                      : "bg-white/5 hover:bg-white/10 text-neutral-300"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="truncate">{track.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {track.source && (
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-black/40 text-neutral-300">
                        {track.source}
                      </span>
                    )}
                    {isSelected && <Check size={16} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Timing Sync Adjustment (+/- ms) */}
        {selectedTrackId !== null && (
          <div className="flex flex-col gap-3 pt-3 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-300">
                סנכרון והשהיית כתוביות:
              </span>
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                  offsetMs === 0
                    ? "text-neutral-400 bg-white/5"
                    : "text-[var(--accent-theme)] bg-[rgba(var(--accent-rgb),0.15)]"
                }`}
              >
                {formatOffset(offsetMs)}
              </span>
            </div>

            {/* Stepper Buttons */}
            <div className="grid grid-cols-5 gap-2">
              <button
                onClick={() => handleStep(-1000)}
                className="py-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs font-semibold flex items-center justify-center gap-1 transition-colors tv-focusable cursor-pointer"
                title="הקדם בשנייה אחת"
              >
                <Minus size={12} />
                <span>1s</span>
              </button>

              <button
                onClick={() => handleStep(-250)}
                className="py-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs font-semibold flex items-center justify-center gap-1 transition-colors tv-focusable cursor-pointer"
                title="הקדם ב-250 מילישניות"
              >
                <Minus size={12} />
                <span>250ms</span>
              </button>

              <button
                onClick={handleReset}
                className="py-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs font-semibold flex items-center justify-center gap-1 transition-colors tv-focusable cursor-pointer"
                title="איפוס ל-0ms"
              >
                <RotateCcw size={12} />
                <span>0</span>
              </button>

              <button
                onClick={() => handleStep(250)}
                className="py-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs font-semibold flex items-center justify-center gap-1 transition-colors tv-focusable cursor-pointer"
                title="השהה ב-250 מילישניות"
              >
                <Plus size={12} />
                <span>250ms</span>
              </button>

              <button
                onClick={() => handleStep(1000)}
                className="py-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs font-semibold flex items-center justify-center gap-1 transition-colors tv-focusable cursor-pointer"
                title="השהה בשנייה אחת"
              >
                <Plus size={12} />
                <span>1s</span>
              </button>
            </div>

            <p className="text-[11px] text-neutral-400 text-center">
              טיפ במקלדת: מקשים [ ו- ] לכוונון מהיר של 250ms, מקש C להדלקה/כיבוי
            </p>
          </div>
        )}

        <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-[11px] text-neutral-300 leading-relaxed text-right">
          <span className="text-white font-bold block mb-1">טיפ כתוביות בנגן:</span>
          במרבית השרתים (כמו VidLink Pro ו-Cinecat), ניתן גם לבחור כתוביות בעברית ישירות מתוך נגן הווידאו עצמו על ידי לחיצה על כפתור <strong>CC</strong> או גלגל השיניים שבתחתית הנגן.
        </div>

        {/* Footer */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer tv-focusable"
        >
          אישור וסגירה
        </button>
      </div>
    </div>
  );
};
