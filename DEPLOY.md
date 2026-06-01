# Deploy Mint My Face on Vercel

## Fix 404 on `*.vercel.app`

A **404 NOT_FOUND** on Vercel usually means the **Root Directory** is wrong.

### Required Vercel settings

1. Open [Vercel Dashboard](https://vercel.com/dashboard) → your project → **Settings** → **General**
2. **Root Directory** → click **Edit** → set to: `Frontend`
3. **Save**
4. Go to **Deployments** → latest deployment → **⋯** → **Redeploy**

If Root Directory is empty, Vercel builds the repo root (no Next.js app) and the site shows 404.

### Environment variables (Vercel → Settings → Environment Variables)

| Variable | Example |
|----------|---------|
| `DATABASE_URL` | `file:./dev.db` (quick test) or Neon Postgres URL (production) |
| `AUTH_SECRET` | Random 32+ character string |
| `JWT_SECRET` | Same as `AUTH_SECRET` |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` |
| `NEXT_PUBLIC_SITE_URL` | `https://your-app.vercel.app` |
| `NEXT_PUBLIC_API_URL` | Your backend URL (Render, etc.) |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |

After adding variables, **Redeploy**.

### Google OAuth (production)

In Google Cloud Console, add:

- **Authorized JavaScript origins:** `https://your-app.vercel.app`
- **Redirect URI:** `https://your-app.vercel.app/api/auth/callback/google`

### Build command (auto)

`Frontend/package.json` runs `prisma generate && next build`. Root `vercel.json` is a fallback if Root Directory cannot be set.
