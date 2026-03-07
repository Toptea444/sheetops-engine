import { Download } from 'lucide-react';

interface DownloadAppBannerProps {
  visible: boolean;
  onOpenModal: () => void;
}

export function DownloadAppBanner({ visible, onOpenModal }: DownloadAppBannerProps) {
  if (!visible) return null;

  return (
    <button
      onClick={onOpenModal}
      className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 active:scale-[0.97] transition-all shrink-0 py-1 px-2 rounded-lg hover:bg-primary/8"
    >
      <Download className="h-3.5 w-3.5" />
      <span>Download App</span>
    </button>
  );
}
