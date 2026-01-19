import { RefreshCw, Zap } from 'lucide-react';
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
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground">Tracker</span>
        </div>
        <div className="flex items-center gap-2">
          {userId && onSwitchUser && (
            <UserBadge
              userId={userId}
              userName={userName}
              onSwitchUser={onSwitchUser}
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
