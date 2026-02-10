import "dotenv/config";
import express from "express";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

// Serve the SPA from this folder (no CORS needed).
app.use(express.static(__dirname));

const PORT = Number(process.env.PORT) || 3000;
const MOCK_MODE = toBool(process.env.MOCK_MODE);
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

const ALLOWED_MODES = [
  "Bollywood Romance",
  "Intense Drama",
  "Comedy/Timing",
  "Audition Slate",
  "Commercial/Brand Read",
];

app.post("/api/realtime-token", async (req, res) => {
  try {
    if (MOCK_MODE) {
      return res.status(501).json({
        error: "MOCK_MODE does not support Realtime",
        details: ["Disable MOCK_MODE and set OPENAI_API_KEY to use Realtime."],
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Server misconfigured: missing OPENAI_API_KEY" });
    }

    const validation = validateRealtimeTokenInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: "Invalid input", details: validation.details });
    }

    const { mode, duration, difficulty } = req.body;

    const REALTIME_MODEL = process.env.REALTIME_MODEL || "gpt-realtime";
    const REALTIME_VOICE = process.env.REALTIME_VOICE || "marin";

    const instructions = [
      "You are a Bollywood/Mumbai acting coach and casting director.",
      "Indian English is expected; Hinglish is allowed. Do NOT penalize Hinglish unless clarity suffers.",
      "Be warm, premium, and direct. Keep feedback short and actionable.",
      "After each user take, respond with spoken feedback in this structure:",
      "1) one quick praise (max 1 sentence),",
      "2) one correction only (pick the highest-impact issue),",
      "3) one micro-drill (10-20 seconds),",
      "4) a 'Take 2' direction (1 sentence).",
      "Avoid long monologues. Keep total response under ~12 seconds.",
      `Current session: Mode=${mode}, Duration=${duration}s, Difficulty=${difficulty}.`,
    ].join("\n");

    const body = {
      expires_after: { anchor: "created_at", seconds: 60 },
      session: {
        type: "realtime",
        model: REALTIME_MODEL,
        output_modalities: ["audio"],
        instructions,
        audio: {
          input: {
            format: { type: "audio/pcm", rate: 24000 },
            noise_reduction: { type: "near_field" },
            transcription: { model: "gpt-4o-mini-transcribe", language: "en" },
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
              create_response: true,
              interrupt_response: true,
            },
          },
          output: {
            format: { type: "audio/pcm", rate: 24000 },
            voice: REALTIME_VOICE,
          },
        },
      },
    };

    const r = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const json = await r.json().catch(() => ({}));
    if (!r.ok) {
      return res.status(502).json({
        error: "Failed to create Realtime client secret",
        details: [json?.error?.message || `HTTP ${r.status}`],
      });
    }

    const value = json?.client_secret?.value;
    const expiresAt = json?.client_secret?.expires_at;
    if (!value || !expiresAt) {
      return res.status(502).json({
        error: "Realtime token response missing client_secret",
        details: ["Unexpected response from OpenAI."],
      });
    }

    return res.json({
      value,
      expires_at: expiresAt,
      model: REALTIME_MODEL,
      voice: REALTIME_VOICE,
      ws_url: `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(REALTIME_MODEL)}`,
    });
  } catch (err) {
    return res.status(500).json({ error: "Realtime token failed", message: err?.message });
  }
});

app.post("/api/prompt", async (req, res) => {
  try {
    const validation = validatePromptInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: "Invalid input", details: validation.details });
    }

    const { mode, duration, accent, style, difficulty } = req.body;

    if (MOCK_MODE) {
      return res.json(mockPrompt({ mode, duration, accent, style, difficulty }));
    }

    const client = getClient();
    if (!client) {
      return res.status(500).json({ error: "Server misconfigured: missing OPENAI_API_KEY" });
    }

    const system = `
You are a Bollywood/Mumbai acting coach. Generate a short performable audition prompt for an actor. Style: Indian English + Hinglish allowed. Keep it cinematic and modern, not cringe. Output JSON with: title, context (1–2 lines), objective, constraint, requiredBeat (a turn halfway), castingDirectorNote (one line). Ensure it fits duration: 30/60/90 seconds.
`.trim();

    const user = {
      mode,
      duration,
      accent,
      style,
      difficulty,
      vibe: "premium, modern Mumbai / Bollywood",
      guardrails: [
        "Keep it performable within the requested duration",
        "Give one clear objective and one constraint",
        "Include a required emotional beat shift",
        "Casting director note should be short and practical",
      ],
    };

    const response = await client.responses.create({
      model: OPENAI_MODEL,
      input: [
        { role: "system", content: [{ type: "text", text: system }] },
        { role: "user", content: [{ type: "text", text: JSON.stringify(user) }] },
      ],
    });

    const text = response.output_text;
    const obj = safeJsonParse(text);
    const shape = validatePromptOutput(obj);
    if (!shape.ok) {
      return res.status(502).json({
        error: "Model returned unexpected prompt format",
        raw: text,
        details: shape.details,
      });
    }

    return res.json(obj);
  } catch (err) {
    return res.status(500).json({ error: "Prompt generation failed", message: err?.message });
  }
});

