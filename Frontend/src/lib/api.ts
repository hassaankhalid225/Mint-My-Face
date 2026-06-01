const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return typeof data.detail === "string" ? data.detail : res.statusText;
  } catch {
    return res.statusText || "Request failed";
  }
}

let cachedToken: string | null = null;
let tokenFetchedAt = 0;

/** JWT for FastAPI — same secret as Backend AUTH_SECRET / JWT_SECRET */
export async function getAccessToken(): Promise<string | null> {
  if (cachedToken && Date.now() - tokenFetchedAt < 5 * 60 * 1000) {
    return cachedToken;
  }
  try {
    const res = await fetch("/api/auth/access-token");
    if (!res.ok) return null;
    const data = await res.json();
    cachedToken = data.accessToken ?? null;
    tokenFetchedAt = Date.now();
    return cachedToken;
  } catch {
    return null;
  }
}

export function clearAccessTokenCache() {
  cachedToken = null;
  tokenFetchedAt = 0;
}

async function authHeaders(email?: string | null): Promise<HeadersInit> {
  const token = await getAccessToken();
  if (token) return { Authorization: `Bearer ${token}` };
  if (email) return { "X-User-Email": email };
  return {};
}

export interface DesignCreateResult {
  design_id: string;
  message: string;
  preview_url: string;
}

export interface DesignStatus {
  design_id: string;
  paid: boolean;
  preview_url: string;
  hd_price_cents: number;
  can_download_hd: boolean;
}

export interface PaymentIntent {
  client_secret: string;
  design_id: string;
  amount_cents: number;
  currency: string;
}

export interface PaymentConfirm {
  status: string;
  design_id: string;
  download_url: string;
}

export interface UserPlan {
  email: string;
  plan: string;
  mint_count_today: number;
  daily_limit: number | null;
  hd_access: boolean;
}

export async function getUserPlan(email: string): Promise<UserPlan> {
  const res = await fetch(
    `${API_BASE}/api/users/me?email=${encodeURIComponent(email)}`,
    { headers: await authHeaders(email) },
  );
  if (!res.ok) throw new ApiError(await parseError(res), res.status);
  return res.json();
}

export async function startPlanCheckout(
  plan: string,
  email: string,
): Promise<{ checkout_url: string; plan: string }> {
  const res = await fetch(`${API_BASE}/api/billing/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeaders(email)),
    },
    body: JSON.stringify({ plan, email }),
  });
  if (!res.ok) throw new ApiError(await parseError(res), res.status);
  return res.json();
}

export async function activatePlan(plan: string, email: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/billing/activate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeaders(email)),
    },
    body: JSON.stringify({ plan, email }),
  });
  if (!res.ok) throw new ApiError(await parseError(res), res.status);
}

export function standardPreviewUrl(designId: string): string {
  return `${API_BASE}/api/designs/${designId}/preview-standard`;
}

export async function uploadCanvasSnapshot(imageBlob: Blob): Promise<void> {
  const formData = new FormData();
  formData.append("image", imageBlob, "one-dollar-photo.png");

  const res = await fetch(`${API_BASE}/api/uploads/canvas`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new ApiError(await parseError(res), res.status);
}

export async function saveDesign(
  imageBlob: Blob,
  _userEmail?: string | null,
): Promise<DesignCreateResult> {
  const formData = new FormData();
  formData.append("image", imageBlob, "one-dollar-photo.png");

  const res = await fetch(`${API_BASE}/api/designs`, {
    method: "POST",
    headers: await authHeaders(_userEmail),
    body: formData,
  });

  if (!res.ok) throw new ApiError(await parseError(res), res.status);
  return res.json();
}

export async function getDesignStatus(designId: string): Promise<DesignStatus> {
  const res = await fetch(`${API_BASE}/api/designs/${designId}`);
  if (!res.ok) throw new ApiError(await parseError(res), res.status);
  return res.json();
}

export function previewImageUrl(previewPath: string): string {
  if (previewPath.startsWith("http")) return previewPath;
  return `${API_BASE}${previewPath}`;
}

export function hdDownloadUrl(designId: string): string {
  return `${API_BASE}/api/downloads/${designId}`;
}

export async function downloadHdFile(designId: string): Promise<Blob> {
  const res = await fetch(hdDownloadUrl(designId), {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new ApiError(await parseError(res), res.status);
  return res.blob();
}

export async function createCheckout(designId: string): Promise<PaymentIntent> {
  const res = await fetch(`${API_BASE}/api/checkout/${designId}`, {
    method: "POST",
    headers: await authHeaders(),
  });
  if (!res.ok) throw new ApiError(await parseError(res), res.status);
  return res.json();
}

export async function confirmPayment(clientSecret: string): Promise<PaymentConfirm> {
  const res = await fetch(`${API_BASE}/api/checkout/confirm/${clientSecret}`, {
    method: "POST",
    headers: await authHeaders(),
  });
  if (!res.ok) throw new ApiError(await parseError(res), res.status);
  return res.json();
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

export function formatPrice(cents: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export { API_BASE };
