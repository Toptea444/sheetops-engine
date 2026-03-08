import { useState, useEffect } from 'react';
import { Download, CheckCircle2, Share, MoreVertical, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Detect iOS
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
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center space-y-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
            <Smartphone className="h-10 w-10 text-primary" />
          </div>

          {isInstalled ? (
            <>
              <div className="space-y-2">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
                <h1 className="text-2xl font-bold text-foreground">Already Installed!</h1>
                <p className="text-muted-foreground">
                  The app is installed on your device. Open it from your home screen.
                </p>
              </div>
              <Button onClick={() => window.location.href = '/'} className="w-full">
                Open App
              </Button>
            </>
          ) : isIOS ? (
            <>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">Install Bonus Calculator</h1>
                <p className="text-muted-foreground">
                  Install this app on your iPhone for the best experience.
                </p>
              </div>
              <div className="space-y-4 text-left">
                <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">1</div>
                  <div>
                    <p className="font-medium text-foreground">Tap the Share button</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      Look for the <Share className="h-4 w-4 inline" /> icon at the bottom of Safari
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">2</div>
                  <div>
                    <p className="font-medium text-foreground">Scroll down and tap "Add to Home Screen"</p>
                    <p className="text-sm text-muted-foreground">It will appear in the share menu options</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">3</div>
                  <div>
                    <p className="font-medium text-foreground">Tap "Add"</p>
                    <p className="text-sm text-muted-foreground">The app icon will appear on your home screen</p>
                  </div>
                </div>
              </div>
            </>
          ) : deferredPrompt ? (
            <>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">Install Bonus Calculator</h1>
                <p className="text-muted-foreground">
                  Install this app for faster access, offline support, and a better experience.
                </p>
              </div>
              <Button onClick={handleInstall} className="w-full gap-2" size="lg">
                <Download className="h-5 w-5" />
                Install App
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">Install Bonus Calculator</h1>
                <p className="text-muted-foreground">
                  Install this app on your Android phone for the best experience.
                </p>
              </div>
              <div className="space-y-4 text-left">
                <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">1</div>
                  <div>
                    <p className="font-medium text-foreground">Open in Chrome browser</p>
                    <p className="text-sm text-muted-foreground">Make sure you're using Chrome, not an in-app browser</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">2</div>
                  <div>
                    <p className="font-medium text-foreground">Tap the menu</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      Look for <MoreVertical className="h-4 w-4 inline" /> at the top right of Chrome
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">3</div>
                  <div>
                    <p className="font-medium text-foreground">Tap "Add to Home screen" or "Install app"</p>
                    <p className="text-sm text-muted-foreground">The app will install like a real app</p>
                  </div>
                </div>
              </div>
            </>
          )}

          <Button variant="ghost" onClick={() => window.location.href = '/'} className="w-full text-muted-foreground">
            Continue in browser instead
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
