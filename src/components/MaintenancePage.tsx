import { AlertTriangle, RefreshCw } from 'lucide-react';

interface MaintenancePageProps {
  message?: string;
}

export function MaintenancePage({ message = 'The site is currently under maintenance. Please check back later.' }: MaintenancePageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full bg-yellow-100 dark:bg-yellow-950/30 flex items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-yellow-600 dark:text-yellow-500" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Under Maintenance</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {message}
          </p>
        </div>

        {/* Status indicator */}
        <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-muted/50">
          <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse"></div>
          <span className="text-xs text-muted-foreground">Checking status...</span>
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>We'll be back online shortly.</p>
          <p>Thank you for your patience!</p>
        </div>

        {/* Refresh button */}
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
      </div>
    </div>
  );
}
