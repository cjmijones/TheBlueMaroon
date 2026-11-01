import { isAxiosError } from "axios";

export const NFT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

type MintErrorBody = {
  detail?: unknown;
  message?: unknown;
  error?: unknown;
};

function asMessage(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (value instanceof Error) {
    return value.message || null;
  }

  return null;
}

export function validateMintImage(file?: File): string | null {
  if (!file) {
    return "Choose an image to upload.";
  }

  const contentType = (file.type || "").toLowerCase();
  if (!SUPPORTED_IMAGE_TYPES.has(contentType)) {
    return "Unsupported image type. Use PNG, JPEG, WebP, or GIF.";
  }

  if (file.size <= 0) {
    return "The selected image is empty.";
  }

  if (file.size > NFT_IMAGE_MAX_BYTES) {
    return "Image must be 10 MB or smaller.";
  }

  return null;
}

export function normalizeMintError(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as MintErrorBody | undefined;
    const detail =
      asMessage(data?.detail) ??
      asMessage(data?.message) ??
      asMessage(data?.error);

    if (detail) {
      return detail;
    }

    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error) {
    return error.message || "Mint failed unexpectedly.";
  }

  const message = asMessage(error);
  return message ?? "Mint failed unexpectedly.";
}
