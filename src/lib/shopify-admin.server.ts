// Shopify Admin API REST client (server-only).
// Uses SHOPIFY_ACCESS_TOKEN.

const API_VERSION = "2025-07";
const SHOP_DOMAIN = "wn86jj-5f.myshopify.com";

function adminUrl(path: string) {
  return `https://${SHOP_DOMAIN}/admin/api/${API_VERSION}/${path.replace(/^\//, "")}`;
}

export function gidToNumericId(gid: string): string {
  // gid://shopify/Product/123 -> "123"
  const m = String(gid).match(/\/(\d+)(?:\?|$)/);
  return m ? m[1] : String(gid);
}

export async function shopifyAdmin<T = any>(
  path: string,
  init: { method?: "GET" | "POST" | "PUT" | "DELETE"; body?: any } = {},
): Promise<T> {
  const token = process.env.SHOPIFY_ACCESS_TOKEN;
  if (!token) throw new Error("SHOPIFY_ACCESS_TOKEN missing");
  const res = await fetch(adminUrl(path), {
    method: init.method ?? "GET",
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Shopify Admin ${res.status}: ${text}`);
  return (text ? JSON.parse(text) : {}) as T;
}
