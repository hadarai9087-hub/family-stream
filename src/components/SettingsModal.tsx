"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  X,
  Palette,
  Subtitles,
  User,
  Upload,
  Check,
  FastForward,
  Sparkles,
  Sliders,
} from "lucide-react";
import { UserAccount, authManager, AVATAR_POOL } from "@/lib/auth";

export interface AppSettings {
  preferredSubtitleLang: string;
  accentColor: string;
  autoSkipIntro: boolean;
  subtitleSize: "normal" | "large" | "xlarge";
}

export interface ThemeColor {
  id: string;
  name: string;
  hex: string;
  hover: string;
  rgb: string;
}

export const THEME_COLORS: ThemeColor[] = [
  { id: "red", name: "אדום קולנוע", hex: "#e50914", hover: "#b80710", rgb: "229, 9, 20" },
  { id: "blue", name: "כחול ניאון", hex: "#0070f3", hover: "#0058c6", rgb: "0, 112, 243" },
  { id: "purple", name: "סגול סייבר", hex: "#8b5cf6", hover: "#7c3aed", rgb: "139, 92, 246" },
  { id: "emerald", name: "ירוק אזמרגד", hex: "#10b981", hover: "#059669", rgb: "16, 185, 129" },
  { id: "gold", name: "זהב יוקרתי", hex: "#f59e0b", hover: "#d97706", rgb: "245, 158, 11" },
  { id: "pink", name: "ורוד ניאון", hex: "#ec4899", hover: "#db2777", rgb: "236, 72, 153" },
];

export function applyThemeAccent(accentHex: string) {
  if (typeof document === "undefined") return;
  const match = THEME_COLORS.find((c) => c.hex.toLowerCase() === accentHex.toLowerCase()) || THEME_COLORS[0];
  const root = document.documentElement;
  root.style.setProperty("--accent-theme", match.hex);
  root.style.setProperty("--accent-hover", match.hover);
  root.style.setProperty("--accent-rgb", match.rgb);
}

