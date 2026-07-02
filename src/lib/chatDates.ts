// WhatsApp-style date grouping and label formatting for chat threads.

export function startOfDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

export function dayLabel(date: Date): string {
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diffDays = Math.round((today - target) / 86_400_000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'long' });
  }
  // Older: full readable date
  const now = new Date();
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' });
  }
  return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Returns true if `curr` and `prev` are on different calendar days. */
export function isNewDay(curr: string | Date, prev: string | Date | null): boolean {
  if (!prev) return true;
  return startOfDay(new Date(curr)) !== startOfDay(new Date(prev));
}
