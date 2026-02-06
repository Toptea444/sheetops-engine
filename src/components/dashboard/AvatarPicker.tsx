import { useState, useEffect } from 'react';
import { User, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface AvatarPickerProps {
  userId: string | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onAvatarChange?: (avatar: string) => void;
}

const AVATAR_OPTIONS = [
  // Faces
  '😀', '😎', '🤩', '😊', '🥳', '😇', '🤓', '🧐',
  // Animals
  '🦁', '🐯', '🦊', '🐺', '🦄', '🐲', '🦅', '🦋',
  // Objects
  '🚀', '⭐', '💎', '🔥', '💫', '🌟', '👑', '🏆',
  // Nature
  '🌸', '🌺', '🌻', '🍀', '🌈', '☀️', '🌙', '⚡',
];

const COLOR_OPTIONS = [
  { name: 'Default', class: 'bg-primary text-primary-foreground' },
  { name: 'Blue', class: 'bg-blue-500 text-white' },
  { name: 'Green', class: 'bg-green-500 text-white' },
  { name: 'Purple', class: 'bg-purple-500 text-white' },
  { name: 'Orange', class: 'bg-orange-500 text-white' },
  { name: 'Pink', class: 'bg-pink-500 text-white' },
  { name: 'Amber', class: 'bg-amber-500 text-white' },
  { name: 'Teal', class: 'bg-teal-500 text-white' },
];

function getStorageKey(userId: string): string {
  return `avatar-${userId}`;
}

export interface UserAvatar {
  emoji: string;
  colorClass: string;
}

export function getDefaultAvatar(userId: string): UserAvatar {
  return {
    emoji: '',
    colorClass: 'bg-primary text-primary-foreground',
  };
}

export function loadUserAvatar(userId: string | null): UserAvatar | null {
  if (!userId) return null;
  const saved = localStorage.getItem(getStorageKey(userId));
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }
  return null;
}

export function AvatarPicker({ userId, open: controlledOpen, onOpenChange, onAvatarChange }: AvatarPickerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (!isControlled) setInternalOpen(v);
    onOpenChange?.(v);
  };
  const [selectedEmoji, setSelectedEmoji] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);

  // Load saved avatar on mount
  useEffect(() => {
    if (!userId) return;
    const saved = loadUserAvatar(userId);
    if (saved) {
      setSelectedEmoji(saved.emoji);
      const color = COLOR_OPTIONS.find(c => c.class === saved.colorClass);
      if (color) setSelectedColor(color);
    }
  }, [userId]);

  const handleSave = () => {
    if (!userId) return;
    const avatar: UserAvatar = {
      emoji: selectedEmoji,
      colorClass: selectedColor.class,
    };
    localStorage.setItem(getStorageKey(userId), JSON.stringify(avatar));
    onAvatarChange?.(selectedEmoji || userId.substring(0, 2).toUpperCase());
    setOpen(false);
  };

  const displayInitials = userId?.substring(0, 2).toUpperCase() || 'U';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={cn(
          'relative h-10 w-10 rounded-full flex items-center justify-center font-medium',
          'transition-all duration-200 hover:scale-105 hover:ring-2 hover:ring-primary/50',
          'focus:outline-none focus:ring-2 focus:ring-primary',
          selectedColor.class
        )}
        title="Customize your avatar"
      >
        {selectedEmoji || displayInitials}
        <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-background border-2 border-background flex items-center justify-center">
          <Sparkles className="h-2.5 w-2.5 text-primary" />
        </div>
      </button>

      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customize Your Avatar
          </DialogTitle>
          <DialogDescription>
            Choose an emoji and color to represent yourself on the leaderboard
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Preview */}
          <div className="flex justify-center">
            <div
              className={cn(
                'h-20 w-20 rounded-full flex items-center justify-center text-3xl font-bold',
                'ring-4 ring-offset-2 ring-offset-background ring-primary/30',
                'transition-all duration-300',
                selectedColor.class
              )}
            >
              {selectedEmoji || displayInitials}
            </div>
          </div>

          {/* Emoji selection */}
          <div>
            <p className="text-sm font-medium mb-3">Pick an emoji (or leave blank for initials)</p>
            <div className="grid grid-cols-8 gap-2">
              {/* Clear option */}
              <button
                type="button"
                onClick={() => setSelectedEmoji('')}
                className={cn(
                  'h-10 w-10 rounded-lg flex items-center justify-center text-lg',
                  'border-2 transition-all duration-200 hover:scale-105',
                  !selectedEmoji
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <span className="text-xs text-muted-foreground">AB</span>
              </button>
              {AVATAR_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedEmoji(emoji)}
                  className={cn(
                    'h-10 w-10 rounded-lg flex items-center justify-center text-xl',
                    'border-2 transition-all duration-200 hover:scale-110',
                    selectedEmoji === emoji
                      ? 'border-primary bg-primary/10 scale-105'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Color selection */}
          <div>
            <p className="text-sm font-medium mb-3">Choose a background color</p>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    'h-10 w-10 rounded-full flex items-center justify-center',
                    'transition-all duration-200 hover:scale-110',
                    'ring-2 ring-offset-2 ring-offset-background',
                    color.class,
                    selectedColor.name === color.name
                      ? 'ring-primary scale-105'
                      : 'ring-transparent hover:ring-primary/30'
                  )}
                  title={color.name}
                >
                  {selectedColor.name === color.name && (
                    <Check className="h-5 w-5" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Avatar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
