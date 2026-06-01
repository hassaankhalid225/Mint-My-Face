# Deploy Mint My Face on Vercel

## Fix build error: "No Next.js version detected"

This happens when **Root Directory** is wrong or a root `vercel.json` runs `cd Frontend` while Vercel still looks for `package.json` at the repo root.

### Required Vercel settings (do this first)

1. [Vercel Dashboard](https://vercel.com/dashboard) → **mint-my-face** → **Settings** → **General**
2. **Root Directory** → **Edit** → type exactly: `Frontend`
3. Confirm Vercel shows: *"The directory within your project where your code is located"*
4. **Save**
5. **Settings** → **Build & Development Settings** → reset overrides if any:
   - **Framework Preset:** Next.js
   - **Build Command:** leave default (or `prisma generate && next build`)
   - **Install Command:** leave default (`npm install`)
   - **Output Directory:** leave default (empty)
6. **Deployments** → **Redeploy**

Do **not** use a root-level `vercel.json` with `cd Frontend` — only `Frontend/vercel.json` is used when Root Directory is `Frontend`.

### Environment variables (Settings → Environment Variables)

| Variable | Example |
|----------|---------|
| `DATABASE_URL` | Neon **pooled** connection string (`?sslmode=require`) |
| `DIRECT_URL` | Neon **direct** connection string (no `-pooler` in host; for migrations) |
| `AUTH_SECRET` | Random 32+ character string |
| `JWT_SECRET` | Same as `AUTH_SECRET` |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` |
| `NEXT_PUBLIC_SITE_URL` | `https://your-app.vercel.app` |
| `NEXT_PUBLIC_API_URL` | Your backend URL (Render, etc.) |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |

### Google OAuth (production)

In Google Cloud Console, add:

- **Authorized JavaScript origins:** `https://your-app.vercel.app`
- **Redirect URI:** `https://your-app.vercel.app/api/auth/callback/google`

After adding variables, **Redeploy**.
