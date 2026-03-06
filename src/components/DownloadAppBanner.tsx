import { Download } from 'lucide-react';
import { APP_BANNER_CLICKED_AT_KEY } from '@/components/DownloadAppModal';
import { toast } from 'sonner';

interface DownloadAppBannerProps {
  visible: boolean;
  onHide: () => void;
}

export function DownloadAppBanner({ visible, onHide }: DownloadAppBannerProps) {
  if (!visible) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = '/bonus-calculator.apk';
    link.download = 'bonus-calculator.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Record when the banner was clicked so it hides for 1 week (dismissed users only)
    localStorage.setItem(APP_BANNER_CLICKED_AT_KEY, String(Date.now()));
    onHide();
  };

  return (
    <button
      onClick={handleDownload}
      className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 active:scale-[0.97] transition-all shrink-0 py-1 px-2 rounded-lg hover:bg-primary/8"
    >
      <Download className="h-3.5 w-3.5" />
      <span>Download App</span>
    </button>
  );
}
