import { RefreshCw, Wrench } from 'lucide-react';

interface MaintenancePageProps {
  message?: string;
}

export function MaintenancePage({ message = 'The site is currently under maintenance. Please check back later.' }: MaintenancePageProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-primary/8 blur-3xl pointer-events-none" />

      <div className="max-w-md w-full text-center space-y-8 relative z-10">
        {/* Animated icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="h-24 w-24 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-lg">
              <Wrench className="h-11 w-11 text-primary animate-[spin_8s_linear_infinite]" />
            </div>
            {/* Pulsing ring */}
            <div className="absolute inset-0 rounded-2xl border-2 border-primary/20 animate-ping opacity-30" />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            We'll Be Right Back
          </h1>
          <div className="w-12 h-1 bg-primary/40 rounded-full mx-auto" />
          <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
            {message}
          </p>
        </div>

        {/* Live status bar */}
        <div className="flex items-center justify-center gap-3 py-3 px-5 rounded-xl bg-card border border-border shadow-sm max-w-xs mx-auto">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-warning"></span>
          </span>
          <span className="text-xs text-muted-foreground font-medium">Maintenance in progress</span>
        </div>

        {/* Refresh CTA */}
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all text-sm font-semibold shadow-md"
        >
          <RefreshCw className="h-4 w-4" />
          Check Again
        </button>

        <p className="text-[11px] text-muted-foreground/70">
          Thank you for your patience!
        </p>
      </div>
    </div>
  );
}
