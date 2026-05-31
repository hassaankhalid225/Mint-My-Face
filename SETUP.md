# Mint My Face — Setup Guide

Configure **Google OAuth** (login / sign up) and **Stripe** (subscriptions) using the `.env` files below.

---

## 1. Google OAuth (required for auth)

### Create credentials

1. Open [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create project (or pick existing) → **Create credentials** → **OAuth client ID**
3. Application type: **Web application**
4. **Authorized JavaScript origins**
   - `http://localhost:3000`
   - `https://your-production-domain.com`
5. **Authorized redirect URIs**
   - `http://localhost:3000/api/auth/callback/google`
   - `https://your-production-domain.com/api/auth/callback/google`
6. Copy **Client ID** and **Client secret**

### OAuth consent screen

1. **APIs & Services** → **OAuth consent screen**
2. User type: External (for public app)
3. Add scopes: `email`, `profile`, `openid`
4. Add test users while in "Testing" mode

### Environment files (already created for you)

| File | Purpose |
|------|---------|
| `Backend/.env` | Stripe keys + optional Google copy |
| `Frontend/.env` | **Google login** (required) + `AUTH_SECRET` (pre-filled) |

Paste the **same** `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` into **both** files.

### Frontend `.env`

Edit `Frontend/.env` (or copy from `Frontend/.env.example` if missing):

```env
AUTH_SECRET=paste-openssl-rand-base64-32-here
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Generate `AUTH_SECRET`:

```bash
openssl rand -base64 32
```

---

## 2. Backend API

Copy `Backend/.env.example` → `Backend/.env`:

```env
CORS_ORIGINS=http://localhost:3000
FRONTEND_URL=http://localhost:3000
```

Run:

```bash
cd Backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

After Google sign-in, the frontend calls `POST /api/users/register` to create a **free** account on the backend.

---

## 3. Stripe (subscriptions & checkout)

### Dashboard setup

1. [Stripe Dashboard](https://dashboard.stripe.com/) → **Products**
2. Create products:
   - **Starter** — $2 (one-time or daily — use one-time price for now)
   - **Pro** — $5/month → recurring price
3. Copy each **Price ID** (`price_...`)

### Backend `.env`

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
```

### Webhook (production)

1. Stripe → **Developers** → **Webhooks** → Add endpoint  
   `https://your-api-domain.com/api/billing/webhook`
2. Event: `checkout.session.completed`
3. Copy signing secret → `STRIPE_WEBHOOK_SECRET`

Local testing with Stripe CLI:

```bash
stripe listen --forward-to localhost:8000/api/billing/webhook
```

Without Stripe keys, checkout uses **mock URLs** (`/pricing?checkout=mock&plan=pro`).

---

## 4. Database (Prisma)

Users are stored in **Prisma** (default SQLite `Frontend/prisma/dev.db`).

**Switch to PostgreSQL later:** change `DATABASE_URL` in `Frontend/.env` and `provider` in `prisma/schema.prisma` to `postgresql`, then run:

```bash
cd Frontend
npx prisma migrate dev
```

Commands:
```bash
npm run db:migrate   # apply migrations
npm run db:studio    # browse data
```

## 5. JWT (Frontend ↔ Backend)

- Login issues a **Bearer JWT** (7 days) via NextAuth
- `JWT_SECRET` in `Frontend/.env` must **match** `Backend/.env`
- FastAPI reads `Authorization: Bearer <token>` on protected routes

## 6. Auth pages

| URL | Purpose |
|-----|---------|
| `/login` | Email + password, or **Continue with Google** |
| `/signup` | Name, email, password, confirm — or **Sign up with Google** |

---

## 7. Run full stack

```bash
# Terminal 1 — Backend
cd Backend && venv\Scripts\activate && uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend
cd Frontend && npm run dev
```

Open http://localhost:3000/login
