// Shared limits for profile-photo upload (client pre-check + server action).
// Must stay in sync with the "avatars" bucket in migration 0041.

export const AVATAR_BUCKET = "avatars";
/** Max size of the uploaded (already resized) file — bucket limit is 2 MB. */
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
/** Max size of the original file the user picks (it is resized in the browser first). */
export const AVATAR_MAX_SOURCE_BYTES = 10 * 1024 * 1024;
/** Output edge in px (square, center-cropped). */
export const AVATAR_SIZE = 512;
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AvatarType = (typeof AVATAR_TYPES)[number];

export const AVATAR_EXT: Record<AvatarType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Detects the real image type from the first bytes (don't trust the browser-declared type). */
export function sniffImageType(bytes: Uint8Array): AvatarType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) return "image/png";
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && // RIFF
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50   // WEBP
  ) return "image/webp";
  return null;
}
