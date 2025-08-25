const OPENAI_API_KEY = process.env.openai_key || process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

if (!OPENAI_API_KEY) {
  console.warn("[AI] Missing openai_key env var; AI routes will return stub responses.");
}

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

// Simple heuristic fallback if key missing or API fails
function heuristicRisk(features) {
  const {
    totalAmount,
    daysUntilCheckIn,
    graceHours,
    paymentStatus,
    priorCancels,
    priorAttended,
    hotelCancelRate,
  } = features;

  let score = 0;
  if (daysUntilCheckIn > 30) score += 10; // long lead time
  if (daysUntilCheckIn <= (graceHours / 24)) score += 25;
  if ((paymentStatus || '').toLowerCase().includes('waiting')) score += 25;
  score += Math.min(30, priorCancels * 10);
  score += Math.min(15, hotelCancelRate * 50);
  if (totalAmount > 500) score += 5;
  if (priorAttended >= 3) score -= 10; // loyal
  const label = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
  return {
    riskScore: clamp(Math.round(score)),
    label,
    reason: `Heuristic: lead time ${daysUntilCheckIn}d, payment ${paymentStatus}, cancels ${priorCancels}, hotelCancelRate ${(hotelCancelRate*100).toFixed(0)}%`,
    actions: [
      "Send reminder with check-in details and cancellation policy",
      "Offer small incentive to keep booking or shift to flexible dates",
      "Request deposit if policy allows",
    ],
    messageTemplate: "Hello {{name}}, we’re looking forward to welcoming you on {{checkIn}}. If your plans changed, we can offer flexible options. Reply if you need assistance.",
  };
}

exports.assessCancellationRisk = async ({ bookingId, features }) => {
  if (!OPENAI_API_KEY) return heuristicRisk(features);

  const system = `You are an assistant that outputs STRICT JSON with fields: riskScore (0-100 integer), label (\"low\"|\"medium\"|\"high\"), reason (short), actions (array of 2-4 concise strings), messageTemplate (short, polite, placeholders {{name}}, {{checkIn}}). Do not add any extra fields.`;
  const user = {
    role: "user",
    content: [
      { type: "text", text: `Booking ${bookingId} features: ${JSON.stringify(features)}` },
    ],
  };

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [ { role: "system", content: system }, user ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        timeout: 10000,
      }),
    });
    if (!resp.ok) throw new Error(`OpenAI ${resp.status}`);
    const data = await resp.json();
    const txt = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(txt);
    // Clamp values
    parsed.riskScore = clamp(Number(parsed.riskScore) || 0);
    if (!['low','medium','high'].includes(parsed.label)) parsed.label = parsed.riskScore>=70?'high':parsed.riskScore>=40?'medium':'low';
    if (!Array.isArray(parsed.actions)) parsed.actions = [];
    if (typeof parsed.reason !== 'string') parsed.reason = '';
    if (typeof parsed.messageTemplate !== 'string') parsed.messageTemplate = '';
    return parsed;
  } catch (e) {
    console.warn("[AI] Fallback to heuristic due to error:", e.message);
    return heuristicRisk(features);
  }
};

exports.detectAnomalies = async ({ series, horizonDays }) => {
  // series: [{ date: 'YYYY-MM-DD', bookings: n, cancels: n }]
  if (!OPENAI_API_KEY) {
    // Simple local detection: z-score-ish on bookings
    const avg = series.reduce((s, d) => s + d.bookings, 0) / Math.max(1, series.length);
    const anomalies = series
      .filter((d) => d.bookings > avg * 1.8 || d.bookings < avg * 0.4)
      .slice(0, 5)
      .map((d) => ({
        date: d.date,
        metric: "bookings",
        type: d.bookings > avg ? "spike" : "drop",
        severity: 3,
        reason: `Deviation from avg ${avg.toFixed(1)}: value ${d.bookings}`,
      }));
    return { anomalies, summary: `Local heuristic detected ${anomalies.length} anomalies in the last ${horizonDays} days.` };
  }

  const system = `You analyze short hotel time series (daily bookings and cancellations). Return STRICT JSON { anomalies: Array<{date:string, metric:"bookings"|"cancels", type:"spike"|"drop"|"trend", severity:1|2|3|4|5, reason:string }>, summary:string }. Prefer at most 5 concise anomalies.`;
  const user = { role: "user", content: [ { type: "text", text: JSON.stringify({ series, horizonDays }) } ] };
  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, messages: [ { role: "system", content: system }, user ], response_format: { type: "json_object" }, temperature: 0.2 })
    });
    if (!resp.ok) throw new Error(`OpenAI ${resp.status}`);
    const data = await resp.json();
    const txt = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(txt);
    if (!Array.isArray(parsed.anomalies)) parsed.anomalies = [];
    if (typeof parsed.summary !== 'string') parsed.summary = '';
    // sanitize severities
    parsed.anomalies = parsed.anomalies.map(a => ({
      date: a.date,
      metric: a.metric === 'cancels' ? 'cancels' : 'bookings',
      type: ['spike','drop','trend'].includes(a.type) ? a.type : 'spike',
      severity: Math.min(5, Math.max(1, Number(a.severity)||3)),
      reason: String(a.reason||'')
    })).slice(0,5);
    return parsed;
  } catch (e) {
    console.warn('[AI] detectAnomalies fallback:', e.message);
    return { anomalies: [], summary: 'Could not analyze anomalies (fallback).' };
  }
};

