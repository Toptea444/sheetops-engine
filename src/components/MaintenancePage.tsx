import { RefreshCw, Wrench } from 'lucide-react';

interface MaintenancePageProps {
  message?: string;
}

export function MaintenancePage({ message = 'The site is currently under maintenance. Please check back later.' }: MaintenancePageProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-lg bg-secondary flex items-center justify-center">
            <Wrench className="h-10 w-10 text-primary animate-[spin_8s_linear_infinite]" />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-foreground">
            We're Back Soon
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            {message}
          </p>
        </div>

        {/* Status */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-warning"></span>
          </span>
          <span>Maintenance in progress</span>
        </div>

        {/* Button */}
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all text-sm font-semibold"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>

        <p className="text-xs text-muted-foreground/70 pt-2">
          Thank you for your patience
        </p>
      </div>
    </div>
  );
}
