import { toBool, validateRealtimeTokenInput } from "../lib/shared.js";

const MOCK_MODE = toBool(process.env.MOCK_MODE);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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

    const body = req.body ?? {};
    const validation = validateRealtimeTokenInput(body);
    if (!validation.ok) {
      return res.status(400).json({ error: "Invalid input", details: validation.details });
    }

    const { mode, duration, difficulty } = body;

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

    // Use Realtime Beta sessions endpoint (returns client_secret.value + client_secret.expires_at)
    const payload = {
      model: REALTIME_MODEL,
      modalities: ["audio", "text"],
      instructions,
      voice: REALTIME_VOICE,
      input_audio_format: "pcm16",
      output_audio_format: "pcm16",
      turn_detection: {
        type: "server_vad",
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500,
      },
    };

    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = await r.json().catch(() => ({}));
    if (!r.ok) {
      const openaiMsg = json?.error?.message || json?.error?.code || `HTTP ${r.status}`;
      return res.status(502).json({
        error: "Failed to create Realtime client secret",
        message: openaiMsg,
        details: [openaiMsg],
      });
    }

    // Support both top-level and nested client_secret response shapes
    const value =
      json?.value ??
      json?.client_secret?.value ??
      (typeof json?.client_secret === "string" ? json.client_secret : null);
    const expiresAt =
      json?.expires_at ?? json?.client_secret?.expires_at ?? json?.expires_at_unix;

    if (!value || !expiresAt) {
      const keys = typeof json === "object" && json !== null ? Object.keys(json).join(", ") : "none";
      return res.status(502).json({
        error: "Realtime token response missing client_secret",
        message: `OpenAI returned a response but it had no value/expires_at (or client_secret.value/expires_at). Your account may need Realtime API access, or the API response format may have changed. Response keys: ${keys}`,
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
}
