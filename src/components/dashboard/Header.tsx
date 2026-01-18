import { TrendingUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserBadge } from './UserBadge';

interface HeaderProps {
  onRefresh: () => void;
  isLoading: boolean;
  userId?: string | null;
  userName?: string | null;
  onSwitchUser?: () => void;
}

export function Header({ onRefresh, isLoading, userId, userName, onSwitchUser }: HeaderProps) {
  return (
    <header className="corporate-gradient text-primary-foreground">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white/10 p-2">
              <TrendingUp className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Performance Tracker</h1>
              <p className="text-sm text-white/80">
                Track your daily bonuses & achievements
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {userId && onSwitchUser && (
              <UserBadge
                userId={userId}
                userName={userName}
                onSwitchUser={onSwitchUser}
              />
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
