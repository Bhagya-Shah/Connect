import "server-only";
import crypto from "crypto";

export const paymentsLive = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

async function rp(path: string, body?: unknown) {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.description || "Razorpay request failed");
  return json;
}

/** Order for a client paying a nutritionist. With Route, the nutritionist's share goes straight to their linked account. */
export function createOrder(opts: { amountRupees: number; feeRupees: number; receipt: string; linkedAccount?: string | null; notes?: Record<string, string> }) {
  const body: Record<string, unknown> = { amount: opts.amountRupees * 100, currency: "INR", receipt: opts.receipt, notes: opts.notes };
  if (opts.linkedAccount) {
    body.transfers = [{ account: opts.linkedAccount, amount: (opts.amountRupees - opts.feeRupees) * 100, currency: "INR", on_hold: 0 }];
  }
  return rp("/orders", body);
}

export function createSubscription(planId: string, notes: Record<string, string>) {
  return rp("/subscriptions", { plan_id: planId, total_count: 120, customer_notify: 1, notes });
}

export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
  const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqual(expected, signature);
}
export function verifySubscriptionSignature(paymentId: string, subscriptionId: string, signature: string) {
  const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!).update(`${paymentId}|${subscriptionId}`).digest("hex");
  return safeEqual(expected, signature);
}
export function verifyWebhook(raw: string, signature: string) {
  const expected = crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET || "").update(raw).digest("hex");
  return safeEqual(expected, signature);
}
function safeEqual(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b || "");
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function fetchSubscription(id: string) {
  return rp(`/subscriptions/${id}`);
}
