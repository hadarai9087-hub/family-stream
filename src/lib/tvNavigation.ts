"use client";

import { useEffect, useState } from "react";
import { soundEffects } from "./soundEffects";

export function useTvMode() {
  const [isTvMode, setIsTvMode] = useState<boolean>(false);

  useEffect(() => {
    // Check if user explicitly set TV mode preference
    const stored = localStorage.getItem("tv_mode_enabled");
    if (stored !== null) {
      setIsTvMode(stored === "true");
      return;
    }

    // Auto-detect if device is Smart TV or URL query has ?tv=1
    if (typeof window !== "undefined") {
      const isTvDevice = /smart-tv|android tv|googletv|appletv|hbbtv/i.test(navigator.userAgent);
      const isTvUrl = new URLSearchParams(window.location.search).get("tv") === "1";
      setIsTvMode(isTvDevice || isTvUrl);
    }
  }, []);

  const toggleTvMode = () => {
    const next = !isTvMode;
    setIsTvMode(next);
    localStorage.setItem("tv_mode_enabled", String(next));
  };

  return { isTvMode, toggleTvMode };
}

function isNestedInsideFocusable(el: HTMLElement, boundary?: HTMLElement | null): boolean {
  let parent = el.parentElement;
  while (parent && parent !== boundary && parent !== document.body) {
    if (
      parent.tabIndex === 0 ||
      parent.tagName === "BUTTON" ||
      parent.tagName === "A" ||
      (typeof parent.className === "string" && parent.className.includes("tv-focusable"))
    ) {
      return true;
    }
    parent = parent.parentElement;
  }
  return false;
}

/**
 * 2D Spatial Grid Navigation Hook for Smart TV Remotes
 * Supports:
 * - Row-constrained horizontal navigation (ArrowLeft / ArrowRight) with wrapping
 * - Vertical cross-row jumping to nearest spatial item (ArrowUp / ArrowDown)
 * - Modal spatial containment barrier (locks focus to modal when open)
 * - Filtering out nested child elements inside cards
 * - Enter key triggering card click / playback
 * - Remote Back buttons: Samsung Tizen (10009), LG webOS (461), Escape, Backspace with e.preventDefault()
 * - Remote MediaPlayPause / MediaPlay / MediaPause
 * - Web Audio feedback
 */
