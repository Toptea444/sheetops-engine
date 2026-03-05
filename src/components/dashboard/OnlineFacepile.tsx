import { useState } from 'react';
import { Circle, Users } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { OnlineUser } from '@/hooks/useOnlineUsers';

interface OnlineFacepileProps {
  onlineUsers: OnlineUser[];
  currentUserId?: string | null;
}

export function OnlineFacepile({ onlineUsers, currentUserId }: OnlineFacepileProps) {
  const count = onlineUsers.length;
  if (count === 0) return null;

  const displayUsers = onlineUsers.slice(0, 3);
  const remaining = Math.max(0, count - 3);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-card/60 border border-border/50 hover:bg-muted/50 transition-colors cursor-pointer group">
          {/* Facepile */}
          <div className="flex -space-x-2">
            {displayUsers.map((user, i) => {
              const initials = user.worker_id.substring(0, 2).toUpperCase();
              return (
                <div
                  key={user.worker_id}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-bold border-2 border-card"
                  style={{ zIndex: 3 - i }}
                >
                  {initials}
                </div>
              );
            })}
            {remaining > 0 && (
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground text-[10px] font-bold border-2 border-card"
                style={{ zIndex: 0 }}
              >
                +{remaining}
              </div>
            )}
          </div>
          {/* Text */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
            <Circle className="h-1.5 w-1.5 fill-green-500 text-green-500" />
            <span>{count} online now</span>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 max-h-[60vh] overflow-y-auto">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Online Now ({count})
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
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
