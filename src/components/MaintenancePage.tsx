import { RefreshCw, Zap } from 'lucide-react';

interface MaintenancePageProps {
  message?: string;
}

export function MaintenancePage({ message = 'The site is currently under maintenance. Please check back later.' }: MaintenancePageProps) {
  return (
    <div className="min-h-screen bg-maintenance-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/30 rounded-full mix-blend-screen filter blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full mix-blend-screen filter blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="max-w-2xl w-full relative z-10">
        {/* Main content card */}
        <div className="text-center space-y-10">
          {/* Icon section with animation */}
          <div className="flex justify-center">
            <div className="relative">
              {/* Animated background circle */}
              <div className="absolute inset-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-accent/10 rounded-full blur-2xl animate-[pulse_3s_ease-in-out_infinite]" />
              
              {/* Icon container */}
              <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/30 flex items-center justify-center">
                <Zap className="h-14 w-14 text-primary animate-[spin_12s_linear_infinite]" strokeWidth={1.5} />
              </div>
              
              {/* Orbiting dots */}
              <div className="absolute inset-0 rounded-full border border-primary/10" style={{ animation: 'rotate 8s linear infinite' }} />
            </div>
          </div>

          {/* Headline and description */}
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold text-foreground tracking-tight">
              We're Upgrading
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              {message}
            </p>
          </div>

          {/* Status info with timeline */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-6">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-warning"></span>
              </span>
              <span className="text-sm text-muted-foreground font-medium">Maintenance in progress</span>
            </div>
            <div className="hidden sm:block w-px h-6 bg-border/50" />
            <p className="text-sm text-muted-foreground">
              Estimated time: <span className="font-semibold text-foreground">30-60 minutes</span>
            </p>
          </div>

          {/* CTA Button */}
          <div className="pt-4">
            <button
              onClick={() => window.location.reload()}
              className="group inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all font-semibold shadow-lg hover:shadow-xl"
            >
              <RefreshCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
              Try Again
            </button>
          </div>

          {/* Footer message */}
          <p className="text-xs text-muted-foreground/60 pt-4">
            Thanks for your patience as we improve your experience
          </p>
        </div>
      </div>

      <style>{`
        @keyframes rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
