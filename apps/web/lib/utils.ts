import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const MAX_MESSAGE_LENGTH = 10000;

/**
 * Sanitizes user input for chat messages.
 * - Trims whitespace
 * - Limits length to prevent abuse
 * - Removes null bytes and control characters (except newlines/tabs)
 * - Removes Unicode control characters and format characters
 */
export function sanitizeMessage(input: string): string {
  if (!input || typeof input !== 'string') return '';

  return input
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove ASCII control characters except newline (\n), carriage return (\r), tab (\t)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Remove Unicode control characters (C0, C1, and other control categories)
    // \u0080-\u009F: C1 control characters
    // \u200B-\u200F: Zero-width and directional characters
    // \u2028-\u2029: Line/paragraph separators
    // \u202A-\u202E: Directional formatting (including RTL override)
    // \u2060-\u206F: Word joiner, invisible operators
    // \uFEFF: BOM/ZWNBSP
    // \uFFF0-\uFFFF: Specials
    .replace(/[\u0080-\u009F\u200B-\u200F\u2028-\u2029\u202A-\u202E\u2060-\u206F\uFEFF\uFFF0-\uFFFF]/g, '')
    // Normalize Unicode to NFC form to prevent homograph attacks
    .normalize('NFC')
    // Trim whitespace
    .trim()
    // Limit length
    .slice(0, MAX_MESSAGE_LENGTH);
}

/**
 * Creates a simple hash of a string for use as a stable key.
 * Not cryptographically secure, but good enough for localStorage keys.
 */
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}
