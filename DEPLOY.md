# Deploy to Vercel

1. **Push this project to GitHub** (if you haven’t already).

2. **Import the project in Vercel**
   - Go to [vercel.com](https://vercel.com) → Add New → Project.
   - Import your GitHub repo (this folder as the root).
   - Leave **Build Command** and **Output Directory** empty (static + serverless).

3. **Set environment variables (required for Voice Coach & prompts)**
   In the Vercel project go to **Settings → Environment Variables** and add:
   - **`OPENAI_API_KEY`** (required) — your OpenAI API key. Without this, prompt generation, grading, and Realtime Voice AI will not work.
   - Optional: `OPENAI_MODEL` (default: gpt-4o-mini), `REALTIME_MODEL`, `REALTIME_VOICE`, `MOCK_MODE` (set to `true` for mock-only mode).
   After adding variables, **redeploy** the project so they take effect.

4. **Deploy**
   - Deploy from the Vercel dashboard or by pushing to the connected branch.
   - Your site will be live at `https://<project>.vercel.app`. The password gate, Voice Coach, and all API routes will work there.

No need to run a separate server — Vercel runs the API routes as serverless functions.

**Data storage:** Journal entries (diary) and voice coach evaluation feedback are saved in the browser (localStorage) on the device you use. They persist across visits on that same device but are not synced to a server or other devices.
