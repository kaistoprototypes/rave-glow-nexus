// Server-only Yoycol OpenAPI v4 client (HMAC-SHA256 signed).
// Never import this from client code.
import crypto from "crypto";

const BASE_URL = "https://www.yoycol.com";
const ALGO = "HmacSHA256";
const VERSION = "4.0";

function nonce(len = 32) {
  return crypto.randomBytes(24).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, len).padEnd(len, "0");
}

function buildSignatureData(opts: {
  method: string;
  path: string;
  timestamp: string;
  nonce: string;
  accessKey: string;
  params: Record<string, string | number | undefined>;
}) {
  const sorted = Object.keys(opts.params)
    .filter((k) => opts.params[k] !== undefined && opts.params[k] !== "")
    .sort();
  const paramStr = sorted.map((k) => `${k}=${opts.params[k]}`).join("&");
  let data =
    `method=${opts.method}\n` +
    `path=${opts.path}\n` +
    `timestamp=${opts.timestamp}\n` +
    `nonce=${opts.nonce}\n` +
    `accessKey=${opts.accessKey}\n` +
    `algorithm=${ALGO}\n` +
    `version=${VERSION}`;
  if (paramStr) data += `\nparams=${paramStr}`;
  return data;
}

export type YoycolResponse<T = unknown> = {
  code: string;
  msg: string;
  data: T;
};

export async function yoycolFetch<T = unknown>(opts: {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  path: string; // e.g. "/api/2025/open/v4/catalog/products"
  query?: Record<string, string | number | undefined>;
  body?: unknown;
}): Promise<YoycolResponse<T>> {
  const accessKey = process.env.YOYCOL_ACCESS_KEY;
  const secretKey = process.env.YOYCOL_SECRET_KEY;
  if (!accessKey || !secretKey) {
    throw new Error("Yoycol credentials missing. Set YOYCOL_ACCESS_KEY and YOYCOL_SECRET_KEY.");
  }
  const method = (opts.method ?? "GET").toUpperCase();
  const timestamp = String(Date.now());
  const n = nonce();
  const params = opts.query ?? {};

  const signatureData = buildSignatureData({
    method,
    path: opts.path,
    timestamp,
    nonce: n,
    accessKey,
    params,
  });
  const signature = crypto.createHmac("sha256", secretKey).update(signatureData).digest("base64");

  const qs = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== "")
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(String(params[k]))}`)
    .join("&");
  const url = `${BASE_URL}${opts.path}${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-API-Access-Key": accessKey,
      "X-API-Timestamp": timestamp,
      "X-API-Nonce": n,
      "X-API-Algorithm": ALGO,
      "X-API-Version": VERSION,
      "X-API-Signature": signature,
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  let json: YoycolResponse<T>;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Yoycol non-JSON response (${res.status}): ${text.slice(0, 300)}`);
  }
  if (!res.ok) {
    throw new Error(`Yoycol HTTP ${res.status}: ${json?.msg ?? text.slice(0, 200)}`);
  }
  return json;
}
