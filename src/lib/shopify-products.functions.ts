import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  shopifyStorefront,
  PRODUCT_CARD_FRAGMENT,
  mapShopifyProduct,
  type MappedProduct,
} from "./shopify-storefront.server";

function buildQueryString(filters: {
  gender?: string;
  product_type?: string;
  design_style?: string;
  search?: string;
  best_seller?: boolean;
  new_drop?: boolean;
}): string {
  const parts: string[] = [];
  // gender intentionally omitted — many stores don't tag products with gender:*,
  // so we infer it from title/product_type and filter after fetch.
  if (filters.design_style) parts.push(`tag:'style:${filters.design_style}'`);
  if (filters.product_type) parts.push(`(product_type:'${filters.product_type}' OR tag:'type:${filters.product_type}')`);
  if (filters.best_seller) parts.push(`(tag:'best-seller' OR tag:'bestseller')`);
  if (filters.search) parts.push(`title:*${filters.search}*`);
  return parts.join(" AND ");
}

const LIST_QUERY = /* GraphQL */ `
  query Products($first: Int!, $query: String, $sortKey: ProductSortKeys, $reverse: Boolean) {
    products(first: $first, query: $query, sortKey: $sortKey, reverse: $reverse) {
      edges { node { ...ProductCard } }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
`;

export const listShopifyProducts = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      gender: z.string().optional(),
      product_type: z.string().optional(),
      design_style: z.string().optional(),
      collection: z.string().optional(),
      search: z.string().optional(),
      sort: z.enum(["newest", "price_asc", "price_desc", "best"]).optional(),
      best_seller: z.boolean().optional(),
      new_drop: z.boolean().optional(),
      limit: z.number().int().min(1).max(120).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const sortKey =
      data.sort === "price_asc" || data.sort === "price_desc"
        ? "PRICE"
        : data.sort === "best"
        ? "BEST_SELLING"
        : "CREATED_AT";
    const reverse = data.sort === "price_desc" || data.sort === "newest" || !data.sort;
    const queryStr = buildQueryString(data);

    const res = await shopifyStorefront<{ products: { edges: Array<{ node: any }> } }>(LIST_QUERY, {
      first: data.limit ?? 60,
      query: queryStr || null,
      sortKey,
      reverse,
    });

    let products: MappedProduct[] = res.products.edges.map((e) => mapShopifyProduct(e.node));
    if (data.new_drop) products = products.filter((p) => p.is_new_drop);
    return { products };
  });

const PRODUCT_QUERY = /* GraphQL */ `
  query Product($handle: String!) {
    product(handle: $handle) { ...ProductCard }
  }
  ${PRODUCT_CARD_FRAGMENT}
`;

const RELATED_QUERY = /* GraphQL */ `
  query Related($query: String!, $first: Int!) {
    products(first: $first, query: $query) {
      edges { node { ...ProductCard } }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
`;

export const getShopifyProductByHandle = createServerFn({ method: "POST" })
  .inputValidator(z.object({ handle: z.string().min(1) }))
  .handler(async ({ data }) => {
    const res = await shopifyStorefront<{ product: any | null }>(PRODUCT_QUERY, { handle: data.handle });
    if (!res.product) return { product: null, related: [] as MappedProduct[] };
    const product = mapShopifyProduct(res.product);

    let related: MappedProduct[] = [];
    const relQuery = product.design_style
      ? `tag:'style:${product.design_style}'`
      : product.product_type
      ? `product_type:'${product.product_type}'`
      : "";
    if (relQuery) {
      const r = await shopifyStorefront<{ products: { edges: Array<{ node: any }> } }>(RELATED_QUERY, {
        query: relQuery,
        first: 8,
      });
      related = r.products.edges
        .map((e) => mapShopifyProduct(e.node))
        .filter((p) => p.id !== product.id)
        .slice(0, 4);
    }
    return { product, related };
  });

export const getShopifyHomeData = createServerFn({ method: "GET" }).handler(async () => {
  const [all, best] = await Promise.all([
    shopifyStorefront<{ products: { edges: Array<{ node: any }> } }>(LIST_QUERY, {
      first: 24,
      query: null,
      sortKey: "CREATED_AT",
      reverse: true,
    }),
    shopifyStorefront<{ products: { edges: Array<{ node: any }> } }>(LIST_QUERY, {
      first: 12,
      query: null,
      sortKey: "BEST_SELLING",
      reverse: false,
    }),
  ]);

  const newest = all.products.edges.map((e) => mapShopifyProduct(e.node));
  const bestSellers = best.products.edges.map((e) => mapShopifyProduct(e.node));
  const featured = newest.slice(0, 8);
  const newDrops = newest.filter((p) => p.is_new_drop).slice(0, 8);

  return { featured, bestSellers, newDrops, settings: {} as Record<string, any> };
});

const FILTERS_QUERY = /* GraphQL */ `
  query Filters($first: Int!) {
    products(first: $first) {
      edges { node { productType tags } }
    }
  }
`;

export const getShopifyFilterOptions = createServerFn({ method: "GET" }).handler(async () => {
  const res = await shopifyStorefront<{ products: { edges: Array<{ node: any }> } }>(FILTERS_QUERY, { first: 100 });
  const styleSet = new Set<string>();
  const typeSet = new Set<string>();
  for (const e of res.products.edges) {
    const pt = e.node.productType;
    if (pt) typeSet.add(pt);
    for (const tag of e.node.tags ?? []) {
      const [k, v] = String(tag).split(":");
      if (k === "style" && v) styleSet.add(v.trim());
      if (k === "type" && v) typeSet.add(v.trim());
    }
  }
  return {
    styles: Array.from(styleSet).map((s) => ({ slug: s, name: s.replace(/-/g, " ") })),
    types: Array.from(typeSet).map((s) => ({ slug: s, name: s })),
    collections: [],
  };
});
