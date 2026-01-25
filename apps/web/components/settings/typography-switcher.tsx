'use client';

import { useTheme } from '@/lib/theme-context';
import { typographies, TypographyName } from '@/lib/themes';
import { Icon } from '@/app/components/Icon';

export function TypographySwitcher() {
  const { typography, setTypography, isLoaded } = useTheme();

  if (!isLoaded) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-xl bg-secondary animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Object.values(typographies).map((typo) => {
        const isSelected = typography === typo.name;

        return (
          <button
            key={typo.name}
            onClick={() => setTypography(typo.name as TypographyName)}
            className={`relative flex flex-col items-start p-4 rounded-xl border-2 transition-all duration-200 text-left hover:scale-[1.01] ${
              isSelected
                ? 'border-[var(--primary)] bg-[var(--primary)]/5 shadow-md'
                : 'border-border bg-card hover:border-border hover:bg-card-elevated'
            }`}
          >
            {/* Typography name and description */}
            <div className="flex items-center gap-2 mb-2">
              <span className="font-primary text-base font-semibold text-foreground">
                {typo.label}
              </span>
              {isSelected && (
                <Icon
                  name="check"
                  size={16}
                  className="text-[var(--primary)]"
                />
              )}
            </div>

            <span className="font-secondary text-sm text-muted-foreground mb-3">
              {typo.description}
            </span>

            {/* Font preview */}
            <div className="flex flex-col gap-2 w-full pt-3 border-t border-border-subtle">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-16">Headings:</span>
                <span
                  className="text-sm text-foreground font-semibold"
                  style={{ fontFamily: typo.fonts['--font-primary-family'] }}
                >
                  {typo.preview.primary}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-16">Body:</span>
                <span
                  className="text-sm text-foreground"
                  style={{ fontFamily: typo.fonts['--font-secondary-family'] }}
                >
                  {typo.preview.secondary}
                </span>
              </div>
            </div>

            {/* Preview text sample */}
            <div className="mt-3 pt-3 border-t border-border-subtle w-full">
              <p
                className="text-xs text-muted-foreground leading-relaxed"
                style={{ fontFamily: typo.fonts['--font-secondary-family'] }}
              >
                The quick brown fox jumps over the lazy dog.
              </p>
            </div>

            {/* Selection indicator */}
            {isSelected && (
              <div className="absolute top-3 right-3">
                <div className="w-4 h-4 rounded-full bg-[var(--primary)] flex items-center justify-center">
                  <Icon name="check" size={10} className="text-white" />
                </div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
