import OpenAI from "openai";
import {
  toBool,
  validatePromptInput,
  validatePromptOutput,
  safeJsonParse,
  mockPrompt,
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
    const validation = validatePromptInput(body);
    if (!validation.ok) {
      return res.status(400).json({ error: "Invalid input", details: validation.details });
    }

    const { mode, duration, accent, style, difficulty } = body;

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
}
