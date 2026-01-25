'use client';

import { useTheme } from '@/lib/theme-context';
import { colorThemes, ColorThemeName } from '@/lib/themes';
import { Icon } from '@/app/components/Icon';

export function ColorThemeSwitcher() {
  const { colorTheme, setColorTheme, isLoaded } = useTheme();

  if (!isLoaded) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-xl bg-secondary animate-pulse"
          />
        ))}
      </div>
    );
  }

  // Group themes by category for visual organization
  const themeGroups = {
    warm: ['default', 'amber', 'coral', 'bronze'] as ColorThemeName[],
    cool: ['ocean', 'sapphire', 'teal', 'slate'] as ColorThemeName[],
    nature: ['forest', 'emerald'] as ColorThemeName[],
    vibrant: ['sunset', 'rose', 'midnight', 'lavender', 'ruby'] as ColorThemeName[],
  };

  return (
    <div className="space-y-6">
      {/* Warm Tones */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Warm Tones</h4>
        <div className="grid grid-cols-4 sm:grid-cols-4 gap-3">
          {themeGroups.warm.map((themeName) => (
            <ColorButton
              key={themeName}
              themeName={themeName}
              isSelected={colorTheme === themeName}
              onClick={() => setColorTheme(themeName)}
            />
          ))}
        </div>
      </div>

      {/* Cool Tones */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Cool Tones</h4>
        <div className="grid grid-cols-4 sm:grid-cols-4 gap-3">
          {themeGroups.cool.map((themeName) => (
            <ColorButton
              key={themeName}
              themeName={themeName}
              isSelected={colorTheme === themeName}
              onClick={() => setColorTheme(themeName)}
            />
          ))}
        </div>
      </div>

      {/* Nature */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Nature</h4>
        <div className="grid grid-cols-4 sm:grid-cols-4 gap-3">
          {themeGroups.nature.map((themeName) => (
            <ColorButton
              key={themeName}
              themeName={themeName}
              isSelected={colorTheme === themeName}
              onClick={() => setColorTheme(themeName)}
            />
          ))}
        </div>
      </div>

      {/* Vibrant */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-3">Vibrant</h4>
        <div className="grid grid-cols-5 sm:grid-cols-5 gap-3">
          {themeGroups.vibrant.map((themeName) => (
            <ColorButton
              key={themeName}
              themeName={themeName}
              isSelected={colorTheme === themeName}
              onClick={() => setColorTheme(themeName)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ColorButton({
  themeName,
  isSelected,
  onClick,
}: {
  themeName: ColorThemeName;
  isSelected: boolean;
  onClick: () => void;
}) {
  const theme = colorThemes[themeName];

  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center aspect-square rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
        isSelected
          ? 'border-[var(--primary)] shadow-lg ring-2 ring-[var(--primary)]/20'
          : 'border-border hover:border-border-subtle'
      }`}
      title={theme.label}
    >
      {/* Color circle */}
      <div
        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full shadow-lg ring-2 ring-white/10"
        style={{ backgroundColor: theme.preview }}
      />

      {/* Label */}
      <span className="mt-2 text-xs font-medium text-foreground truncate max-w-full px-1">
        {theme.label}
      </span>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-1.5 right-1.5">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center"
            style={{ backgroundColor: theme.preview }}
          >
            <Icon name="check" size={12} className="text-white" />
          </div>
        </div>
      )}
    </button>
  );
}
