import { ChevronDown, Circle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { OnlineUser } from '@/hooks/useOnlineUsers';

interface OnlineNowDropdownProps {
  onlineUsers: OnlineUser[];
  currentUserId?: string | null;
  isLoading?: boolean;
}

export function OnlineNowDropdown({ onlineUsers, currentUserId, isLoading }: OnlineNowDropdownProps) {
  const count = onlineUsers.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 h-8 px-2 text-xs font-medium"
          disabled={isLoading}
        >
          <Circle className="h-2 w-2 fill-success text-success" />
          <span className="hidden sm:inline">{count} Online</span>
          <span className="sm:hidden">{count}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 max-h-[60vh] overflow-y-auto">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Online Now ({count})
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {count === 0 && (
          <DropdownMenuItem disabled className="text-muted-foreground text-xs">
            No one is online right now
          </DropdownMenuItem>
        )}
        {onlineUsers.map((user) => {
          const isYou = currentUserId?.toUpperCase() === user.worker_id.toUpperCase();
          const initials = user.worker_id.substring(0, 2).toUpperCase();
          return (
            <DropdownMenuItem key={user.worker_id} className="gap-2 cursor-default">
              <div className="relative">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-bold">
                  {initials}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-popover" />
              </div>
              <span className="flex-1 truncate text-sm font-medium">
                {user.worker_id}
              </span>
              {isYou && (
                <span className="text-[10px] text-muted-foreground font-medium">You</span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
