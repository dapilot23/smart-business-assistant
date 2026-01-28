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
 */
export function sanitizeMessage(input: string): string {
  if (!input || typeof input !== 'string') return '';

  return input
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters except newline, carriage return, tab
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Trim whitespace
    .trim()
    // Limit length
    .slice(0, MAX_MESSAGE_LENGTH);
}
