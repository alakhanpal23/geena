# Deploy to Vercel

1. **Push this project to GitHub** (if you haven’t already).

2. **Import the project in Vercel**
   - Go to [vercel.com](https://vercel.com) → Add New → Project.
   - Import your GitHub repo (this folder as the root).
   - Leave **Build Command** and **Output Directory** empty (static + serverless).

3. **Set environment variables**
   In the Vercel project → Settings → Environment Variables, add:
   - **`OPENAI_API_KEY`** — your OpenAI API key (required for prompt, grade, and Voice AI).
   - Optional: `OPENAI_MODEL`, `REALTIME_MODEL`, `REALTIME_VOICE`, `MOCK_MODE` (set to `true` to use mock responses only).

4. **Deploy**
   - Deploy from the Vercel dashboard or by pushing to the connected branch.
   - Your site will be live at `https://<project>.vercel.app`. The password gate, Voice Coach, and all API routes will work there.

No need to run a separate server — Vercel runs the API routes as serverless functions.
