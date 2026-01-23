import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NotificationToggleProps {
  isSupported: boolean;
  isEnabled: boolean;
  permission: NotificationPermission;
  onEnable: () => void;
  onDisable: () => void;
}

export function NotificationToggle({
  isSupported,
  isEnabled,
  permission,
  onEnable,
  onDisable,
}: NotificationToggleProps) {
  if (!isSupported) return null;

  const getTooltipText = () => {
    if (!isEnabled) {
      if (permission === 'denied') {
        return 'Notifications blocked. Enable in browser settings.';
      }
      return 'Enable notifications for data updates';
    }
    return 'Notifications enabled';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${isEnabled ? 'text-primary' : ''}`}
            onClick={isEnabled ? onDisable : onEnable}
            disabled={permission === 'denied'}
          >
            {isEnabled ? (
              <Bell className="h-4 w-4" />
            ) : (
              <BellOff className="h-4 w-4" />
            )}
            <span className="sr-only">Toggle notifications</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