export function useSpatialNavigation(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const isInput =
        activeEl?.tagName === "INPUT" ||
        activeEl?.tagName === "TEXTAREA" ||
        activeEl?.isContentEditable;

      // Smart TV Back key handling:
      // Samsung Tizen: 10009, LG webOS: 461, Escape, Backspace (when not typing)
      const isBackKey =
        e.key === "Escape" ||
        e.keyCode === 10009 ||
        e.keyCode === 461 ||
        (e.key === "Backspace" && !isInput);

      if (isBackKey) {
        e.preventDefault?.();
        e.stopPropagation?.();
        soundEffects.playBack();
        window.dispatchEvent(new CustomEvent("tv-back-pressed"));
        return;
      }

      // Play / Pause media keys on remotes
      const isPlayPauseKey =
        e.code === "MediaPlayPause" ||
        e.key === "MediaPlayPause" ||
        e.key === "MediaPlay" ||
        e.key === "MediaPause";

      if (isPlayPauseKey) {
        e.preventDefault?.();
        e.stopPropagation?.();
        window.dispatchEvent(new CustomEvent("tv-play-pause-pressed"));
        return;
      }

      // Enter key
      if (e.key === "Enter") {
        soundEffects.playSelect();
        if (activeEl && activeEl.tabIndex === 0 && activeEl.tagName === "DIV") {
          activeEl.click();
        }
        return;
      }

      // Detect active modal layer (barrier for spatial navigation)
      const activeModal = (
        typeof document.querySelector === "function"
          ? document.querySelector<HTMLElement>('[role="dialog"], .fixed.inset-0.z-50')
          : typeof document.querySelectorAll === "function"
          ? document.querySelectorAll<HTMLElement>('[role="dialog"], .fixed.inset-0.z-50')[0]
          : null
      );
      const rootScope: HTMLElement | Document = activeModal || document;

      // Find all eligible focusable elements scoped to modal or document
      const selector =
        'button:not([disabled]), [tabindex="0"]:not([disabled]), a[href]:not([disabled]), input:not([disabled])';
      const allElements = Array.from(rootScope.querySelectorAll<HTMLElement>(selector)).filter(
        (el) =>
          el.offsetParent !== null &&
          !el.getAttribute("aria-hidden") &&
          el.getAttribute("tabindex") !== "-1" &&
          !isNestedInsideFocusable(el, activeModal) &&
          (!window.getComputedStyle || (
            window.getComputedStyle(el).visibility !== "hidden" &&
            window.getComputedStyle(el).display !== "none"
          ))
      );

      if (allElements.length === 0) return;

      // Modal Tab cycle trapping
      if (e.key === "Tab" && activeModal) {
        e.preventDefault();
        const currentIdx = modalElementsIndex(allElements, activeEl);
        const nextIdx = e.shiftKey
          ? (currentIdx - 1 + allElements.length) % allElements.length
          : (currentIdx + 1) % allElements.length;
        allElements[nextIdx]?.focus();
        return;
      }

      // Directional arrow navigation
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        return;
      }

      e.preventDefault();
      soundEffects.playTick();

      // If nothing is focused or focused is body, focus first item
      if (!activeEl || activeEl === document.body || !allElements.includes(activeEl)) {
        allElements[0]?.focus();
        allElements[0]?.scrollIntoView?.({ behavior: "smooth", block: "center", inline: "center" });
        return;
      }

      const currentRect = activeEl.getBoundingClientRect();
      const currentRow = activeEl.closest<HTMLElement>('[data-tv-row="true"]');

      // 1. Horizontal Navigation (ArrowLeft / ArrowRight)
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        if (currentRow) {
          // Row-constrained horizontal navigation with clean wrapping!
          const rowElements = Array.from(
            currentRow.querySelectorAll<HTMLElement>(selector)
          ).filter(
            (el) =>
              el.offsetParent !== null &&
              !el.getAttribute("aria-hidden") &&
              el.getAttribute("tabindex") !== "-1" &&
              !isNestedInsideFocusable(el, currentRow)
          );

          const rowIdx = rowElements.indexOf(activeEl);
          if (rowIdx !== -1 && rowElements.length > 0) {
            let nextIdx: number;
            // In RTL layout:
            // ArrowLeft moves visually leftward (next item in Hebrew reading order: index + 1)
            // ArrowRight moves visually rightward (previous item in Hebrew reading order: index - 1)
            if (e.key === "ArrowLeft") {
              nextIdx = (rowIdx + 1) % rowElements.length;
            } else {
              nextIdx = (rowIdx - 1 + rowElements.length) % rowElements.length;
            }

            const target = rowElements[nextIdx];
            if (target) {
              target.focus();
              target.scrollIntoView?.({ behavior: "smooth", block: "nearest", inline: "center" });
            }
          }
          // ALWAYS return to isolate row navigation and prevent escape to global candidates
          return;
        }

        // Fallback for horizontal elements outside rows (e.g. navbar or modals)
        const currentCenterX = currentRect.left + currentRect.width / 2;
        const currentCenterY = currentRect.top + currentRect.height / 2;

        const isLeft = e.key === "ArrowLeft";
        const horizontalCandidates = allElements.filter((el) => {
          if (el === activeEl) return false;
          const r = el.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          return isLeft ? cx < currentCenterX - 5 : cx > currentCenterX + 5;
        });

        if (horizontalCandidates.length > 0) {
          horizontalCandidates.sort((a, b) => {
            const ra = a.getBoundingClientRect();
            const rb = b.getBoundingClientRect();
            const cxa = ra.left + ra.width / 2;
            const cxb = rb.left + rb.width / 2;
            const cya = ra.top + ra.height / 2;
            const cyb = rb.top + rb.height / 2;

            const distA = Math.abs(cxa - currentCenterX) + Math.abs(cya - currentCenterY) * 2;
            const distB = Math.abs(cxb - currentCenterX) + Math.abs(cyb - currentCenterY) * 2;
            return distA - distB;
          });

          horizontalCandidates[0].focus();
          horizontalCandidates[0].scrollIntoView?.({
            behavior: "smooth",
            block: "nearest",
            inline: "center",
          });
        }
        return;
      }

      // 2. Vertical Navigation (ArrowUp / ArrowDown)
      const isDown = e.key === "ArrowDown";
      const currentCenterX = currentRect.left + currentRect.width / 2;

      const verticalCandidates = allElements.filter((el) => {
        if (el === activeEl) return false;
        // Do not navigate within the same row horizontally
        if (currentRow && currentRow.contains(el)) return false;

        const r = el.getBoundingClientRect();
        return isDown ? r.top >= currentRect.bottom - 15 : r.bottom <= currentRect.top + 15;
      });

      if (verticalCandidates.length > 0) {
        // Find candidates in the closest vertical layer
        verticalCandidates.sort((a, b) => {
          const ra = a.getBoundingClientRect();
          const rb = b.getBoundingClientRect();

          const vDistA = isDown ? ra.top - currentRect.bottom : currentRect.top - ra.bottom;
          const vDistB = isDown ? rb.top - currentRect.bottom : currentRect.top - ra.bottom;

          // Strongly weight vertical layer closeness, then horizontal alignment
          const hDistA = Math.abs(ra.left + ra.width / 2 - currentCenterX);
          const hDistB = Math.abs(rb.left + rb.width / 2 - currentCenterX);

          const scoreA = Math.abs(vDistA) * 2.5 + hDistA;
          const scoreB = Math.abs(vDistB) * 2.5 + hDistB;

          return scoreA - scoreB;
        });

        const nextEl = verticalCandidates[0];
        if (nextEl) {
          nextEl.focus();
          nextEl.scrollIntoView?.({ behavior: "smooth", block: "center", inline: "center" });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled]);
}

function modalElementsIndex(elements: HTMLElement[], active: HTMLElement | null): number {
  if (!active) return 0;
  const idx = elements.indexOf(active);
  return idx === -1 ? 0 : idx;
}
