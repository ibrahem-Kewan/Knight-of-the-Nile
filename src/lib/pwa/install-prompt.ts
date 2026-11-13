"use client";

/**
 * PWA install state — a tiny client-only store.
 *
 * `beforeinstallprompt` fires once, early, and often before the mobile menu is
 * opened, so it is captured here at module load (this file is imported by the
 * header's mobile menu, which is on every public page) and kept for later.
 *
 * Phones only: tablets and desktops never see the install entry (owner's decision).
 */

type Platform = "android" | "ios" | "other";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface InstallState {
  /** Running as an installed app (home-screen / standalone) — nothing to offer. */
  standalone: boolean;
  /** A phone (Android or iPhone), not a tablet or desktop. */
  phone: boolean;
  platform: Platform;
  /** Android/Chromium: the native install prompt is available. */
  canPrompt: boolean;
  /** Installed during this visit (`appinstalled` or the prompt was accepted). */
  installed: boolean;
}

const SERVER_STATE: InstallState = {
  standalone: false,
  phone: false,
  platform: "other",
  canPrompt: false,
  installed: false,
};

let deferred: BeforeInstallPromptEvent | null = null;
let state: InstallState = SERVER_STATE;
const listeners = new Set<() => void>();

function emit(patch: Partial<InstallState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPhone|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

function detectPhone(platform: Platform): boolean {
  const uaData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData;
  if (typeof uaData?.mobile === "boolean") return uaData.mobile;
  if (platform === "ios") return true; // iPhone/iPod only (iPad excluded above)
  // Android phones carry "Mobile" in the UA; Android tablets do not.
  return platform === "android" && /Mobile/i.test(navigator.userAgent);
}

function detectStandalone(): boolean {
  const mq = (q: string) => window.matchMedia?.(q).matches === true;
  return (
    mq("(display-mode: standalone)") ||
    mq("(display-mode: fullscreen)") ||
    mq("(display-mode: minimal-ui)") ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    document.referrer.startsWith("android-app://")
  );
}

if (typeof window !== "undefined") {
  const platform = detectPlatform();
  state = {
    standalone: detectStandalone(),
    phone: detectPhone(platform),
    platform,
    canPrompt: false,
    installed: false,
  };

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // keep Chrome's mini-infobar away; we offer our own entry
    deferred = e as BeforeInstallPromptEvent;
    emit({ canPrompt: true });
  });

  window.addEventListener("appinstalled", () => {
    deferred = null;
    emit({ canPrompt: false, installed: true });
  });

  window.matchMedia?.("(display-mode: standalone)").addEventListener?.("change", (e) => {
    emit({ standalone: e.matches });
  });
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getSnapshot = () => state;
export const getServerSnapshot = () => SERVER_STATE;

/** Shows the native Android/Chromium install dialog. The event is single-use. */
export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const ev = deferred;
  if (!ev) return "unavailable";
  deferred = null;
  emit({ canPrompt: false });
  await ev.prompt();
  const { outcome } = await ev.userChoice;
  if (outcome === "accepted") emit({ installed: true });
  return outcome;
}
