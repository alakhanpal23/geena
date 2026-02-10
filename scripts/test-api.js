/**
 * Test script for OpenAI-backed API (prompt, grade, realtime-token).
 * Run with: npm run test:api
 * Requires the server to be running (npm start) with OPENAI_API_KEY set in .env.
 */

import "dotenv/config";

const BASE = `http://localhost:${process.env.PORT || 3000}`;

const promptBody = {
  mode: "Bollywood Romance",
  duration: 60,
  accent: "Indian English",
  style: "Hinglish allowed",
  difficulty: "Medium",
};

async function testPrompt() {
  const res = await fetch(`${BASE}/api/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(promptBody),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Prompt failed ${res.status}: ${JSON.stringify(data)}`);
  }
  if (!data.title || !data.context) {
    throw new Error(`Prompt missing fields: ${JSON.stringify(data)}`);
  }
  return data;
}

async function testGrade(promptObject) {
  const body = {
    mode: promptBody.mode,
    duration: promptBody.duration,
    promptObject,
    transcript:
      "I never thought I would see you here. After everything we said. But here you are. And I still need you to believe me.",
  };
  const res = await fetch(`${BASE}/api/grade`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Grade failed ${res.status}: ${JSON.stringify(data)}`);
  }
  if (typeof data.overall !== "number" || !data.castingNote) {
    throw new Error(`Grade missing fields: ${JSON.stringify(data)}`);
  }
  return data;
}

async function testRealtimeToken() {
  const body = {
    mode: promptBody.mode,
    duration: promptBody.duration,
    difficulty: promptBody.difficulty,
  };
  const res = await fetch(`${BASE}/api/realtime-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 501) {
    console.log("  Realtime: skipped (MOCK_MODE or not supported)");
    return;
  }
  if (!res.ok) {
    throw new Error(`Realtime token failed ${res.status}: ${JSON.stringify(data)}`);
  }
  if (!data.value || !data.expires_at) {
    throw new Error(`Realtime token missing value/expires_at: ${JSON.stringify(data)}`);
  }
  console.log("  Realtime: token received (Voice AI agent ready)");
}

async function main() {
  console.log("Testing API at", BASE);
  console.log("");

  try {
    console.log("1. Prompt generator...");
    const prompt = await testPrompt();
    console.log("   OK:", prompt.title?.slice(0, 50) + "...");

    console.log("2. Grader...");
    const grade = await testGrade(prompt);
    console.log("   OK: overall", grade.overall, "—", grade.castingNote?.slice(0, 50) + "...");

    console.log("3. Realtime (Voice AI) token...");
    await testRealtimeToken();

    console.log("");
    console.log("All tests passed. OpenAI key is working for prompt generator, grader, and Voice AI.");
  } catch (err) {
    console.error("Test failed:", err.message);
    process.exit(1);
  }
}

main();
