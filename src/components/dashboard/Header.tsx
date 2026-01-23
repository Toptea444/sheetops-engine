import { RefreshCw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserBadge } from './UserBadge';
import { ThemeSwitcher } from './ThemeSwitcher';
import { NotificationToggle } from './NotificationToggle';
import type { Theme, AccentColor } from '@/hooks/useTheme';

interface HeaderProps {
  onRefresh: () => void;
  isLoading: boolean;
  userId?: string | null;
  userName?: string | null;
  onSwitchUser?: () => void;
  // Theme
  theme?: Theme;
  accentColor?: AccentColor;
  onThemeChange?: (theme: Theme) => void;
  onAccentChange?: (accent: AccentColor) => void;
  // Notifications
  notificationsSupported?: boolean;
  notificationsEnabled?: boolean;
  notificationPermission?: NotificationPermission;
  onEnableNotifications?: () => void;
  onDisableNotifications?: () => void;
}

export function Header({
  onRefresh,
  isLoading,
  userId,
  userName,
  onSwitchUser,
  theme,
  accentColor,
  onThemeChange,
  onAccentChange,
  notificationsSupported,
  notificationsEnabled,
  notificationPermission,
  onEnableNotifications,
  onDisableNotifications,
}: HeaderProps) {
  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground">Bonus Tracker</span>
        </div>
        <div className="flex items-center gap-1">
          {userId && onSwitchUser && (
            <UserBadge
              userId={userId}
              userName={userName}
              onSwitchUser={onSwitchUser}
            />
          )}
          
          {/* Notifications */}
          {notificationsSupported !== undefined && onEnableNotifications && onDisableNotifications && (
            <NotificationToggle
              isSupported={notificationsSupported}
              isEnabled={notificationsEnabled || false}
              permission={notificationPermission || 'default'}
              onEnable={onEnableNotifications}
              onDisable={onDisableNotifications}
            />
          )}

          {/* Theme Switcher */}
          {theme && accentColor && onThemeChange && onAccentChange && (
            <ThemeSwitcher
              theme={theme}
              accentColor={accentColor}
              onThemeChange={onThemeChange}
              onAccentChange={onAccentChange}
            />
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
    </header>
  );
}
