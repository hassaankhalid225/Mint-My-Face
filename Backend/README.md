# Mint My Face Backend

FastAPI service for designs, watermarked previews, subscription plans, and HD downloads.

## Setup

```bash
cd Backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Docs: http://localhost:8000/docs

## Environment

| Variable | Description |
|----------|-------------|
| `CORS_ORIGINS` | Comma-separated origins (default `http://localhost:3000`) |
| `FRONTEND_URL` | Frontend base URL for Stripe success/cancel redirects |
| `HD_PRICE_CENTS` | One-time per-design HD price (default `499`) |
| `STRIPE_SECRET_KEY` | Stripe secret key; omit for mock checkout URLs |

Copy `.env.example` to `.env` and adjust as needed.

## Plans (in-memory)

| Plan | Daily images | HD download |
|------|--------------|-------------|
| Free | 1 | No (standard ~480p watermarked only) |
| Starter ($2/day) | 5 | No |
| Pro ($5/month) | Unlimited | Yes, full resolution, no watermark |

Send the user email on authenticated requests: header `X-User-Email`.

## API

- `POST /api/users/register` — `{ email, name?, provider? }` after Google OAuth (creates free account)
- `GET /api/users/me?email=` — plan and daily image usage
- `POST /api/billing/webhook` — Stripe webhook (activates plan after payment)
- `POST /api/billing/checkout` — `{ plan, email }` → Stripe or mock URL
- `POST /api/billing/activate` — `{ plan, email }` — activate after mock/Stripe success
- `POST /api/designs` — upload image (optional `X-User-Email` for limits)
- `GET /api/designs/{id}/preview` — watermarked preview
- `GET /api/designs/{id}/preview-standard` — ~480p watermarked PNG
- `POST /api/checkout/{id}` — mock per-design payment intent
- `POST /api/checkout/confirm/{secret}` — confirm per-design payment
- `GET /api/downloads/{id}` — HD PNG (Pro plan or paid design; `X-User-Email`)

Frontend: `NEXT_PUBLIC_API_URL=http://localhost:8000`