export const SUBTITLE_LANGUAGES = [
  { code: "he", label: "עברית (Hebrew - מומלץ)" },
  { code: "en", label: "אנגלית (English)" },
  { code: "ru", label: "רוסית (Russian)" },
  { code: "ar", label: "ערבית (Arabic)" },
  { code: "fr", label: "צרפתית (French)" },
  { code: "es", label: "ספרדית (Spanish)" },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: UserAccount | null;
  onAccountUpdated: (updated: UserAccount) => void;
  onSettingsChanged?: (settings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  account,
  onAccountUpdated,
  onSettingsChanged,
}) => {
  const [activeTab, setActiveTab] = useState<"appearance" | "subtitles" | "profile" | "player">("appearance");

  // Profile fields
  const [username, setUsername] = useState(account?.username || "");
  const [selectedAvatar, setSelectedAvatar] = useState(account?.avatar || AVATAR_POOL[0]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // App settings state
  const [settings, setSettings] = useState<AppSettings>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("hm_app_settings");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return {
      preferredSubtitleLang: "he",
      accentColor: "#e50914",
      autoSkipIntro: true,
      subtitleSize: "normal",
    };
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (account) {
      setUsername(account.username);
      setSelectedAvatar(account.avatar);
    }
  }, [account]);

  useEffect(() => {
    if (settings.accentColor) {
      applyThemeAccent(settings.accentColor);
    }
  }, [settings.accentColor]);

  if (!isOpen) return null;

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("hm_app_settings", JSON.stringify(updated));
      if (key === "accentColor") {
        applyThemeAccent(value as string);
      }
    }
    if (onSettingsChanged) {
      onSettingsChanged(updated);
    }
  };

  const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        // Compress & crop to square 140x140 using canvas
        const canvas = document.createElement("canvas");
        const size = 140;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          setSelectedAvatar(dataUrl);
        }
        setIsUploading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAll = async () => {
    if (account) {
      const updated = await authManager.updateUserProfile({
        username,
        avatar: selectedAvatar,
      });
      if (updated) {
        onAccountUpdated(updated);
      }
    }
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-[#141416]/95 border border-white/15 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-white/10 text-white">
              <Sliders size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">הגדרות מערכת ופרופיל</h2>
              <p className="text-xs text-neutral-400">התאמה אישית של כתוביות, צבעים וחוויית צפייה</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-white/10 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("appearance")}
            className={`flex items-center gap-2 pb-3 px-3 text-xs md:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "appearance"
                ? "text-white border-[var(--accent-theme)]"
                : "text-neutral-400 border-transparent hover:text-white"
            }`}
          >
            <Palette size={16} />
            <span>צבע ומראה</span>
          </button>

          <button
            onClick={() => setActiveTab("subtitles")}
            className={`flex items-center gap-2 pb-3 px-3 text-xs md:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "subtitles"
                ? "text-white border-[var(--accent-theme)]"
                : "text-neutral-400 border-transparent hover:text-white"
            }`}
          >
            <Subtitles size={16} />
            <span>שפת כתוביות</span>
          </button>

          <button
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 pb-3 px-3 text-xs md:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "profile"
                ? "text-white border-[var(--accent-theme)]"
                : "text-neutral-400 border-transparent hover:text-white"
            }`}
          >
            <User size={16} />
            <span>תמונת פרופיל</span>
          </button>

          <button
            onClick={() => setActiveTab("player")}
            className={`flex items-center gap-2 pb-3 px-3 text-xs md:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "player"
                ? "text-white border-[var(--accent-theme)]"
                : "text-neutral-400 border-transparent hover:text-white"
            }`}
          >
            <FastForward size={16} />
            <span>נגן ודילוג פתיח</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-right">
          {/* TAB 1: APPEARANCE */}
          {activeTab === "appearance" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <label className="block text-sm font-bold text-white mb-2">
                  צבע הדגשה לממשק (Theme Accent Color)
                </label>
                <p className="text-xs text-neutral-400 mb-4">
                  בחר את הצבע הראשי לכפתורים, סימוני בחירה והילות ניאון
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {THEME_COLORS.map((c) => {
                    const isSelected = settings.accentColor === c.hex;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => updateSetting("accentColor", c.hex)}
                        className={`flex items-center gap-3 p-3 rounded-2xl border transition-all text-right cursor-pointer ${
                          isSelected
                            ? "bg-white/10 border-white shadow-lg"
                            : "bg-white/5 border-white/10 hover:bg-white/10"
                        }`}
                      >
                        <div
                          className="w-6 h-6 rounded-full shrink-0 shadow-md flex items-center justify-center text-white"
                          style={{ backgroundColor: c.hex }}
                        >
                          {isSelected && <Check size={14} className="stroke-[3]" />}
                        </div>
                        <span className="text-xs font-semibold text-white">{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SUBTITLES */}
          {activeTab === "subtitles" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <label className="block text-sm font-bold text-white mb-2">
                  שפת כתוביות ברירת מחדל
                </label>
                <p className="text-xs text-neutral-400 mb-4">
                  המערכת תעדיף שפה זו בכל סרט או סדרה שתפעיל
                </p>

                <div className="space-y-2">
                  {SUBTITLE_LANGUAGES.map((lang) => {
                    const isSelected = settings.preferredSubtitleLang === lang.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => updateSetting("preferredSubtitleLang", lang.code)}
                        className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all text-right cursor-pointer ${
                          isSelected
                            ? "bg-[rgba(var(--accent-rgb),0.2)] border-[var(--accent-theme)] text-white"
                            : "bg-white/5 border-white/10 hover:bg-white/10 text-neutral-300"
                        }`}
                      >
                        <span className="text-sm font-medium">{lang.label}</span>
                        {isSelected && <Check size={18} className="text-[var(--accent-theme)]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-white mb-2">
                  גודל כיתוב כתוביות
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(["normal", "large", "xlarge"] as const).map((sz) => {
                    const labels = { normal: "רגיל (ברירת מחדל)", large: "גדול", xlarge: "ענק" };
                    const isSelected = settings.subtitleSize === sz;
                    return (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => updateSetting("subtitleSize", sz)}
                        className={`p-3 rounded-2xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[var(--accent-theme)] text-white border-[var(--accent-theme)]"
                            : "bg-white/5 border-white/10 hover:bg-white/10 text-neutral-400"
                        }`}
                      >
                        {labels[sz]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PROFILE & AVATAR */}
          {activeTab === "profile" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                  שם משתמש
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#202024] border border-white/15 focus:border-[var(--accent-theme)] text-white text-sm rounded-xl py-3 px-4 focus:outline-none transition-all"
                  placeholder="שם לתצוגה"
                />
              </div>

              <div>
                <div className="mb-3">
                  <label className="text-sm font-bold text-white block">
                    בחירת דמות אנימציה לפרופיל
                  </label>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    דמויות אנימציה וסדרות אהובות בסגנון Netflix
                  </p>
                </div>

                {/* Avatar Preview & Built-in Grid */}
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                  {AVATAR_POOL.map((av, idx) => {
                    const isSelected = selectedAvatar === av;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedAvatar(av)}
                        className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all cursor-pointer group ${
                          isSelected
                            ? "border-[var(--accent-theme)] scale-105 shadow-[0_0_20px_rgba(var(--accent-rgb),0.5)]"
                            : "border-transparent opacity-70 hover:opacity-100 hover:scale-100"
                        }`}
                      >
                        <Image
                          src={av}
                          alt={`Avatar ${idx + 1}`}
                          fill
                          className="object-cover"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-[rgba(var(--accent-rgb),0.2)] flex items-center justify-center">
                            <Check size={20} className="text-white drop-shadow" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PLAYER & AETHER-STYLE SKIP INTRO */}
          {activeTab === "player" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <span className="text-sm font-bold text-white block mb-1">
                    דילוג אוטומטי על פתיח (Auto-Skip Intro)
                  </span>
                  <p className="text-xs text-neutral-400">
                    מדלג אוטומטית על פתיח בסדרות טלוויזיה (בדיוק כמו ב-Aether וב-Netflix)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => updateSetting("autoSkipIntro", !settings.autoSkipIntro)}
                  className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                    settings.autoSkipIntro ? "bg-[var(--accent-theme)]" : "bg-neutral-700"
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      settings.autoSkipIntro ? "right-1" : "right-7"
                    }`}
                  />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-xs font-semibold text-neutral-400 block mb-2">
                  טיפ לכתוביות וסנכרון:
                </span>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  בזמן צפייה בסרט או סדרה, ניתן ללחוץ על המקשים <code className="bg-black/50 px-1.5 py-0.5 rounded text-white">[</code> ו-<code className="bg-black/50 px-1.5 py-0.5 rounded text-white">]</code> במקלדת כדי להזיז את הכתוביות קדימה או אחורה בדיוק של 250 מילישניות!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-white/5">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-neutral-400 hover:text-white px-4 py-2.5 rounded-xl cursor-pointer"
          >
            ביטול
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            className="flex items-center gap-2 bg-[var(--accent-theme)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg active:scale-95 cursor-pointer"
          >
            {savedSuccess ? (
              <>
                <Check size={16} />
                <span>נשמר בהצלחה!</span>
              </>
            ) : (
              <span>שמור שינויים</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
