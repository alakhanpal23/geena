/**
 * Shared validation and helpers for Vercel serverless API routes.
 */

const ALLOWED_MODES = [
  "Bollywood Romance",
  "Intense Drama",
  "Comedy/Timing",
  "Audition Slate",
  "Commercial/Brand Read",
];

export function toBool(value) {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

export function isPlainObject(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function validatePromptInput(body) {
  const details = [];
  if (!isPlainObject(body)) details.push("Body must be a JSON object.");
  const mode = body?.mode;
  const duration = body?.duration;
  const accent = body?.accent;
  const style = body?.style;
  const difficulty = body?.difficulty;

  if (typeof mode !== "string" || !ALLOWED_MODES.includes(mode)) {
    details.push(`mode must be one of: ${ALLOWED_MODES.join(", ")}`);
  }
  if (![30, 60, 90].includes(Number(duration))) {
    details.push("duration must be 30, 60, or 90.");
  }
  if (typeof accent !== "string" || accent.length < 2) details.push("accent must be a string.");
  if (typeof style !== "string" || style.length < 2) details.push("style must be a string.");
  if (typeof difficulty !== "string" || difficulty.length < 2) {
    details.push("difficulty must be a string (e.g., Easy/Medium/Hard).");
  }

  return { ok: details.length === 0, details };
}

export function validatePromptOutput(obj) {
  const details = [];
  if (!isPlainObject(obj)) details.push("Output is not an object.");
  for (const k of [
    "title",
    "context",
    "objective",
    "constraint",
    "requiredBeat",
    "castingDirectorNote",
  ]) {
    if (typeof obj?.[k] !== "string" || obj[k].trim().length === 0) details.push(`Missing ${k}.`);
  }
  return { ok: details.length === 0, details };
}

export function validateRealtimeTokenInput(body) {
  const details = [];
  if (!isPlainObject(body)) details.push("Body must be a JSON object.");
  const mode = body?.mode;
  const duration = body?.duration;
  const difficulty = body?.difficulty;

  if (typeof mode !== "string" || !ALLOWED_MODES.includes(mode)) {
    details.push(`mode must be one of: ${ALLOWED_MODES.join(", ")}`);
  }
  if (![30, 60, 90].includes(Number(duration))) {
    details.push("duration must be 30, 60, or 90.");
  }
  if (typeof difficulty !== "string" || difficulty.length < 2) {
    details.push("difficulty must be a string (e.g., Easy/Medium/Hard).");
  }

  return { ok: details.length === 0, details };
}

export function validateGradeInput(body) {
  const details = [];
  if (!isPlainObject(body)) details.push("Body must be a JSON object.");
  const mode = body?.mode;
  const duration = body?.duration;
  const promptObject = body?.promptObject;
  const transcript = body?.transcript;

  if (typeof mode !== "string" || !ALLOWED_MODES.includes(mode)) {
    details.push(`mode must be one of: ${ALLOWED_MODES.join(", ")}`);
  }
  if (![30, 60, 90].includes(Number(duration))) {
    details.push("duration must be 30, 60, or 90.");
  }
  if (!isPlainObject(promptObject)) {
    details.push("promptObject must be a JSON object returned by /api/prompt.");
  } else {
    const shape = validatePromptOutput(promptObject);
    if (!shape.ok) details.push(`promptObject invalid: ${shape.details.join(" ")}`);
  }
  if (typeof transcript !== "string" || transcript.trim().length < 8) {
    details.push("transcript must be a string (min length ~8 chars).");
  }

  return { ok: details.length === 0, details };
}

export function validateGradeOutput(obj) {
  const details = [];
  if (!isPlainObject(obj)) details.push("Output is not an object.");
  const scores = obj?.scores;
  if (!isPlainObject(scores)) details.push("scores must be an object.");
  for (const k of ["diction", "emotion", "intent", "dynamics", "presence", "bollywoodTone"]) {
    const v = scores?.[k];
    if (typeof v !== "number" || v < 0 || v > 10) details.push(`scores.${k} must be 0-10.`);
  }
  if (typeof obj?.overall !== "number" || obj.overall < 0 || obj.overall > 10) {
    details.push("overall must be 0-10.");
  }
  if (typeof obj?.castingNote !== "string" || obj.castingNote.trim().length === 0) {
    details.push("castingNote required.");
  }
  if (!Array.isArray(obj?.notes) || obj.notes.some((n) => typeof n !== "string")) {
    details.push("notes must be an array of strings.");
  } else if (obj.notes.length !== 3) {
    details.push("notes must contain exactly 3 items.");
  }
  if (typeof obj?.drill !== "string" || obj.drill.trim().length === 0) details.push("drill required.");
  if (typeof obj?.take2 !== "string" || obj.take2.trim().length === 0) details.push("take2 required.");
  return { ok: details.length === 0, details };
}

export function safeJsonParse(text) {
  if (isPlainObject(text)) return text;
  const s = String(text || "").trim();
  try {
    return JSON.parse(s);
  } catch {
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const slice = s.slice(start, end + 1);
      return JSON.parse(slice);
    }
    throw new Error("Failed to parse JSON from model output.");
  }
}

export function mockPrompt({ mode, duration, difficulty }) {
  const title = `${mode} — Mumbai Moment (${difficulty})`;
  return {
    title,
    context:
      "Late evening in Bandra. You're outside a café where you promised you'd never return. Someone from your past appears.",
    objective:
      "Win them back to your side without sounding desperate — you need their help for a crucial audition tomorrow.",
    constraint:
      "Keep your voice low (people around). Don't directly mention money or favors.",
    requiredBeat:
      "Start charming and light; switch to raw honesty halfway, then end with controlled confidence.",
    castingDirectorNote:
      "Indian English/Hinglish is fine. Prioritize truth over theatrics; pause before the beat change.",
  };
}

export function mockGrade({ transcript }) {
  const w = transcript.split(/\s+/).filter(Boolean).length;
  const base = Math.max(4, Math.min(9, Math.round(w / 35)));
  return {
    scores: {
      diction: Math.min(10, base + 1),
      emotion: base,
      intent: Math.max(0, base - 1),
      dynamics: base,
      presence: Math.min(10, base + 1),
      bollywoodTone: Math.max(0, base - 1),
    },
    overall: base,
    castingNote:
      "Good energy and believable rhythm. Tighten clarity on key words and commit harder to the beat change.",
    notes: [
      "Mark 3 power-words and hit them with a slight pause + emphasis.",
      "Avoid rushing the first 10 seconds; let the listener lean in.",
      "Hinglish is fine—just keep sentence endings clean.",
    ],
    drill:
      "Do a 30-second 'consonant crisp' drill: repeat the first 2 lines slowly, then at performance pace.",
    take2:
      "Take 2: Begin softer, almost playful. On the beat change, drop the smile, slow down, and land the final line like a promise.",
  };
}
