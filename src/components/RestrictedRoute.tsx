import type { ReactNode } from 'react';
import { useSiteRestriction } from '@/hooks/useSiteRestriction';
import { MaintenancePage } from '@/components/MaintenancePage';
import { Skeleton } from '@/components/ui/skeleton';

interface RestrictedRouteProps {
  children: ReactNode;
}

export function RestrictedRoute({ children }: RestrictedRouteProps) {
  const { isRestricted, message, isLoading } = useSiteRestriction();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4">
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (isRestricted) {
    return <MaintenancePage message={message} />;
  }

  return <>{children}</>;
}
