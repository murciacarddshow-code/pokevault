"use client";

import { useState } from "react";
import Image from "next/image";

interface PackImageProps {
  src:          string;
  alt:          string;
  accentColor?: string;
  fill?:        boolean;
  width?:       number;
  height?:      number;
  className?:   string;
  sizes?:       string;
  priority?:    boolean;
}

function isLocal(s: string) { return !!s && s.startsWith("/"); }

function Fallback({ color = "#8B2FFF", fill, width, height }:
  { color?: string; fill?: boolean; width?: number; height?: number }) {
  const s: React.CSSProperties = fill
    ? { position: "absolute", inset: 0 }
    : { width: width ?? "100%", height: height ?? "100%" };
  return (
    <div style={{
      ...s, position: fill ? "absolute" : "relative",
      background: `radial-gradient(ellipse at 50% 35%, ${color}40 0%, #04030E 65%)`,
    }} />
  );
}

export function PackImage({
  src, alt, accentColor = "#8B2FFF",
  fill, width, height,
  className = "object-contain",
  sizes, priority,
}: PackImageProps) {
  const [failed, setFailed] = useState(false);

  if (!isLocal(src) || failed)
    return <Fallback color={accentColor} fill={fill} width={width} height={height} />;

  const p = { src, alt, className, sizes, priority, unoptimized: true, onError: () => setFailed(true) };
  if (fill) return <Image {...p} fill />;
  return <Image {...p} width={width!} height={height!} />;
}
