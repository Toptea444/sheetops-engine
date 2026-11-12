import { useState } from 'react';
import { CalendarDays, LogOut, MoreHorizontal, RefreshCw, Settings, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { UserBadge } from './UserBadge';
import { LogoutDialog } from './LogoutButton';
import { ThemeSwitcher } from './ThemeSwitcher';
import { NotificationToggle } from './NotificationToggle';
import type { Theme, AccentColor } from '@/hooks/useTheme';

interface HeaderProps {
  onRefresh: () => void;
  isLoading: boolean;
  compact?: boolean;
  onOpenSheetSettings?: () => void;
  onOpenCycleSummary?: () => void;
  onLogout?: () => void | Promise<void>;
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
  compact = false,
  onOpenSheetSettings,
  onOpenCycleSummary,
  onLogout,
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
  const [controlsOpen, setControlsOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  // Show user ID badge only if onSwitchUser is available (dropdown mode)
  // Otherwise show static display of user ID
  const showUserBadgeDropdown = userId && onSwitchUser;
  const showUserBadgeStatic = userId && !onSwitchUser;

  if (compact) {
    return (
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <span className="text-sm font-semibold tracking-tight text-foreground">Bonus Tracker</span>
          <Popover open={controlsOpen} onOpenChange={setControlsOpen}>
            <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-muted/60" aria-label="Open dashboard controls"><MoreHorizontal className="h-5 w-5" /></Button></PopoverTrigger>
            <PopoverContent align="end" className="w-56 space-y-2 p-3">
              {showUserBadgeStatic && <p className="break-all px-2 py-1 text-xs text-muted-foreground">Signed in as <span className="font-semibold text-foreground">{userId}</span></p>}
              {showUserBadgeDropdown && <UserBadge userId={userId} userName={userName} onSwitchUser={onSwitchUser} />}
              {theme && accentColor && onThemeChange && onAccentChange && <div className="flex items-center justify-between px-2 text-sm"><span>Appearance</span><ThemeSwitcher theme={theme} accentColor={accentColor} onThemeChange={onThemeChange} onAccentChange={onAccentChange} /></div>}
              {notificationsSupported && onEnableNotifications && onDisableNotifications && <div className="flex items-center justify-between px-2 text-sm"><span>Notifications</span><NotificationToggle isSupported={notificationsSupported} isEnabled={notificationsEnabled || false} permission={notificationPermission} onEnable={onEnableNotifications} onDisable={onDisableNotifications} /></div>}
              {onOpenSheetSettings && <Button variant="ghost" size="sm" onClick={() => { setControlsOpen(false); onOpenSheetSettings(); }} className="w-full justify-start gap-2"><Settings className="h-4 w-4" />Earnings settings</Button>}
              {onOpenCycleSummary && <Button variant="ghost" size="sm" onClick={() => { setControlsOpen(false); onOpenCycleSummary(); }} className="w-full justify-start gap-2"><CalendarDays className="h-4 w-4" />Last cycle summary</Button>}
              <Button variant="ghost" size="sm" onClick={() => { setControlsOpen(false); onRefresh(); }} disabled={isLoading} className="w-full justify-start gap-2"><RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />Refresh data</Button>
              {onLogout && <Button variant="ghost" size="sm" onClick={() => { setControlsOpen(false); setLogoutOpen(true); }} className="w-full justify-start gap-2 text-destructive hover:text-destructive"><LogOut className="h-4 w-4" />Log out</Button>}
            </PopoverContent>
          </Popover>
        </div>
        {onLogout && <LogoutDialog open={logoutOpen} onOpenChange={setLogoutOpen} onLogout={onLogout} />}
      </header>
    );
  }

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
          {/* User ID - always visible when logged in */}
          {showUserBadgeStatic && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-bold">
                {userId.substring(0, 2).toUpperCase()}
              </div>
              <span className="text-xs text-muted-foreground font-medium">{userId}</span>
            </div>
          )}
          {showUserBadgeDropdown && (
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
