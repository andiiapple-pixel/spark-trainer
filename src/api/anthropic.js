import { config } from '../config';
import { getAccessToken } from '../services/api';

const PROXY_URL = `${config.apiUrl}/api/ai/messages`;
const MODEL = 'claude-sonnet-4-20250514';
const TIMEOUT_MS = 30000;

async function callClaude(systemPrompt, userMessage, maxTokens = 4096) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const headers = { 'Content-Type': 'application/json' };
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const status = res.status;
      if (status === 429) throw Object.assign(new Error('Rate limit reached. Please wait a moment and try again.'), { code: 'RATE_LIMIT' });
      if (status === 529) throw Object.assign(new Error('Claude is temporarily overloaded. Please try again in a moment.'), { code: 'OVERLOAD' });
      throw new Error(err.error?.message || `API error ${status}`);
    }
    const data = await res.json();
    if (config.isDev) {
      const usage = data.usage;
      if (usage) console.log(`[Claude] tokens — input: ${usage.input_tokens}, output: ${usage.output_tokens}`);
    }
    return data.content[0].text;
  } finally {
    clearTimeout(timer);
  }
}

async function callClaudeChat(systemPrompt, messages, maxTokens = 1024) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const headers = { 'Content-Type': 'application/json' };
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const status = res.status;
      if (status === 429) throw Object.assign(new Error('Rate limit reached. Please wait a moment and try again.'), { code: 'RATE_LIMIT' });
      if (status === 529) throw Object.assign(new Error('Claude is temporarily overloaded. Please try again in a moment.'), { code: 'OVERLOAD' });
      throw new Error(err.error?.message || `API error ${status}`);
    }
    const data = await res.json();
    if (config.isDev) {
      const usage = data.usage;
      if (usage) console.log(`[Claude chat] tokens — input: ${usage.input_tokens}, output: ${usage.output_tokens}`);
    }
    return data.content[0].text;
  } finally {
    clearTimeout(timer);
  }
}

const WORKOUT_SCHEMA = `{
  "trainer_intro": "string — personalised opening from trainer, must address user_notes_today if provided and recovery status",
  "why_this_workout": ["string", "string", "string", "string"],
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
    "advanced_progression": "string",
    "between_set_tip": "string — one actionable tip shown during rest between sets"
  }],
  "cool_down": [{ "name": "string", "duration_seconds": 30, "description": "string" }],
  "trainer_notes": "string",
  "estimated_duration_mins": 45,
  "estimated_calories_range": "300-400",
  "session_name": "string — short punchy name for this session e.g. 'Upper Body Power'"
}`;

// Extract only the fields relevant for workout generation — avoids sending full profile bloat
function trimProfile(profile) {
  if (!profile) return profile;
  return {
    name: profile.name,
    age: profile.age,
    biological_sex: profile.biological_sex || profile.sex,
    height_cm: profile.height_cm || profile.heightCm,
    weight_kg: profile.weight_kg || profile.weightKg,
    fitness_goal: profile.fitness_goal || profile.goal,
    experience_level: profile.experience_level || profile.experience,
    injuries: profile.injuries,
    equipment_access: profile.equipment_access || profile.equipment,
    training_days_per_week: profile.training_days_per_week || profile.daysPerWeek,
    preferred_session_mins: profile.preferred_session_mins || profile.sessionLength,
    diet_style: profile.diet_style || profile.diet,
    extra_data: profile.extra_data,
  };
}

// Strip recent workouts to just what matters for progressive overload context
function trimRecentWorkouts(workouts) {
  return (workouts || []).slice(0, 3).map(w => ({
    date: w.savedAt || w.completed_at,
    type: w.type || w.workout_type,
    duration_mins: w.duration_mins,
    exercises: (w.exercises || []).map(ex => ({
      name: ex.name || ex.prescribed?.name,
      sets: ex.sets_logged?.length || ex.prescribed?.sets,
      reps: ex.sets_logged?.[0]?.reps || ex.prescribed?.reps,
      weight: ex.sets_logged?.[0]?.weight,
      muscle_groups: ex.prescribed?.muscle_groups || ex.muscle_groups,
    })),
  }));
}

