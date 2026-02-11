# Deploy to Vercel

1. **Push this project to GitHub** (if you haven’t already).

2. **Import the project in Vercel**
   - Go to [vercel.com](https://vercel.com) → Add New → Project.
   - Import your GitHub repo (this folder as the root).
   - In **Settings → General → Build & Development Settings**: set **Framework Preset** to **Other** (so Vercel doesn’t run a framework build that could omit your static files). Leave **Build Command** and **Output Directory** empty (static + serverless).

3. **Set environment variables (required for Voice Coach & prompts)**
   In the Vercel project go to **Settings → Environment Variables** and add:
   - **`OPENAI_API_KEY`** (required) — your OpenAI API key. Without this, prompt generation, grading, and Realtime Voice AI will not work.
   - Optional: `OPENAI_MODEL` (default: gpt-4o-mini), `REALTIME_MODEL`, `REALTIME_VOICE`, `MOCK_MODE` (set to `true` for mock-only mode).
   After adding variables, **redeploy** the project so they take effect.

4. **Turn off Deployment Protection for production (if you see “all text, no UI”)**
   - In Vercel: **Settings → Deployment Protection**.
   - If **Vercel Authentication** or **Password Protection** is on, requests for styles.css, app.js, and images get **401** and the page loads as plain text with no styling or images.
   - **Disable protection for Production** (or add your production domain to the allowlist) so your site loads the real CSS/JS/assets. Then do a **hard refresh** (Ctrl+Shift+R or Cmd+Shift+R) or open the site in **Incognito**.

5. **If the site still loads as plain text (no CSS/JS)**  
   Open DevTools → **Network** tab, reload the page, and check:
   - **styles.css** and **app.js**: status should be **200** and Type **css** / **script**. If you see **401** or Type **document**, Deployment Protection (or a redirect) is serving HTML for those URLs — disable Deployment Protection for Production (step 4) and set Framework Preset to **Other** (step 2). Do a **hard refresh** (Ctrl+Shift+R / Cmd+Shift+R) or use **Incognito** after fixing.

6. **Deploy**
   - Deploy from the Vercel dashboard or by pushing to the connected branch.
   - Your site will be live at `https://<project>.vercel.app`. The password gate, Voice Coach, and all API routes will work there.

No need to run a separate server — Vercel runs the API routes as serverless functions.

**Data storage:** Journal entries (diary) and voice coach evaluation feedback are saved in the browser (localStorage) on the device you use. They persist across visits on that same device but are not synced to a server or other devices.