app.post("/api/grade", async (req, res) => {
  try {
    const validation = validateGradeInput(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: "Invalid input", details: validation.details });
    }

    const { mode, duration, promptObject, transcript } = req.body;

    if (MOCK_MODE) {
      return res.json(mockGrade({ mode, duration, promptObject, transcript }));
    }

    const client = getClient();
    if (!client) {
      return res.status(500).json({ error: "Server misconfigured: missing OPENAI_API_KEY" });
    }

    const system = `
You are a Bollywood casting director + acting coach. Grade the actor’s performance from the transcript. Do NOT penalize Hinglish or Indian English accent. Score 0–10: diction/clarity, emotional truth, intent/objective, dynamics/pacing, presence/control, Bollywood tone (only if mode is Bollywood Romance or Intense Drama). Return JSON with scores, overall, castingNote (one line), 3 specific notes, 1 drill, and a Take 2 direction changing one constraint.
`.trim();

    const user = {
      mode,
      duration,
      promptObject,
      transcript,
      gradingRubric: {
        diction: "clarity, articulation, intelligibility; Hinglish ok if clear",
        emotion: "believability and emotional truth",
        intent: "objective-driven delivery",
        dynamics: "variation in pace, volume, emphasis, pauses",
        presence: "confidence, ownership, authority",
        bollywoodTone: "fits Bollywood/Mumbai vibe without becoming caricature",
      },
    };

    const response = await client.responses.create({
      model: OPENAI_MODEL,
      input: [
        { role: "system", content: [{ type: "text", text: system }] },
        { role: "user", content: [{ type: "text", text: JSON.stringify(user) }] },
      ],
    });

    const text = response.output_text;
    const obj = safeJsonParse(text);
    const shape = validateGradeOutput(obj);
    if (!shape.ok) {
      return res.status(502).json({
        error: "Model returned unexpected grade format",
        raw: text,
        details: shape.details,
      });
    }

    return res.json(obj);
  } catch (err) {
    return res.status(500).json({ error: "Grading failed", message: err?.message });
  }
});

// Fallback route for SPA deep links (if you later add any).
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  const hasKey = Boolean(process.env.OPENAI_API_KEY);
  const mode = MOCK_MODE ? "MOCK" : hasKey ? "PROD" : "live (no API key)";
  console.log(`Server running on http://localhost:${PORT} [${mode}]`);
});

function toBool(value) {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function isPlainObject(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function validatePromptInput(body) {
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

function validatePromptOutput(obj) {
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

function validateRealtimeTokenInput(body) {
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

function validateGradeInput(body) {
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

function validateGradeOutput(obj) {
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

function safeJsonParse(text) {
  if (isPlainObject(text)) return text;
  const s = String(text || "").trim();
  try {
    return JSON.parse(s);
  } catch {
    // Attempt to extract the first JSON object from messy output.
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const slice = s.slice(start, end + 1);
      return JSON.parse(slice);
    }
    throw new Error("Failed to parse JSON from model output.");
  }
}

function mockPrompt({ mode, duration, difficulty }) {
  const title = `${mode} — Mumbai Moment (${difficulty})`;
  return {
    title,
    context:
      "Late evening in Bandra. You’re outside a café where you promised you’d never return. Someone from your past appears.",
    objective:
      "Win them back to your side without sounding desperate — you need their help for a crucial audition tomorrow.",
    constraint:
      "Keep your voice low (people around). Don’t directly mention money or favors.",
    requiredBeat:
      "Start charming and light; switch to raw honesty halfway, then end with controlled confidence.",
    castingDirectorNote:
      "Indian English/Hinglish is fine. Prioritize truth over theatrics; pause before the beat change.",
  };
}

function mockGrade({ transcript }) {
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

