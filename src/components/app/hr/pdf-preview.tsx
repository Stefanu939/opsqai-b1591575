// OPSQAI HR — inline PDF preview from base64 data (no external viewer).
import { useEffect, useState } from "react";

export function PdfPreview({
  base64,
  mime = "application/pdf",
  height = 520,
}: {
  base64: string;
  mime?: string;
  height?: number;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: mime });
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [base64, mime]);

  if (!url) return null;
  if (mime.startsWith("image/")) {
    return <img src={url} alt="" className="w-full rounded-lg border border-border/60" />;
  }
  return (
    <iframe
      title="preview"
      src={url}
      className="w-full rounded-lg border border-border/60 bg-white"
      style={{ height }}
    />
  );
}
