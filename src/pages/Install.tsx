import { useState, useEffect } from 'react';
import { Download, CheckCircle2, MoreHorizontal, MoreVertical, Smartphone, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function StepItem({ step, title, description, icon }: { step: number; title: string; description: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50 border border-border/60">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-sm">
        {step}
      </div>
      <div className="pt-0.5">
        <p className="font-semibold text-foreground leading-snug">{title}</p>
        <div className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{description}</div>
      </div>
    </div>
  );
}

export default function InstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Decorative background glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full pointer-events-none opacity-[0.07]"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Header area */}
        <div className="text-center mb-8">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 shadow-sm mb-5">
            <Smartphone className="h-10 w-10 text-primary" />
          </div>

          {isInstalled ? (
            <>
              <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto mb-3" />
              <h1 className="text-2xl font-bold text-foreground">Already Installed</h1>
              <p className="text-muted-foreground mt-2 max-w-[280px] mx-auto leading-relaxed">
                The app is installed on your device. Open it from your home screen for the best experience.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-foreground">Install Bonus Calculator</h1>
              <p className="text-muted-foreground mt-2 max-w-[280px] mx-auto leading-relaxed">
                {isIOS
                  ? 'Add this app to your iPhone home screen for a faster, app-like experience.'
                  : 'Install this app on your phone for faster access and a better experience.'}
              </p>
            </>
          )}
        </div>

        {/* Content card */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-5">
          {isInstalled ? (
            <Button onClick={() => window.location.href = '/'} className="w-full h-12 rounded-xl font-semibold">
              Open App
            </Button>
          ) : isIOS ? (
            <>
              <div className="space-y-3">
                <StepItem
                  step={1}
                  title='Tap the "•••" icon in Safari'
                  description='In Safari, look for the three dots at the bottom right of the screen, beside the address bar.'
                />
                <StepItem
                  step={2}
                  title='Tap "Share"'
                  description='After tapping the three dots, tap the "Share" option from the menu that appears.'
                />
                <StepItem
                  step={3}
                  title='Tap "Add to Home Screen"'
                  description='Scroll down, down in the share menu and tap "Add to Home Screen".'
                />
                <StepItem
                  step={4}
                  title='Tap "Add"'
                  description='Tap "Add" at the top right. The app icon will appear on your home screen — open it from there.'
                />
              </div>
            </>
          ) : deferredPrompt ? (
            <Button onClick={handleInstall} className="w-full h-12 rounded-xl font-semibold gap-2" size="lg">
              <Download className="h-5 w-5" />
              Install App
            </Button>
          ) : (
            <div className="space-y-3">
              <StepItem
                step={1}
                title="Open in Chrome"
                description="Make sure you're using the Chrome browser, not an in-app browser"
              />
              <StepItem
                step={2}
                title="Tap the menu"
                description={
                  <span className="flex items-center gap-1.5">
                    Look for the <MoreVertical className="h-4 w-4 inline text-foreground" /> icon at the top right of Chrome
                  </span>
                }
              />
              <StepItem
                step={3}
                title='Tap "Install app" or "Add to Home screen"'
                description="The app will install on your device like a regular app"
              />
            </div>
          )}

          <Button
            variant="ghost"
            onClick={() => window.location.href = '/'}
            className="w-full text-muted-foreground hover:text-foreground rounded-xl"
          >
            Continue in browser instead
          </Button>
        </div>
      </div>
    </div>
  );
}
