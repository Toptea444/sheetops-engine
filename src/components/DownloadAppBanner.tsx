import { Download } from 'lucide-react';

const APP_DOWNLOADED_KEY = 'performanceTracker_appDownloaded';

interface DownloadAppBannerProps {
  visible: boolean;
}

export function DownloadAppBanner({ visible }: DownloadAppBannerProps) {
  if (!visible) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = '/bonus-calculator.apk';
    link.download = 'bonus-calculator.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    localStorage.setItem(APP_DOWNLOADED_KEY, 'true');
  };

  return (
    <div className="w-full bg-primary/8 border-b border-primary/15">
      <div className="container mx-auto px-4 h-9 flex items-center justify-end">
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 active:scale-[0.97] transition-all"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Download App</span>
        </button>
      </div>
    </div>
  );
}
