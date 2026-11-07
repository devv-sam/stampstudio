import type { ColorResult } from "react-color";

export function colorResultToHex({ rgb }: ColorResult) {
  const channels = [rgb.r, rgb.g, rgb.b];
  if ((rgb.a ?? 1) < 1) channels.push(Math.round((rgb.a ?? 1) * 255));
  return `#${channels.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

export function splitHexAlpha(color: string) {
  const digits = color.replace("#", "");
  return {
    hex: digits.slice(0, 6).toUpperCase(),
    opacity: digits.length === 8
      ? Math.round((parseInt(digits.slice(6), 16) / 255) * 100)
      : 100,
  };
}

export function joinHexAlpha(hex: string, opacity: number) {
  if (opacity >= 100) return `#${hex.toLowerCase()}`;
  const alpha = Math.round((opacity / 100) * 255);
  return `#${hex.toLowerCase()}${alpha.toString(16).padStart(2, "0")}`;
}
