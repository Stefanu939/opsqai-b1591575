import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import {
  clearMyAvatar,
  initialsOf,
  readAvatarPath,
  uploadMyAvatar,
  useAvatarUrl,
} from "@/lib/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg" | "xl";

const SIZE_PX: Record<Size, number> = { sm: 32, md: 44, lg: 64, xl: 112 };

interface AvatarUploaderProps {
  /** When `false`, renders as a display-only avatar. Defaults to `true`. */
  editable?: boolean;
  size?: Size;
  className?: string;
  /** Called after a successful upload with the new storage path. */
  onChange?: (path: string | null) => void;
}

/**
 * Enterprise avatar with inline uploader for the current authenticated user.
 * - Reads `profiles.avatar_url` and resolves to a signed URL.
 * - Uploads to `avatars/{userId}/avatar-*.{ext}`.
 * - Enforces JPG/PNG/WebP and ≤2MB.
 */
export function AvatarUploader({
  editable = true,
  size = "md",
  className,
  onChange,
}: AvatarUploaderProps) {
  const { user } = useAuth();
  const [path, setPath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const signedUrl = useAvatarUrl(path);
  const initials = initialsOf({
    fullName: (user?.user_metadata?.full_name as string) ?? null,
    email: user?.email ?? null,
  });

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    readAvatarPath(user.id).then((p) => {
      if (!cancelled) setPath(p);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const px = SIZE_PX[size];

  async function handleFile(file: File | null) {
    if (!file || !user?.id) return;
    setBusy(true);
    try {
      const { path: p } = await uploadMyAvatar(file, user.id);
      setPath(p);
      onChange?.(p);
      toast.success("Profile picture updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleClear() {
    if (!user?.id) return;
    setBusy(true);
    try {
      await clearMyAvatar(user.id);
      setPath(null);
      onChange?.(null);
      toast.success("Profile picture removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove");
    } finally {
      setBusy(false);
    }
  }

  const AvatarInner = (
    <div
      className={cn(
        "relative overflow-hidden rounded-full ring-1 ring-border bg-muted grid place-items-center select-none",
      )}
      style={{ width: px, height: px }}
      aria-hidden
    >
      {signedUrl ? (
        <img
          src={signedUrl}
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <span
          className="font-semibold text-foreground/70"
          style={{ fontSize: Math.round(px * 0.36) }}
        >
          {initials}
        </span>
      )}
      {busy && (
        <span className="absolute inset-0 grid place-items-center bg-background/70">
          <Loader2 className="h-4 w-4 animate-spin text-foreground/70" />
        </span>
      )}
    </div>
  );

  if (!editable) {
    return <div className={className}>{AvatarInner}</div>;
  }

  const large = size === "xl";

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void handleFile(f);
        }}
        className={cn(
          "group relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-background transition-shadow",
          dragOver && "ring-2 ring-gold",
        )}
        aria-label="Change profile picture"
      >
        {AvatarInner}
        <span
          className={cn(
            "absolute inset-0 rounded-full grid place-items-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 bg-foreground/45 transition-opacity",
          )}
        >
          <Camera className="h-4 w-4 text-background" />
        </span>
      </button>
      {large && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInput.current?.click()}
              disabled={busy}
            >
              <Upload className="h-4 w-4" />
              Upload picture
            </Button>
            {path && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={busy}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            JPG, PNG or WebP — up to 2MB.
          </p>
        </div>
      )}
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          void handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
