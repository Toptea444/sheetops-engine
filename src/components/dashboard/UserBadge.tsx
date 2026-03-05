import { User, ChevronDown, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UserBadgeProps {
  userId: string;
  userName?: string | null;
  onSwitchUser: () => void;
}

export function UserBadge({ userId, userName, onSwitchUser }: UserBadgeProps) {
  const displayName = userName || userId;
  const initials = userId.substring(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="gap-2 border-border/60 bg-card/50 hover:bg-muted/80"
        >
          <div className="relative">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">
              {initials}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full bg-success ring-2 ring-card" />
          </div>
          <span className="hidden sm:inline max-w-[120px] truncate text-foreground">{displayName}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{displayName}</p>
            <p className="text-xs text-muted-foreground">{userId}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSwitchUser} className="gap-2 text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4" />
          Switch User
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
