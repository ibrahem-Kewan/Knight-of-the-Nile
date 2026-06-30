"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export function QrCode({ value, size = 128 }: { value: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) {
      QRCode.toCanvas(ref.current, value, { width: size, margin: 1, color: { dark: "#0E0E0E", light: "#ffffff" } }).catch(() => {});
    }
  }, [value, size]);
  return <canvas ref={ref} className="rounded-md bg-white p-1" />;
}
