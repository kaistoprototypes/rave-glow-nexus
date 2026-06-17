// Shopify Storefront API client + product mapping.
// Server-only: uses SHOPIFY_STOREFRONT_ACCESS_TOKEN.

const API_VERSION = "2025-07";
const SHOP_DOMAIN = "wn86jj-5f.myshopify.com";
const STOREFRONT_URL = `https://${SHOP_DOMAIN}/api/${API_VERSION}/graphql.json`;

export async function shopifyStorefront<T = any>(query: string, variables: Record<string, any> = {}): Promise<T> {
  const token = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
  if (!token) throw new Error("SHOPIFY_STOREFRONT_ACCESS_TOKEN missing");
  const res = await fetch(STOREFRONT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Shopify Storefront ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json.errors) throw new Error(`Shopify: ${json.errors.map((e: any) => e.message).join(", ")}`);
  return json.data as T;
}

export const PRODUCT_CARD_FRAGMENT = /* GraphQL */ `
  fragment ProductCard on Product {
    id
    handle
    title
    description
    productType
    vendor
    tags
    createdAt
    availableForSale
    images(first: 6) { edges { node { url altText } } }
    options { name values }
    priceRange {
      minVariantPrice { amount currencyCode }
    }
    compareAtPriceRange {
      minVariantPrice { amount currencyCode }
    }
    variants(first: 50) {
      edges {
        node {
          id
          title
          availableForSale
          price { amount currencyCode }
          compareAtPrice { amount currencyCode }
          selectedOptions { name value }
        }
      }
    }
    media(first: 8) {
      edges {
        node {
          mediaContentType
          ... on Video {
            sources { url mimeType format }
          }
        }
      }
    }
  }
`;

const DEFAULT_PALETTE = ["#39FF14", "#00E5FF", "#FF00C8"];

export type MappedProduct = {
  // Match ProductCardData + product detail page fields
  id: string;            // shopify GID
  shopify_product_id: string;
  slug: string;          // shopify handle
  name: string;
  short_description: string;
  long_description: string;
  design_story: string | null;
  price: number;
  compare_at_price: number | null;
  currency: string;
  color_palette: string[];
  design_style: string | null;
  gender: string;
  product_type: string;
  is_new_drop: boolean;
  is_best_seller: boolean;
  sizes: string[];
  colors: string[];
  sold_count: number;
  total_inventory: number;
  available_for_sale: boolean;
  gallery: string[];
  featured_image: string | null;
  video_url: string | null;
  variants: Array<{
    id: string;
    title: string;
    price: number;
    compareAtPrice: number | null;
    available: boolean;
    quantity: number | null;
    options: Record<string, string>;
  }>;
  tags: string[];
};

function tagsToMap(tags: string[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const tag of tags) {
    const idx = tag.indexOf(":");
    if (idx === -1) {
      (map["_"] ??= []).push(tag.toLowerCase());
    } else {
      const k = tag.slice(0, idx).trim().toLowerCase();
      const v = tag.slice(idx + 1).trim();
      (map[k] ??= []).push(v);
    }
  }
  return map;
}

export function mapShopifyProduct(node: any): MappedProduct {
  const tags: string[] = node.tags ?? [];
  const tm = tagsToMap(tags);
  const flat = tm["_"] ?? [];

  const palette = (tm["color"] ?? []).filter((c) => /^#[0-9a-fA-F]{6}$/.test(c));
  const variants = (node.variants?.edges ?? []).map((e: any) => {
    const v = e.node;
    const optMap: Record<string, string> = {};
    for (const o of v.selectedOptions ?? []) optMap[o.name] = o.value;
    return {
      id: v.id,
      title: v.title,
      price: Number(v.price?.amount ?? 0),
      compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice.amount) : null,
      available: !!v.availableForSale,
      quantity: null,
      options: optMap,
    };
  });

  const sizes = (node.options ?? []).find((o: any) => /size/i.test(o.name))?.values ?? [];
  const colors = (node.options ?? []).find((o: any) => /colou?r/i.test(o.name))?.values ?? [];
  const gallery = (node.images?.edges ?? []).map((e: any) => e.node.url).filter(Boolean);
  const videoEdge = (node.media?.edges ?? []).find((e: any) => e.node?.mediaContentType === "VIDEO");
  const videoUrl = videoEdge?.node?.sources?.find((s: any) => s.mimeType?.startsWith("video/"))?.url
    ?? videoEdge?.node?.sources?.[0]?.url
    ?? null;

  const createdAt = new Date(node.createdAt);
  const isNewDrop = (Date.now() - createdAt.getTime()) < 30 * 24 * 60 * 60 * 1000;

  const price = Number(node.priceRange?.minVariantPrice?.amount ?? 0);
  const compareAtRaw = node.compareAtPriceRange?.minVariantPrice?.amount;
  const compareAt = compareAtRaw ? Number(compareAtRaw) : null;

  return {
    id: node.id,
    shopify_product_id: node.id,
    slug: node.handle,
    name: node.title,
    short_description: (node.description ?? "").split("\n")[0]?.slice(0, 240) ?? "",
    long_description: node.description ?? "",
    design_story: tm["story"]?.[0] ?? null,
    price,
    compare_at_price: compareAt && compareAt > price ? compareAt : null,
    currency: node.priceRange?.minVariantPrice?.currencyCode ?? "USD",
    color_palette: palette.length >= 3 ? palette.slice(0, 3) : DEFAULT_PALETTE,
    design_style: tm["style"]?.[0] ?? null,
    gender: tm["gender"]?.[0] ?? "",
    product_type: node.productType ?? tm["type"]?.[0] ?? "",
    is_new_drop: isNewDrop,
    is_best_seller: flat.includes("best-seller") || flat.includes("bestseller") || tm["badge"]?.includes("best"),
    sizes,
    colors,
    sold_count: 0,
    total_inventory: 0,
    available_for_sale: !!node.availableForSale,
    gallery,
    featured_image: gallery[0] ?? null,
    video_url: videoUrl,
    variants,
    tags,
  };
}
