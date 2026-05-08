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

    const todayValue = enriched.length ? enriched[enriched.length - 1]?.value || 0 : 0;
    const todayCap = enriched.length ? enriched[enriched.length - 1]?.cap || NORMAL_DAY_MAX : NORMAL_DAY_MAX;
    const nonce = Math.random().toString(36).slice(2, 10);

    const systemPrompt = `You are a friendly personal earnings assistant for a Nigerian field data collector.
Speak in plain, casual Nigerian English — warm, conversational, like a supportive colleague. Keep it natural.
You may use phrases like "well done o", "no wahala", "keep am up", "abeg push small", "you dey try", "shey you go fit", "oya now", "make we go", "you sabi", "small small", "no dull yourself" — but ONLY when they fit naturally. Do NOT force pidgin. Mix clean English and light pidgin freely.
NEVER use stiff corporate English like "keep up the great work", "every collection counts", "stay consistent", "maintain momentum". Sound like a human, not a robot.

Earning caps: normal day = ₦${NORMAL_DAY_MAX}, ranking day (last 9 days of cycle) = ₦${RANKING_DAY_MAX}.
Base your insight on BOTH today's earning AND the cumulative performance so far in this cycle.

Return ONE short banner insight (max 20 words). No greetings like "Hi/Hello", no emoji, no markdown, no quotes, no worker name.
Tone rules:
- "positive" → strong day or strong cycle (close to or hitting cap, good streak)
- "neutral" → average / mid-range performance
- "concern" → low day, dropping recent average, or far below cap

VARY the wording heavily every single call. Never repeat the same sentence pattern. Sometimes celebrate, sometimes coach, sometimes give a tiny tip, sometimes hype them, sometimes a gentle nudge, sometimes a question, sometimes a one-liner observation. Be unpredictable.

Reply ONLY as JSON: {"insight": "...", "tone": "positive|neutral|concern"}`;

    const userPrompt = `Stage: ${body.stage ?? '-'} | Sheet: ${body.sheetName ?? '-'} | Cycle: ${body.cycleLabel ?? '-'}
Total so far this cycle: ₦${Math.round(total)}
Days worked: ${worked.length} | Avg per worked day: ₦${Math.round(avg)}
Best day: ₦${Math.round(best.value || 0)} on ${best.date || '-'}
Recent 5-day avg: ₦${Math.round(recentAvg)}
Today's earning: ₦${Math.round(todayValue)} (cap today: ₦${todayCap})
Daily series (date | ₦value | rankingDay | cap):
${enriched.map((p) => `${p.date} | ${Math.round(p.value)} | ${p.isRankingDay ? 'Y' : 'N'} | ${p.cap}`).join('\n')}

Variation seed (ignore meaning, just helps you pick a fresh angle): ${nonce}`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 1.1,
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
