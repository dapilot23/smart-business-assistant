# Smart Business Assistant - Web Frontend

Next.js 14 frontend application with App Router, TypeScript, and PWA support.

## Tech Stack

- **Next.js 14** - App Router with Server Components
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Accessible component library
- **PWA** - Progressive Web App support via next-pwa
- **Playwright** - E2E testing

## Getting Started

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Run production server
pnpm start

# Run linting
pnpm lint

# Run E2E tests
pnpm test:e2e
```

## Project Structure

```
apps/web/
├── app/
│   ├── (auth)/          # Authentication routes (login, signup)
│   ├── (dashboard)/     # Protected dashboard routes
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Landing page
│   └── globals.css      # Global styles with CSS variables
├── components/
│   └── ui/              # shadcn/ui components
├── lib/
│   └── utils.ts         # Utility functions (cn helper)
├── public/              # Static assets
├── tests/
│   └── e2e/             # Playwright E2E tests
└── playwright.config.ts # Playwright configuration
```

## Adding shadcn/ui Components

```bash
# Install a component
npx shadcn@latest add button

# Install multiple components
npx shadcn@latest add button card dialog
```

## Development Guidelines

- **Max 50 lines per function** - Break down complex logic
- **Max 200 lines per file** - Create focused, modular files
- **Test-first development** - Write tests before implementation
- **Mobile-first responsive design** - Start with mobile, scale up
- **Accessibility** - Use semantic HTML and ARIA attributes

## PWA Features

- Offline support
- Install to home screen
- Service worker caching
- Disabled in development mode

## Testing

E2E tests run against a local development server automatically.

```bash
# Run all tests
pnpm test:e2e

# Run specific test file
pnpm test:e2e tests/e2e/example.spec.ts

# Run tests in UI mode
npx playwright test --ui

# Generate test report
npx playwright show-report
```

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Performance

- Lazy loading with Next.js dynamic imports
- Image optimization with next/image
- Code splitting via App Router
- PWA caching strategies
