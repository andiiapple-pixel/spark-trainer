const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;
const BASE_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

async function callClaude(systemPrompt, userMessage, maxTokens = 4096) {
  if (!API_KEY) {
    throw new Error('No API key found. Add VITE_ANTHROPIC_API_KEY to your .env file.');
  }
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${res.status}`);
  }
  const data = await res.json();
  return data.content[0].text;
}

async function callClaudeChat(systemPrompt, messages, maxTokens = 1024) {
  if (!API_KEY) throw new Error('No API key. Add VITE_ANTHROPIC_API_KEY to .env');
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${res.status}`);
  }
  const data = await res.json();
  return data.content[0].text;
}

const WORKOUT_SCHEMA = `{
  "trainer_intro": "string — personalised opening from trainer, must address user_notes_today if provided",
  "warm_up": [{ "name": "string", "duration_seconds": 30, "description": "string" }],
  "exercises": [{
    "name": "string",
    "muscle_groups": ["string"],
    "sets": 3,
    "reps": "string (e.g. '8-10' or '12' or '30 seconds')",
    "rest_seconds": 60,
    "weight_guidance": "string (e.g. 'RPE 7-8' or '60% 1RM' or 'bodyweight')",
    "form_cues": ["string", "string", "string"],
    "beginner_mod": "string",
    "advanced_progression": "string"
  }],
  "cool_down": [{ "name": "string", "duration_seconds": 30, "description": "string" }],
  "trainer_notes": "string",
  "estimated_duration_mins": 45,
  "estimated_calories_range": "300-400"
}`;

export async function generateWorkout(profile, sessionConfig, recentWorkouts = [], programmeContext = null) {
  const system = `You are an elite personal trainer with 20+ years of experience in strength & conditioning, sports science, and rehabilitation. Generate a structured, safe, progressive workout. Return ONLY valid JSON matching the exact schema provided — no extra text, no markdown, no code fences.`;

  const userMessage = `
CLIENT PROFILE:
${JSON.stringify(profile, null, 2)}

SESSION CONFIG:
${JSON.stringify(sessionConfig, null, 2)}

${sessionConfig.user_notes_today ? `IMPORTANT — CLIENT NOTE FOR TODAY: "${sessionConfig.user_notes_today}"
Parse this note for anything affecting today's workout (injuries, soreness, fatigue, mood, exercise preferences). Apply it directly and address it in the trainer_intro field. Never ignore this note.` : ''}

RECENT WORKOUTS (last 3, for progressive overload context):
${JSON.stringify(recentWorkouts.slice(0, 3), null, 2)}

${programmeContext ? `PROGRAMME CONTEXT:\n${JSON.stringify(programmeContext, null, 2)}` : ''}

Generate today's workout. Return ONLY valid JSON matching this schema exactly:
${WORKOUT_SCHEMA}

Rules:
- Include 4-8 exercises appropriate for the duration and goals
- Scale volume and intensity to the client's experience level and today's energy
- Warm-up: 3-5 exercises, 5-8 mins total
- Cool-down: 3-4 stretches, 5 mins total
- Weight guidance must be specific (RPE, % of bodyweight, or relative descriptor)
- Form cues: exactly 3 per exercise, concise and actionable
- Beginner mod and advanced progression are required for every exercise
`;

  const text = await callClaude(system, userMessage, 4096);
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error('Could not parse workout response. Try again.');
  }
}

export async function generateProgrammeOverview(profile, programmeConfig) {
  const system = `You are an elite personal trainer. Write a motivating, personalised programme overview directly to your client. Be specific about what they'll achieve and why this structure works for them. Second person only. 150-200 words exactly. No JSON, just the text.`;

  const userMessage = `
CLIENT: ${JSON.stringify(profile, null, 2)}
PROGRAMME: ${JSON.stringify(programmeConfig, null, 2)}

Write their programme overview now.`;

  return callClaude(system, userMessage, 512);
}

export async function generateEndOfWorkoutFeedback(profile, prescribed, logged, rating, userNotesToday) {
  const system = `You are a personal trainer giving post-workout feedback. Be encouraging, specific, and honest. 3-5 sentences. Reference what the client flagged before the session if anything.`;

  const userMessage = `
CLIENT: ${JSON.stringify(profile, null, 2)}
PRESCRIBED WORKOUT: ${JSON.stringify(prescribed, null, 2)}
WHAT THEY ACTUALLY DID: ${JSON.stringify(logged, null, 2)}
SESSION RATING: ${rating}/5 stars
${userNotesToday ? `PRE-SESSION NOTE FROM CLIENT: "${userNotesToday}"` : ''}

Give your trainer feedback now.`;

  return callClaude(system, userMessage, 512);
}

export async function sendCoachMessage(profile, chatHistory, userMessage, recentNotes = []) {
  const system = `You are an expert personal trainer and health coach with 20+ years of experience. You know your client well from their profile. Be encouraging, direct, and knowledgeable. If they describe pain or injury symptoms, always recommend consulting a healthcare professional. Keep responses concise (under 200 words) unless a detailed explanation is needed.

CLIENT PROFILE:
${JSON.stringify(profile, null, 2)}

${recentNotes.length ? `RECENT PRE-SESSION NOTES FROM THIS CLIENT (last ${recentNotes.length}):
${recentNotes.map((n, i) => `${i + 1}. "${n}"`).join('\n')}
Note: If you see recurring themes (e.g. repeated knee soreness), proactively flag it.` : ''}`;

  const messages = [
    ...chatHistory.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ];

  return callClaudeChat(system, messages, 1024);
}
