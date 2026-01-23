/**
 * Validation utilities
 */

/**
 * Validate an email address
 * @param email - The email to validate
 * @returns True if email is valid
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // RFC 5322 compliant email regex (simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Basic validation
  if (!emailRegex.test(email)) {
    return false;
  }

  // Additional checks
  const [localPart, domain] = email.split('@');

  // Check length constraints
  if (localPart.length > 64 || domain.length > 255) {
    return false;
  }

  // Check for consecutive dots
  if (email.includes('..')) {
    return false;
  }

  return true;
}

/**
 * Validate a phone number
 * @param phone - The phone number to validate
 * @param country - The country code (default: 'US')
 * @returns True if phone number is valid
 */
export function isValidPhone(phone: string, country: 'US' | 'international' = 'US'): boolean {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  if (country === 'US') {
    // US phone numbers: 10 digits or 11 digits starting with 1
    return cleaned.length === 10 || (cleaned.length === 11 && cleaned[0] === '1');
  }

  // International: at least 7 digits, max 15 digits
  return cleaned.length >= 7 && cleaned.length <= 15;
}

/**
 * Validate a postal/zip code
 * @param postalCode - The postal code to validate
 * @param country - The country code (default: 'US')
 * @returns True if postal code is valid
 */
export function isValidPostalCode(postalCode: string, country: 'US' | 'CA' | 'UK' = 'US'): boolean {
  if (!postalCode || typeof postalCode !== 'string') {
    return false;
  }

  const patterns = {
    US: /^\d{5}(-\d{4})?$/, // 12345 or 12345-6789
    CA: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/, // A1A 1A1 or A1A1A1
    UK: /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i, // SW1A 1AA
  };

  const pattern = patterns[country];
  return pattern.test(postalCode.trim());
}

/**
 * Validate a URL
 * @param url - The URL to validate
 * @returns True if URL is valid
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}
