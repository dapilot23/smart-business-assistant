# @smart-business-assistant/shared

Shared types and utilities for the Smart Business Assistant monorepo.

## Overview

This package contains TypeScript type definitions and utility functions that are shared between the frontend and backend applications.

## Features

- **Type Definitions**: Comprehensive TypeScript types for all domain entities
- **Utility Functions**: Common formatting and validation utilities
- **Type Safety**: Strict TypeScript configuration for maximum type safety

## Types

### Core Types
- **Tenant**: Multi-tenant configuration and settings
- **User**: User accounts, roles, and permissions
- **Customer**: Customer and contact information
- **Appointment**: Scheduling and appointment management
- **Quote**: Quote generation and tracking
- **Invoice**: Invoice management and payment tracking
- **Job**: Job/work order tracking and management

## Utilities

### Formatting
- `formatCurrency(amount, currency, locale)`: Format numbers as currency
- `formatPhone(phone, format)`: Format phone numbers
- `formatDate(date, format, locale)`: Format dates
- `formatDateTime(date, timeFormat, locale)`: Format dates with time

### Validation
- `isValidEmail(email)`: Validate email addresses
- `isValidPhone(phone, country)`: Validate phone numbers
- `isValidPostalCode(postalCode, country)`: Validate postal/zip codes
- `isValidUrl(url)`: Validate URLs

## Usage

```typescript
import {
  User,
  UserRole,
  Customer,
  formatCurrency,
  formatDate,
  isValidEmail,
} from '@smart-business-assistant/shared';

// Use types
const user: User = {
  id: '123',
  tenantId: 'tenant-1',
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: UserRole.ADMIN,
  isActive: true,
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Use utilities
const formatted = formatCurrency(1234.56, 'USD'); // "$1,234.56"
const date = formatDate(new Date(), 'medium'); // "Jan 23, 2026"
const valid = isValidEmail('user@example.com'); // true
```

## Scripts

- `pnpm build`: Build the package
- `pnpm dev`: Watch mode for development
- `pnpm clean`: Clean build artifacts
- `pnpm typecheck`: Type check without emitting files

## License

MIT
