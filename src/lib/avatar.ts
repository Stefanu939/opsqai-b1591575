import { useEffect, useState } from "react";
import {
  clearMyAvatarPath,
  getAvatarBlob,
  getMyAvatarPath,
  uploadMyAvatarFile,
} from "@/lib/profile.functions";

/**
 * Resolve a `profiles.avatar_url` value (a storage key inside the `avatars`
 * bucket, e.g. `{userId}/avatar-1234.jpg`) to a viewable URL. Reads through a
 * server function so it works on Cloud and Self-Hosted alike. Returns `null`
 * for missing / not-yet-resolved paths.
 */
export function useAvatarUrl(path: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    if (!path) {
      setUrl(null);
      return;
    }
    // Legacy: allow full https URLs to pass through unchanged.
    if (/^https?:\/\//i.test(path)) {
      setUrl(path);
      return;
    }

    getAvatarBlob({ data: { path } })
      .then((res) => {
        if (cancelled || !res) {
          if (!cancelled) setUrl(null);
          return;
        }
        setUrl(`data:${res.content_type};base64,${res.data_base64}`);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  return url;
}

/** Fetch initials from a full name, email, or fallback. */
export function initialsOf(input: {
  fullName?: string | null;
  email?: string | null;
}): string {
  const name = (input.fullName || "").trim();
  if (name) {
    const parts = name.split(/\s+/);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase() || first.toUpperCase() || "??";
  }
  const email = (input.email || "").trim();
  if (email) return email.slice(0, 2).toUpperCase();
  return "OP";
}

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_BYTES = 2 * 1024 * 1024; // 2MB

export interface UploadAvatarResult {
  path: string;
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/**
 * Upload an avatar for the current user through the platform storage provider
 * and update `profiles.avatar_url` with the storage key.
 */
export async function uploadMyAvatar(
  file: File,
  _userId: string,
): Promise<UploadAvatarResult> {
  if (!ACCEPTED.includes(file.type as (typeof ACCEPTED)[number])) {
    throw new Error("Please choose a JPG, PNG or WebP image.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Image is larger than 2MB.");
  }
  const data_base64 = toBase64(await file.arrayBuffer());
  const { path } = await uploadMyAvatarFile({
    data: {
      filename: file.name,
      content_type: file.type as (typeof ACCEPTED)[number],
      data_base64,
    },
  });
  return { path };
}

/** Clear the current user's avatar (removes the DB pointer; file left for history). */
export async function clearMyAvatar(_userId: string): Promise<void> {
  await clearMyAvatarPath();
}

/** Read `profiles.avatar_url` for the current user. */
export async function readAvatarPath(_userId: string): Promise<string | null> {
  const { path } = await getMyAvatarPath();
  return path;
}