exports.revenueForecast = async ({ context }) => {
  // context: { month, completedRevenue, pipelineRevenue, projectedRevenue, goal, daysRemaining, today, prevMonthRevenue }
  if (!OPENAI_API_KEY) {
    const gap = (context.goal || 0) - (context.projectedRevenue || 0);
    const actions = [
      'Increase price on high-demand dates by 5-8%',
      'Upsell add-on services (late checkout, breakfast) at check-in',
      'Target guests with pending bookings for deposit/payment reminders',
    ];
    return { summary: `Projected $${Math.round(context.projectedRevenue||0).toLocaleString()} vs goal $${Math.round(context.goal||0).toLocaleString()}, gap $${Math.round(gap).toLocaleString()}.`, actions };
  }

  const system = `You are a hotel revenue coach. Return STRICT JSON { summary:string, actions:string[] }. Keep actions concrete, 3-6 bullets.`;
  const user = { role: 'user', content: [ { type:'text', text: JSON.stringify(context) } ] };
  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, messages: [ { role:'system', content: system }, user ], response_format: { type:'json_object' }, temperature: 0.3 })
    });
    if (!resp.ok) throw new Error(`OpenAI ${resp.status}`);
    const data = await resp.json();
    const txt = data.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(txt);
    if (!Array.isArray(parsed.actions)) parsed.actions = [];
    if (typeof parsed.summary !== 'string') parsed.summary = '';
    return parsed;
  } catch (e) {
    console.warn('[AI] revenueForecast fallback:', e.message);
    const gap = (context.goal || 0) - (context.projectedRevenue || 0);
    return { summary: `Projected $${Math.round(context.projectedRevenue||0).toLocaleString()} vs goal $${Math.round(context.goal||0).toLocaleString()}, gap $${Math.round(gap).toLocaleString()}.`, actions: [] };
  }
};

exports.overbookingSim = async ({ context }) => {
  // context: { capacity, cancelRate, noShowRate, windowDays, hotelId }
  if (!OPENAI_API_KEY) {
    const expectedDrop = Math.min(0.3, (context.cancelRate || 0) * 0.7 + (context.noShowRate || 0) * 0.9);
    const cap = Math.max(0, Number(context.capacity) || 0);
    const recommendedBuffer = Math.min(Math.ceil(expectedDrop * cap), Math.ceil(cap * 0.2));
    return {
      recommendedBuffer,
      rationale: `Heuristic based on cancel rate ${(context.cancelRate*100||0).toFixed(1)}% and no‑show rate ${(context.noShowRate*100||0).toFixed(1)}%.` ,
      notes: [
        'Cap buffer at 20% of capacity',
        'Tighten buffer on citywide events or high ADR nights',
        'Lower buffer if walk costs or guest satisfaction risks are high'
      ]
    };
  }

  const system = `You are a hotel revenue/operations assistant. Return STRICT JSON { recommendedBuffer:number, rationale:string, notes:string[] }. The buffer is the extra rooms to overbook above physical capacity, considering cancel/no‑show risk and operations risk. Keep notes short (3-5).`;
  const user = { role: 'user', content: [ { type:'text', text: JSON.stringify(context) } ] };
  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, messages: [ { role:'system', content: system }, user ], response_format: { type:'json_object' }, temperature: 0.2 })
    });
    if (!resp.ok) throw new Error(`OpenAI ${resp.status}`);
    const data = await resp.json();
    const txt = data.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(txt);
    parsed.recommendedBuffer = Math.max(0, Math.floor(Number(parsed.recommendedBuffer)||0));
    if (!Array.isArray(parsed.notes)) parsed.notes = [];
    if (typeof parsed.rationale !== 'string') parsed.rationale = '';
    // Soft cap: 20% of capacity
    const cap = Math.max(0, Number(context.capacity)||0);
    parsed.recommendedBuffer = Math.min(parsed.recommendedBuffer, Math.ceil(cap*0.2));
    return parsed;
  } catch (e) {
    console.warn('[AI] overbookingSim fallback:', e.message);
    const expectedDrop = Math.min(0.3, (context.cancelRate || 0) * 0.7 + (context.noShowRate || 0) * 0.9);
    const cap = Math.max(0, Number(context.capacity) || 0);
    const recommendedBuffer = Math.min(Math.ceil(expectedDrop * cap), Math.ceil(cap * 0.2));
    return { recommendedBuffer, rationale: 'Fallback heuristic', notes: [] };
  }
};


