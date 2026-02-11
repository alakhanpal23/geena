import OpenAI from "openai";
import {
  toBool,
  validateGradeInput,
  validateGradeOutput,
  normalizeGradeOutput,
  safeJsonParse,
  mockGrade,
} from "../lib/shared.js";

const MOCK_MODE = toBool(process.env.MOCK_MODE);
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body ?? {};
    const validation = validateGradeInput(body);
    if (!validation.ok) {
      return res.status(400).json({ error: "Invalid input", details: validation.details });
    }

    const { mode, duration, promptObject, transcript } = body;

    if (MOCK_MODE) {
      return res.json(mockGrade({ mode, duration, promptObject, transcript }));
    }

    const client = getClient();
    if (!client) {
      return res.status(500).json({ error: "Server misconfigured: missing OPENAI_API_KEY" });
    }

    const system = `
You are a Bollywood casting director + acting coach. Grade the actor's performance from the transcript. Do NOT penalize Hinglish or Indian English accent. Score 0–10: diction/clarity, emotional truth, intent/objective, dynamics/pacing, presence/control, Bollywood tone (only if mode is Bollywood Romance or Intense Drama). Return JSON with scores, overall, castingNote (one line), 3 specific notes, 1 drill, and a Take 2 direction changing one constraint.
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

    const completion = await client.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(user) },
      ],
    });

    const text = (completion.choices?.[0]?.message?.content ?? "").trim();
    if (!text) {
      return res.status(502).json({
        error: "Grading failed",
        message: "Model returned no text (empty or filtered).",
      });
    }
    const raw = safeJsonParse(text);
    const obj = normalizeGradeOutput(raw);
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
}