export async function generateWorkout(profile, sessionConfig, recentWorkouts = [], programmeContext = null, recoveryContext = null) {
  const recoveryInstruction = recoveryContext ? buildRecoveryInstruction(recoveryContext) : '';

  const system = `You are an elite personal trainer with 20+ years of experience in strength & conditioning, sports science, and rehabilitation. Generate a structured, safe, progressive workout. Return ONLY valid JSON matching the exact schema provided — no extra text, no markdown, no code fences.${recoveryInstruction ? '\n\n' + recoveryInstruction : ''}`;

  const userMessage = `
CLIENT PROFILE:
${JSON.stringify(trimProfile(profile), null, 2)}

SESSION CONFIG:
${JSON.stringify(sessionConfig, null, 2)}

${sessionConfig.user_notes_today ? `IMPORTANT — CLIENT NOTE FOR TODAY: "${sessionConfig.user_notes_today}"
Parse this note for anything affecting today's workout (injuries, soreness, fatigue, mood, exercise preferences). Apply it directly and address it in the trainer_intro field. Never ignore this note.` : ''}

RECENT WORKOUTS (last 3, for progressive overload context):
${JSON.stringify(trimRecentWorkouts(recentWorkouts), null, 2)}

${programmeContext ? `PROGRAMME CONTEXT:\n${JSON.stringify(programmeContext, null, 2)}` : ''}

${recoveryContext ? `RECOVERY DATA:\n${JSON.stringify(recoveryContext, null, 2)}` : ''}

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
- why_this_workout: 4 bullet points explaining why these exercises/volume/intensity were chosen. Reference recovery status, last session, and progression principles.
- between_set_tip: one concise tip per exercise shown during rest (form reminder, breathing cue, or mind-muscle connection advice)
- session_name: short descriptive name like "Upper Body Strength" or "Active Recovery Flow"
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
CLIENT: ${JSON.stringify(trimProfile(profile), null, 2)}
PROGRAMME: ${JSON.stringify(programmeConfig, null, 2)}

Write their programme overview now.`;

  return callClaude(system, userMessage, 512);
}

export async function generateEndOfWorkoutFeedback(profile, prescribed, logged, rating, userNotesToday) {
  const system = `You are a personal trainer giving post-workout feedback. Be encouraging, specific, and honest. 3-5 sentences. Reference what the client flagged before the session if anything.`;

  const userMessage = `
CLIENT: ${JSON.stringify(trimProfile(profile), null, 2)}
PRESCRIBED WORKOUT: ${JSON.stringify(prescribed, null, 2)}
WHAT THEY ACTUALLY DID: ${JSON.stringify(logged, null, 2)}
SESSION RATING: ${rating}/5 stars
${userNotesToday ? `PRE-SESSION NOTE FROM CLIENT: "${userNotesToday}"` : ''}

Give your trainer feedback now.`;

  return callClaude(system, userMessage, 512);
}

function buildRecoveryInstruction(recovery) {
  const { score, category, sleep_quality, sleep_duration, body_feeling, stress_level } = recovery;
  const instructions = {
    red: 'RECOVERY STATUS: RED (score 0-40). Client has poor recovery. REQUIRED: Reduce total workout volume by 30-40%. Lower intensity targets to RPE 6-7. Prioritise mobility, active recovery, or light technique work. Explicitly acknowledge the low recovery in trainer_intro and explain why the session is modified. Suggest a rest day as an alternative option.',
    amber: 'RECOVERY STATUS: AMBER (score 41-65). Client has moderate recovery. REQUIRED: Reduce total volume by 10-20%. Maintain planned exercises but reduce sets or rep targets by 10-15%. RPE targets should be moderate (7-8). Acknowledge the moderate recovery in trainer_intro.',
    green: 'RECOVERY STATUS: GREEN (score 66-85). Client is well-recovered. Generate standard planned workout with no modifications.',
    blue: 'RECOVERY STATUS: BLUE/PEAK (score 86-100). Client is at peak readiness. This is a great day to push hard. Add an additional challenging set on 1-2 key lifts. Increase intensity targets slightly. trainer_intro should highlight this is an excellent performance day and suggest attempting a PR on a key lift.',
  };
  return instructions[category] || '';
}

export async function generateDailyMessage(profile, context) {
  const h = new Date().getHours();
  const timeOfDay = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  const system = `You are a personal trainer sending a short motivational message to your client at the start of their day. Be specific, genuine, and concise — 1-2 sentences max. No emojis. No generic platitudes. Reference their actual data.`;
  const userMessage = `Client: ${profile?.name || 'Athlete'}, ${profile?.fitnessLevel || profile?.experience_level || 'intermediate'} level. Time of day: ${timeOfDay}. Streak: ${context.streak} days. Workouts this week: ${context.weeklyCount}/${context.goalDays}. Recovery score today: ${context.recoveryScore ?? 'not yet checked in'}. Last workout: ${context.lastWorkoutDate ? new Date(context.lastWorkoutDate).toLocaleDateString() : 'no recent data'}.`;
  return callClaude(system, userMessage, 80);
}

export async function generateContextualCoachPrompts(profile, coachContext) {
  const system = `You are a personal trainer. Generate 3 contextually relevant question suggestions for your client to ask you right now, based on their current training situation. Return ONLY a JSON array of 3 strings. Each string is a natural question from the client's perspective, max 10 words. No other text.`;
  const userMessage = `Context: ${JSON.stringify(coachContext, null, 2)}\nProfile: ${JSON.stringify(trimProfile(profile), null, 2)}`;
  const text = await callClaude(system, userMessage, 256);
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return ['How was my last session?', 'What should I focus on today?', 'How is my progress looking?'];
  }
}

