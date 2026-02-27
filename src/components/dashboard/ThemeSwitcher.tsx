import { Moon, Sun, Monitor, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Theme, AccentColor } from '@/hooks/useTheme';
import type { EarningsDisplayMode } from '@/hooks/useDisplayMode';

interface ThemeSwitcherProps {
  theme: Theme;
  accentColor: AccentColor;
  onThemeChange: (theme: Theme) => void;
  onAccentChange: (accent: AccentColor) => void;
  earningsDisplay?: EarningsDisplayMode;
  onEarningsDisplayChange?: (mode: EarningsDisplayMode) => void;
}

const accentOptions: { value: AccentColor; label: string; color: string }[] = [
  { value: 'blue', label: 'Navy Blue', color: 'bg-blue-600' },
  { value: 'green', label: 'Emerald', color: 'bg-emerald-600' },
  { value: 'purple', label: 'Purple', color: 'bg-purple-600' },
  { value: 'orange', label: 'Orange', color: 'bg-orange-500' },
  { value: 'rose', label: 'Rose', color: 'bg-rose-500' },
];

export function ThemeSwitcher({
  theme,
  accentColor,
  onThemeChange,
  onAccentChange,
  earningsDisplay = 'amount',
  onEarningsDisplayChange,
}: ThemeSwitcherProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Palette className="h-4 w-4" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs">Theme</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => onThemeChange('light')}
          className="gap-2"
        >
          <Sun className="h-4 w-4" />
          Light
          {theme === 'light' && <span className="ml-auto text-primary">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onThemeChange('dark')}
          className="gap-2"
        >
          <Moon className="h-4 w-4" />
          Dark
          {theme === 'dark' && <span className="ml-auto text-primary">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onThemeChange('system')}
          className="gap-2"
        >
          <Monitor className="h-4 w-4" />
          System
          {theme === 'system' && <span className="ml-auto text-primary">✓</span>}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs">Accent Color</DropdownMenuLabel>
        {accentOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onAccentChange(option.value)}
            className="gap-2"
          >
            <div className={`h-4 w-4 rounded-full ${option.color}`} />
            {option.label}
            {accentColor === option.value && (
              <span className="ml-auto text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}

        {onEarningsDisplayChange && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">Earnings Display</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => onEarningsDisplayChange('amount')}
              className="gap-2"
            >
              <div className="h-4 w-4 text-primary text-sm flex items-center justify-center">₦</div>
              Amount
              {earningsDisplay === 'amount' && (
                <span className="ml-auto text-primary">✓</span>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onEarningsDisplayChange('dots')}
              className="gap-2"
            >
              <div className="flex gap-1">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <div className="h-2 w-2 rounded-full bg-primary" />
                <div className="h-2 w-2 rounded-full bg-primary" />
              </div>
              Dots
              {earningsDisplay === 'dots' && (
                <span className="ml-auto text-primary">✓</span>
              )}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
