import { Decimal } from '@prisma/client/runtime/library';

/**
 * Converts a Prisma Decimal (or number/null) to a plain JavaScript number.
 * Use this at service boundaries where Decimal fields are used in arithmetic
 * or passed to interfaces expecting `number`.
 */
export function toNum(value: Decimal | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  return value.toNumber();
}