export async function sendCoachMessage(profile, chatHistory, userMessage, recentNotes = [], coachContext = null) {
  // Trim recent workouts in coachContext to avoid huge payloads
  const trimmedContext = coachContext ? {
    ...coachContext,
    recentWorkouts: trimRecentWorkouts(coachContext.recentWorkouts),
  } : null;

  const contextSection = trimmedContext ? `
FULL TRAINING CONTEXT:
- Recent workouts (last 5): ${JSON.stringify(trimmedContext.recentWorkouts, null, 2)}
- Current programme: ${JSON.stringify(trimmedContext.currentProgramme, null, 2)}
- Recovery (last 7 days scores): ${trimmedContext.recentRecovery?.map(r => `${r.logged_date}: ${r.recovery_score}`).join(', ') || 'no data'}
- Personal records: ${JSON.stringify(trimmedContext.personalRecords?.slice(0, 10), null, 2)}
- Consistency: ${JSON.stringify(trimmedContext.consistencyStats, null, 2)}

You have full knowledge of this client's recent training history, recovery patterns, and goals. Reference specific details from their history when relevant — do not give generic advice when you have their actual data. If they mention a pain or symptom that appears in their recent workout notes more than once, proactively flag it.` : '';

  const system = `You are an expert personal trainer and health coach with 20+ years of experience. You know your client well from their profile and training history. Be encouraging, direct, and knowledgeable. If they describe pain or injury symptoms, always recommend consulting a healthcare professional. Keep responses concise (under 200 words) unless a detailed explanation is needed.

CLIENT PROFILE:
${JSON.stringify(trimProfile(profile), null, 2)}
${contextSection}
${recentNotes.length ? `\nRECENT PRE-SESSION NOTES FROM THIS CLIENT:\n${recentNotes.map((n, i) => `${i + 1}. "${n}"`).join('\n')}\nNote: If you see recurring themes (e.g. repeated knee soreness), proactively flag it.` : ''}`;

  const messages = [
    ...chatHistory.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ];

  return callClaudeChat(system, messages, 1024);
}
