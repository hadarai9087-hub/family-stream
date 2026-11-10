"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TvRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // If user specifically navigates to /tv on a desktop/phone, offer download page
    // If ?launch=1 is supplied, go to /?tv=1
    const params = new URLSearchParams(window.location.search);
    if (params.get("launch") === "1" || /smart-tv|android tv|googletv|appletv|hbbtv/i.test(navigator.userAgent)) {
      router.replace("/?tv=1");
    } else {
      router.replace("/download");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0e0e10] flex items-center justify-center text-white text-sm" dir="rtl">
      מעביר לפורטל הטלוויזיה...
    </div>
  );
}
