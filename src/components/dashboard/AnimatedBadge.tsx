import { useState, useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedBadgeProps {
  icon: string;
  unlocked: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Telegram-style animated badge with bounce, glow, and particle effects
 */
export function AnimatedBadge({ icon, unlocked, size = 'md', className }: AnimatedBadgeProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showParticles, setShowParticles] = useState(false);

  // Trigger animation on click/tap
  const handleInteraction = () => {
    if (!unlocked) return;
    setIsAnimating(true);
    setShowParticles(true);
    setTimeout(() => setIsAnimating(false), 600);
    setTimeout(() => setShowParticles(false), 1000);
  };

  const sizeClasses = {
    sm: 'h-8 w-8 text-base',
    md: 'h-11 w-11 text-lg',
    lg: 'h-14 w-14 text-2xl',
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Glow effect for unlocked badges */}
      {unlocked && (
        <div 
          className={cn(
            'absolute inset-0 rounded-lg bg-primary/20 blur-md animate-pulse',
            sizeClasses[size]
          )} 
        />
      )}

      {/* Particle effects */}
      {showParticles && unlocked && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <span
              key={i}
              className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full bg-primary"
              style={{
                animation: `particle-burst 0.8s ease-out forwards`,
                animationDelay: `${i * 50}ms`,
                transform: `rotate(${i * 60}deg) translateY(-20px)`,
              }}
            />
          ))}
        </div>
      )}

      {/* Main badge */}
      <button
        type="button"
        onClick={handleInteraction}
        className={cn(
          'relative rounded-lg flex items-center justify-center transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary',
          sizeClasses[size],
          unlocked
            ? 'bg-primary/10 border-2 border-primary/30 shadow-sm cursor-pointer hover:scale-110 active:scale-95'
            : 'bg-muted/50 border border-border/50 grayscale opacity-50 cursor-default',
          isAnimating && 'animate-badge-bounce',
          className
        )}
      >
        <span 
          className={cn(
            'transition-transform duration-200',
            isAnimating && 'animate-badge-wiggle'
          )}
        >
          {icon}
        </span>

        {/* Shine effect on hover */}
        {unlocked && (
          <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700" />
          </div>
        )}
      </button>

      {/* Inline styles for custom animations */}
      <style>{`
        @keyframes particle-burst {
          0% {
            opacity: 1;
            transform: rotate(var(--rotation, 0deg)) translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: rotate(var(--rotation, 0deg)) translateY(-30px) scale(0);
          }
        }
        
        @keyframes badge-bounce {
          0%, 100% { transform: scale(1); }
          25% { transform: scale(1.3); }
          50% { transform: scale(0.9); }
          75% { transform: scale(1.1); }
        }
        
        @keyframes badge-wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-15deg); }
          75% { transform: rotate(15deg); }
        }
        
        .animate-badge-bounce {
          animation: badge-bounce 0.6s ease-out;
        }
        
        .animate-badge-wiggle {
          animation: badge-wiggle 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
}
