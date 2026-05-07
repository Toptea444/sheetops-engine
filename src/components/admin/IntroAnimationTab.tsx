import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useAdminData } from '@/hooks/useAdminData';
import { DEFAULT_INTRO_CONFIG, IntroConfig, mergeIntroConfig, IntroAnimationStyle, IntroFontFamily } from '@/lib/introConfig';
import { AdelajaIntro } from '@/components/AdelajaIntro';
import { Loader2, Save, RotateCcw, Eye, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const ANIMATION_STYLES: { value: IntroAnimationStyle; label: string }[] = [
  { value: 'letter-stagger', label: 'Letter Stagger' },
  { value: 'fade', label: 'Simple Fade' },
  { value: 'slide-up', label: 'Slide Up' },
  { value: 'scale', label: 'Scale In' },
  { value: 'typewriter', label: 'Typewriter' },
  { value: 'blur-in', label: 'Blur In' },
];

const FONTS: { value: IntroFontFamily; label: string }[] = [
  { value: 'sans', label: 'Sans (Default)' },
  { value: 'serif', label: 'Serif' },
  { value: 'mono', label: 'Monospace' },
  { value: 'display', label: 'Display (Serif Italic)' },
];

export function IntroAnimationTab({ adminSecret }: { adminSecret: string }) {
  const { adminRequest, isLoading } = useAdminData();
  const [config, setConfig] = useState<IntroConfig>(DEFAULT_INTRO_CONFIG);
  const [saving, setSaving] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await adminRequest(adminSecret, 'get_intro_config');
      if (res?.config) setConfig(mergeIntroConfig(res.config));
    })();
  }, [adminRequest, adminSecret]);

  const update = <K extends keyof IntroConfig>(key: K, value: IntroConfig[K]) => {
    setConfig((c) => ({ ...c, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await adminRequest(adminSecret, 'update_intro_config', { config });
    setSaving(false);
    if (res?.success) {
      toast.success('Intro animation updated. Users will see changes on next load.');
      // Bust local cache so this admin sees changes too
      try { localStorage.removeItem('intro_config_cache_v1'); } catch { /* ignore */ }
    } else {
      toast.error('Failed to save');
    }
  };

  const handleReset = () => {
    setConfig(DEFAULT_INTRO_CONFIG);
    toast.info('Reset to defaults — click Save to apply');
  };

  const handlePreview = () => {
    // Force a one-off preview regardless of per-day cap
    try { localStorage.removeItem('adelaja_intro_shows_v2'); } catch { /* ignore */ }
    try { localStorage.setItem('intro_config_cache_v1', JSON.stringify(config)); } catch { /* ignore */ }
    setPreviewing(true);
    setPreviewKey((k) => k + 1);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            "Built by Adelaja" Intro Animation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Enable + Frequency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm font-medium">Enabled</Label>
                <p className="text-xs text-muted-foreground">Show the intro animation</p>
              </div>
              <Switch checked={config.enabled} onCheckedChange={(v) => update('enabled', v)} />
            </div>

            <div className="rounded-lg border p-3 space-y-2">
              <Label className="text-sm font-medium">Shows per day (per user)</Label>
              <Input
                type="number"
                min={0}
                value={config.showsPerDay}
                onChange={(e) => update('showsPerDay', Math.max(0, Number(e.target.value) || 0))}
              />
              <p className="text-xs text-muted-foreground">0 = unlimited (every load)</p>
            </div>
          </div>

          {/* Text */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Text</Label>
            <Input value={config.text} onChange={(e) => update('text', e.target.value)} />
          </div>

          {/* Animation style + font */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Animation Style</Label>
              <Select value={config.animationStyle} onValueChange={(v) => update('animationStyle', v as IntroAnimationStyle)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ANIMATION_STYLES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Font Family</Label>
              <Select value={config.fontFamily} onValueChange={(v) => update('fontFamily', v as IntroFontFamily)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FONTS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Timing */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Start Delay (ms)</Label>
              <Input
                type="number"
                min={0}
                value={config.startDelayMs}
                onChange={(e) => update('startDelayMs', Math.max(0, Number(e.target.value) || 0))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Total Duration (ms)</Label>
              <Input
                type="number"
                min={400}
                value={config.totalDurationMs}
                onChange={(e) => update('totalDurationMs', Math.max(400, Number(e.target.value) || 400))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Exit Duration (ms)</Label>
              <Input
                type="number"
                min={50}
                value={config.exitDurationMs}
                onChange={(e) => update('exitDurationMs', Math.max(50, Number(e.target.value) || 50))}
              />
            </div>
          </div>

          {/* Typography sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Font Size: {config.fontSizeRem.toFixed(2)}rem</Label>
              <Slider
                min={0.75} max={6} step={0.05}
                value={[config.fontSizeRem]}
                onValueChange={([v]) => update('fontSizeRem', v)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Letter Spacing: {config.letterSpacingEm.toFixed(2)}em</Label>
              <Slider
                min={-0.05} max={0.6} step={0.01}
                value={[config.letterSpacingEm]}
                onValueChange={([v]) => update('letterSpacingEm', v)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Font Weight: {config.fontWeight}</Label>
              <Slider
                min={100} max={900} step={100}
                value={[config.fontWeight]}
                onValueChange={([v]) => update('fontWeight', v)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label className="text-sm font-medium">Uppercase Text</Label>
            <Switch checked={config.uppercase} onCheckedChange={(v) => update('uppercase', v)} />
          </div>

          {/* Colors */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Text Color (CSS)</Label>
              <Input value={config.textColor} onChange={(e) => update('textColor', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Background (CSS)</Label>
              <Input value={config.backgroundColor} onChange={(e) => update('backgroundColor', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Accent Color (CSS)</Label>
              <Input value={config.accentColor} onChange={(e) => update('accentColor', e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            Accepts any CSS color. Examples: <code>hsl(var(--foreground))</code>, <code>#ffffff</code>, <code>rgb(0,0,0)</code>.
          </p>

          {/* Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label className="text-sm font-medium">Accent Line</Label>
              <Switch checked={config.showAccentLine} onCheckedChange={(v) => update('showAccentLine', v)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label className="text-sm font-medium">Background Glow</Label>
              <Switch checked={config.showGlow} onCheckedChange={(v) => update('showGlow', v)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label className="text-sm font-medium">Tap to Dismiss</Label>
              <Switch checked={config.tapToDismiss} onCheckedChange={(v) => update('tapToDismiss', v)} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving || isLoading} className="gap-1.5">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Changes
            </Button>
            <Button variant="secondary" onClick={handlePreview} className="gap-1.5">
              <Eye className="h-3.5 w-3.5" />
              Preview
            </Button>
            <Button variant="outline" onClick={handleReset} className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" />
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      {previewing && (
        <AdelajaIntro
          key={previewKey}
          onComplete={() => setPreviewing(false)}
        />
      )}
    </div>
  );
}
