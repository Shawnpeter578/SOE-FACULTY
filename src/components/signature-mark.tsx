"use client";

import { useEffect, useRef } from "react";
import { SIGNATURE_GRID_MAX, signatureStrokes, type SignatureMark, type SignatureStroke } from "@/lib/profile-signature";

export function paintSignature(canvas: HTMLCanvasElement, strokes: SignatureStroke[]) {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#152961";
  context.lineWidth = 4;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  for (const stroke of strokes) {
    stroke.forEach(([x, y], index) => {
      const px = x / SIGNATURE_GRID_MAX * (canvas.width - 6) + 3;
      const py = y / SIGNATURE_GRID_MAX * (canvas.height - 6) + 3;
      if (index === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    });
  }
  context.stroke();
}

export default function SignaturePreview({ signature, className = "" }: { signature: SignatureMark; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvas.current && signature.kind === "drawn") paintSignature(canvas.current, signatureStrokes(signature.value));
  }, [signature.kind, signature.value]);

  if (signature.kind === "typed") {
    return <span className={`block break-words font-serif text-xl italic text-brand-primary ${className}`}>{signature.value}</span>;
  }
  return <canvas ref={canvas} width={800} height={240} role="img" aria-label="Drawn signature" className={`block h-auto max-w-full ${className}`} />;
}
