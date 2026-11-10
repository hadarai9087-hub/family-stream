"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { X, Smartphone, CheckCircle, RefreshCw } from "lucide-react";
import { generateTvPairSession, listenToTvPairSession, approveTvPairSession, TvPairSession, TvPairApprovalData } from "@/lib/tvPairing";
import { Account, DEFAULT_FAMILY_ACCOUNT } from "@/lib/auth";

interface TvPairModalProps {
  onClose: () => void;
  onPairApproved: (account: Account, profileId?: string) => void;
}

export const TvPairModal: React.FC<TvPairModalProps> = ({ onClose, onPairApproved }) => {
  const [session, setSession] = useState<TvPairSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    generateTvPairSession().then((newSession) => {
      setSession(newSession);
      setIsLoading(false);

      unsubscribe = listenToTvPairSession(newSession.code, (data: TvPairApprovalData) => {
        setIsSuccess(true);
        setTimeout(() => {
          onPairApproved(data.account, data.profileId);
          onClose();
        }, 1500);
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [onPairApproved, onClose]);

  // Demo shortcut button for testing immediately:
  const handleQuickDemoApprove = () => {
    if (session) {
      approveTvPairSession(session.code, DEFAULT_FAMILY_ACCOUNT, "p1");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#181818] border border-white/15 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-full bg-white/10 hover:bg-white text-white hover:text-black transition-colors tv-focusable"
          aria-label="סגור"
        >
          <X size={20} />
        </button>

        {/* Icon & Title */}
        <div className="w-14 h-14 rounded-2xl bg-[rgba(var(--accent-rgb),0.2)] border border-[rgba(var(--accent-rgb),0.4)] text-[var(--accent-theme)] flex items-center justify-center mb-4">
          <Smartphone size={28} />
        </div>

        <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-2">
          זיווג טלוויזיה חכם
        </h2>
        <p className="text-sm text-neutral-400 mb-6 max-w-sm">
          התחבר בקלות מהטלפון או המחשב ללא צורך בהקלדת סיסמאות בשלט הטלוויזיה.
        </p>

        {isSuccess ? (
          <div className="flex flex-col items-center py-10 animate-in zoom-in-95 duration-200">
            <CheckCircle size={64} className="text-[#46d369] mb-4" />
            <h3 className="text-xl font-bold text-white">הזיווג הושלם בהצלחה!</h3>
            <p className="text-sm text-neutral-400 mt-1">טוען את הפרופיל שלך לטלוויזיה...</p>
          </div>
        ) : isLoading || !session ? (
          <div className="py-16 flex flex-col items-center gap-3 text-neutral-400 text-sm">
            <RefreshCw size={32} className="animate-spin text-[var(--accent-theme)]" />
            <span>מייצר קוד זיווג מאובטח...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center w-full">
            {/* QR Code Container */}
            <div className="bg-white p-4 rounded-2xl shadow-xl mb-6">
              {session.qrDataUrl && (
                <Image
                  src={session.qrDataUrl}
                  alt="QR Code"
                  width={220}
                  height={220}
                  className="rounded-lg"
                />
              )}
            </div>

            {/* 6-character Code Display */}
            <div className="mb-6">
              <span className="text-xs uppercase text-neutral-400 tracking-wider font-semibold block mb-1">
                או הזן קוד זיווג בטלפון:
              </span>
              <div className="text-3xl md:text-4xl font-mono font-black tracking-widest text-[var(--accent-theme)] bg-black/60 px-6 py-2.5 rounded-xl border border-white/10 select-all">
                {session.code}
              </div>
            </div>

            {/* Instructions list */}
            <div className="text-xs text-neutral-400 space-y-1.5 mb-6 text-right w-full bg-white/5 p-4 rounded-xl">
              <div>1. סרוק את קוד ה-QR עם מצלמת הטלפון.</div>
              <div>2. אשר את ההתחברות ובחר את הפרופיל שלך.</div>
              <div>3. הטלוויזיה תתחבר אוטומטית תוך שנייה!</div>
            </div>

            {/* Quick Demo Test Button */}
            <button
              onClick={handleQuickDemoApprove}
              className="text-xs text-neutral-400 hover:text-white underline transition-colors"
            >
              לחץ כאן לבדיקת סימולציית אישור מיידית (Demo)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
