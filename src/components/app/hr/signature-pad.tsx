// OPSQAI HR — draw a signature with mouse or finger and return it as PNG.
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export function SignaturePad({
  onSave,
  clearLabel,
  saveLabel,
  disabled,
}: {
  onSave: (pngBase64: string) => void;
  clearLabel: string;
  saveLabel: string;
  disabled?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111827";
  }, []);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = point(event);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    drawing.current = true;
  };

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = point(event);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setDirty(true);
  };

  const end = () => {
    drawing.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setDirty(false);
  };

  return (
    <div className="grid gap-2">
      <canvas
        ref={canvasRef}
        width={640}
        height={220}
        className="h-40 w-full touch-none rounded-lg border border-border bg-white"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={clear} disabled={disabled}>
          {clearLabel}
        </Button>
        <Button
          size="sm"
          disabled={disabled || !dirty}
          onClick={() => {
            const url = canvasRef.current?.toDataURL("image/png");
            if (url) onSave(url.split(",")[1] ?? "");
          }}
        >
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}
