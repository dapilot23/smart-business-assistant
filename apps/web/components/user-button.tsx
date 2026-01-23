"use client";

import { UserButton as ClerkUserButton } from "@clerk/nextjs";

/**
 * User button component displaying authenticated user info with dropdown menu
 * Features:
 * - User avatar and name
 * - Account management link
 * - Sign out functionality
 * - Responsive design
 *
 * Usage:
 * <UserButton />
 */
export function UserButton() {
  return (
    <ClerkUserButton
      appearance={{
        elements: {
          avatarBox: "w-9 h-9",
          userButtonPopoverCard: "shadow-lg",
        },
      }}
      afterSignOutUrl="/login"
      showName={false}
    />
  );
}
