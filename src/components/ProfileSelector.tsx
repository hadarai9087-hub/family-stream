"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Plus, Edit2, Check } from "lucide-react";
import { UserProfile } from "@/types";

interface ProfileSelectorProps {
  profiles: UserProfile[];
  onSelectProfile: (profile: UserProfile) => void;
  onAddProfile: (newProfile: UserProfile) => void;
}

export const ProfileSelector: React.FC<ProfileSelectorProps> = ({
  profiles,
  onSelectProfile,
  onAddProfile,
}) => {
  const [isManaging, setIsManaging] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [isKids, setIsKids] = useState(false);

  const sampleAvatars = [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80",
  ];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newProfile: UserProfile = {
      id: "p_" + Date.now(),
      name: newName.trim(),
      avatar: sampleAvatars[Math.floor(Math.random() * sampleAvatars.length)],
      is_kids: isKids,
    };

    onAddProfile(newProfile);
    setNewName("");
    setIsAdding(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#141414] flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-300">
      <div className="max-w-4xl w-full flex flex-col items-center">
        {/* Logo */}
        <div className="mb-10 text-[#e50914] font-black text-4xl tracking-tighter uppercase drop-shadow-[0_2px_12px_rgba(229,9,20,0.6)]">
          STREAM
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-10 tracking-tight">
          {isManaging ? "ניהול פרופילים" : "מי צופה עכשיו?"}
        </h1>

        {/* Profile Grid */}
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 mb-12">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="group flex flex-col items-center cursor-pointer tv-focusable rounded-xl p-2 transition-transform duration-200"
            >
              <button
                type="button"
                onClick={() => onSelectProfile(profile)}
                className="w-24 h-24 md:w-36 md:h-36 rounded-2xl overflow-hidden relative block border-2 border-transparent group-hover:border-white group-focus:border-[#e50914] transition-all duration-300 shadow-xl group-hover:scale-105 bg-neutral-900"
              >
                <Image
                  src={profile.avatar}
                  alt={profile.name}
                  width={150}
                  height={150}
                  className="w-full h-full object-cover"
                />
                {isManaging && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Edit2 size={28} className="text-white" />
                  </div>
                )}
                {profile.is_kids && (
                  <div className="absolute bottom-2 left-2 bg-[#e50914] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                    ילדים
                  </div>
                )}
              </button>
              <span className="mt-3 text-neutral-400 group-hover:text-white text-base md:text-lg font-medium transition-colors">
                {profile.name}
              </span>
            </div>
          ))}

          {/* Add Profile Button */}
          {!isAdding ? (
            <div className="group flex flex-col items-center cursor-pointer tv-focusable rounded-xl p-2">
              <button
                onClick={() => setIsAdding(true)}
                className="w-24 h-24 md:w-36 md:h-36 rounded-xl border-2 border-neutral-600 border-dashed group-hover:border-white flex items-center justify-center transition-all duration-300 group-hover:scale-105"
              >
                <Plus size={40} className="text-neutral-500 group-hover:text-white transition-colors" />
              </button>
              <span className="mt-3 text-neutral-400 group-hover:text-white text-base md:text-lg font-medium transition-colors">
                הוסף פרופיל
              </span>
            </div>
          ) : (
            <form
              onSubmit={handleCreate}
              className="bg-[#202020] border border-white/20 p-5 rounded-xl flex flex-col items-center gap-3 w-64 animate-in zoom-in-95 duration-150"
            >
              <span className="text-sm font-bold text-white">פרופיל חדש</span>
              <input
                type="text"
                placeholder="שם הפרופיל"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                className="w-full bg-black/60 border border-white/20 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#e50914] text-right"
              />
              <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer self-start">
                <input
                  type="checkbox"
                  checked={isKids}
                  onChange={(e) => setIsKids(e.target.checked)}
                  className="rounded text-[#e50914]"
                />
                <span>פרופיל ילדים (סינון תכנים)</span>
              </label>
              <div className="flex gap-2 w-full mt-2">
                <button
                  type="submit"
                  className="flex-1 bg-[#e50914] text-white text-xs font-bold py-1.5 rounded hover:bg-[#b80710] transition-colors"
                >
                  שמור
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 bg-white/10 text-neutral-300 text-xs py-1.5 rounded hover:bg-white/20 transition-colors"
                >
                  ביטול
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Manage Button */}
        <button
          onClick={() => setIsManaging(!isManaging)}
          className="border border-neutral-500 text-neutral-400 hover:text-white hover:border-white px-6 py-2 text-sm md:text-base tracking-wider uppercase font-semibold transition-all tv-focusable rounded"
        >
          {isManaging ? "סיום" : "ניהול פרופילים"}
        </button>
      </div>
    </div>
  );
};
