// Generates a short, friendly performance insight for a worker's daily earnings.
// Uses Lovable AI Gateway. No auth required (public endpoint, read-only).

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DayPoint {
  date: string;
  value: number;
  isRankingDay?: boolean;
}

interface RequestBody {
  workerName?: string;
  stage?: string;
  sheetName?: string;
  cycleLabel?: string;
  totalSoFar?: number;
  dailyEarnings: DayPoint[];
  cycleEndDate?: string; // YYYY-MM-DD
}

const NORMAL_DAY_MAX = 4000;
const RANKING_DAY_MAX = 5500;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = (await req.json()) as RequestBody;
    if (!Array.isArray(body.dailyEarnings)) {
      return new Response(JSON.stringify({ error: 'dailyEarnings required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mark ranking days if not provided: ranking = last 9 days before cycleEndDate (inclusive).
    let cycleEnd: Date | null = null;
    if (body.cycleEndDate) {
      const [y, m, d] = body.cycleEndDate.split('-').map(Number);
      if (y && m && d) cycleEnd = new Date(y, m - 1, d);
    }
    const enriched = body.dailyEarnings.map((p) => {
      let isRanking = !!p.isRankingDay;
      if (!isRanking && cycleEnd && p.date) {
        const [y, m, d] = p.date.split('-').map(Number);
        if (y && m && d) {
          const dt = new Date(y, m - 1, d);
          const diffDays = Math.round((cycleEnd.getTime() - dt.getTime()) / 86400000);
          if (diffDays >= 0 && diffDays <= 8) isRanking = true;
        }
      }
      const cap = isRanking ? RANKING_DAY_MAX : NORMAL_DAY_MAX;
      return { ...p, isRankingDay: isRanking, cap };
    });

    const worked = enriched.filter((p) => (p.value ?? 0) > 0);
    const total = body.totalSoFar ?? worked.reduce((s, p) => s + (p.value || 0), 0);
    const avg = worked.length ? total / worked.length : 0;
    const best = worked.reduce((m, p) => (p.value > m.value ? p : m), { value: 0, date: '' } as any);
    const recent = enriched.slice(-5);
    const recentAvg = recent.length ? recent.reduce((s, p) => s + (p.value || 0), 0) / recent.length : 0;

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are a concise, encouraging personal earnings assistant for a field worker (data collector). 
Earning caps: normal day = ₦${NORMAL_DAY_MAX}, ranking day (last 9 days of cycle) = ₦${RANKING_DAY_MAX}.
Return ONE short banner-style insight (max 18 words). No greetings, no emoji, no markdown, no quotes.
Pick a tone: "positive" if performing well, "neutral" if average, "concern" if slipping or low.
Vary the wording each call — sometimes coach, sometimes celebrate, sometimes nudge, sometimes give a tip.
Reply ONLY as JSON: {"insight": "...", "tone": "positive|neutral|concern"}`;

    const userPrompt = `Worker: ${body.workerName ?? 'Worker'} (${body.stage ?? '-'})
Sheet: ${body.sheetName ?? '-'} | Cycle: ${body.cycleLabel ?? '-'}
Total so far: ₦${Math.round(total)}
Days worked: ${worked.length} | Avg/day worked: ₦${Math.round(avg)}
Best day: ₦${Math.round(best.value || 0)} on ${best.date || '-'}
Recent 5-day avg: ₦${Math.round(recentAvg)}
Daily series (date | ₦value | rankingDay | cap):
${enriched.map((p) => `${p.date} | ${Math.round(p.value)} | ${p.isRankingDay ? 'Y' : 'N'} | ${p.cap}`).join('\n')}`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return new Response(JSON.stringify({ error: 'AI call failed', detail: errText }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content ?? '{}';
    let parsed: { insight?: string; tone?: string } = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { insight: String(content).slice(0, 140), tone: 'neutral' };
    }

    return new Response(
      JSON.stringify({
        insight: parsed.insight || 'Keep going — every collection counts.',
        tone: ['positive', 'neutral', 'concern'].includes(parsed.tone || '') ? parsed.tone : 'neutral',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Server error', detail: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
