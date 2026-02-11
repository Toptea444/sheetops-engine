import { Archive, Wifi } from 'lucide-react';

interface CacheIndicatorProps {
  isFromCache: boolean;
}

export function CacheIndicator({ isFromCache }: CacheIndicatorProps) {
  if (!isFromCache) return null;

  return (
    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border">
      <Archive className="h-3 w-3" />
      <span>Archived data</span>
    </div>
  );
}
