import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, X, Upload, Trash2, GripVertical } from "lucide-react";
import {
  getShopifyProductForAdmin,
  getShopifyProductByHandleForAdmin,
  updateShopifyProductBasics,
  updateShopifyVariantPricing,
  addShopifyProductImage,
  deleteShopifyProductImage,
  reorderShopifyProductImages,
} from "@/lib/shopify-admin.functions";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  open: boolean;
  onClose: () => void;
  // Provide either productId (numeric or GID) or handle.
  productId?: string;
  handle?: string;
};

type ShopifyVariant = {
  id: number;
  title: string;
  price: string;
  compare_at_price: string | null;
};

type ShopifyImage = { id: number; src: string; alt: string | null; position: number };

type ShopifyProduct = {
  id: number;
  title: string;
  body_html: string | null;
  product_type: string | null;
  tags: string;
  status: "active" | "draft" | "archived";
  variants: ShopifyVariant[];
  images: ShopifyImage[];
};

export function ProductEditDrawer({ open, onClose, productId, handle }: Props) {
  const qc = useQueryClient();
  const getById = useServerFn(getShopifyProductForAdmin);
  const getByHandle = useServerFn(getShopifyProductByHandleForAdmin);
  const updateBasicsFn = useServerFn(updateShopifyProductBasics);
  const updateVariantFn = useServerFn(updateShopifyVariantPricing);
  const addImageFn = useServerFn(addShopifyProductImage);
  const deleteImageFn = useServerFn(deleteShopifyProductImage);
  const reorderFn = useServerFn(reorderShopifyProductImages);

  const [tab, setTab] = useState<"basics" | "pricing" | "images">("basics");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<ShopifyProduct | null>(null);

  // form state
  const [title, setTitle] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [productType, setProductType] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState<"active" | "draft" | "archived">("draft");
  const [variants, setVariants] = useState<ShopifyVariant[]>([]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      try {
        const res = productId
          ? await getById({ data: { productId } })
          : await getByHandle({ data: { handle: handle! } });
        const p = res.product as ShopifyProduct | null;
        if (!p) throw new Error("Product not found");
        setProduct(p);
        setTitle(p.title ?? "");
        setBodyHtml(p.body_html ?? "");
        setProductType(p.product_type ?? "");
        setTags(p.tags ?? "");
        setStatus(p.status);
        setVariants(p.variants ?? []);
      } catch (e: any) {
        toast.error(e.message);
        onClose();
      } finally {
        setLoading(false);
      }
    })();
  }, [open, productId, handle]);

  if (!open) return null;

  const reload = async () => {
    if (!product) return;
    const res = await getById({ data: { productId: String(product.id) } });
    const p = res.product as ShopifyProduct;
    setProduct(p);
    setVariants(p.variants);
  };

  const invalidateStorefront = () => {
    qc.invalidateQueries({ queryKey: ["shopify-product"] });
    qc.invalidateQueries({ queryKey: ["shopify-products"] });
    qc.invalidateQueries({ queryKey: ["shopify-home"] });
  };

  const saveBasics = async () => {
    if (!product) return;
    setSaving(true);
    try {
      await updateBasicsFn({
        data: {
          productId: String(product.id),
          title,
          body_html: bodyHtml,
          product_type: productType,
          tags,
          status,
        },
      });
      toast.success("Product updated");
      invalidateStorefront();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const saveVariant = async (v: ShopifyVariant) => {
    setSaving(true);
    try {
      await updateVariantFn({
        data: {
          variantId: String(v.id),
          price: v.price,
          compare_at_price: v.compare_at_price || null,
        },
      });
      toast.success(`Saved ${v.title}`);
      invalidateStorefront();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (!product) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      toast.error("Use JPG, PNG, or WebP");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Max 10 MB");
      return;
    }
    setSaving(true);
    try {
      const path = `shopify/${product.id}/${Date.now()}-${file.name.replace(/[^a-z0-9.\-]/gi, "_")}`;
      const { error: upErr } = await supabase.storage.from("product-images").upload(path, file, {
        contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
      await addImageFn({ data: { productId: String(product.id), src: pub.publicUrl, alt: title } });
      toast.success("Image added");
      await reload();
      invalidateStorefront();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!product) return;
    if (!confirm("Delete this image?")) return;
    setSaving(true);
    try {
      await deleteImageFn({ data: { productId: String(product.id), imageId: String(imageId) } });
      toast.success("Image removed");
      await reload();
      invalidateStorefront();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const moveImage = async (from: number, to: number) => {
    if (!product) return;
    const next = [...product.images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setProduct({ ...product, images: next });
    try {
      await reorderFn({
        data: {
          productId: String(product.id),
          orderedImageIds: next.map((i) => String(i.id)),
        },
      });
      invalidateStorefront();
    } catch (e: any) {
      toast.error(e.message);
      await reload();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal
      className="fixed inset-0 z-[60] flex items-stretch justify-end bg-black/70"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl h-full overflow-y-auto bg-card border-l border-border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card/95 backdrop-blur p-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-[color:var(--magenta)]">Edit product</p>
            <h2 className="font-display text-lg font-bold truncate">{title || "Loading…"}</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-muted" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </header>

        <nav className="flex gap-1 border-b border-border p-2">
          {(["basics", "pricing", "images"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-xs uppercase tracking-widest ${tab === t ? "bg-[color:var(--lime)] text-black font-bold" : "text-foreground/70 hover:text-foreground"}`}
            >
              {t}
            </button>
          ))}
        </nav>

        {loading ? (
          <div className="p-10 text-center text-muted-foreground">
            <Loader2 className="mx-auto h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {tab === "basics" && (
              <div className="space-y-3">
                <Field label="Title">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-md bg-input/60 border border-border px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Description (HTML allowed)">
                  <textarea
                    value={bodyHtml}
                    onChange={(e) => setBodyHtml(e.target.value)}
                    rows={10}
                    className="w-full rounded-md bg-input/60 border border-border px-3 py-2 text-sm font-mono"
                  />
                </Field>
                <Field label="Product type">
                  <input
                    value={productType}
                    onChange={(e) => setProductType(e.target.value)}
                    className="w-full rounded-md bg-input/60 border border-border px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Tags (comma-separated)">
                  <input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="gender:men, style:cosmic, type:hoodie"
                    className="w-full rounded-md bg-input/60 border border-border px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Status">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="rounded-md bg-input/60 border border-border px-3 py-2 text-sm"
                  >
                    <option value="active">active</option>
                    <option value="draft">draft</option>
                    <option value="archived">archived</option>
                  </select>
                </Field>
                <button
                  onClick={saveBasics}
                  disabled={saving}
                  className="btn-neon rounded-full px-5 py-2 text-xs inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                  Save basics
                </button>
              </div>
            )}

            {tab === "pricing" && (
              <div className="space-y-3">
                {variants.length === 0 && (
                  <p className="text-sm text-muted-foreground">No variants.</p>
                )}
                {variants.map((v, idx) => (
                  <div key={v.id} className="rounded-xl border border-border/40 p-3 space-y-2">
                    <div className="text-sm font-semibold">{v.title}</div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Price">
                        <input
                          value={v.price}
                          onChange={(e) => {
                            const next = [...variants];
                            next[idx] = { ...v, price: e.target.value };
                            setVariants(next);
                          }}
                          className="w-full rounded-md bg-input/60 border border-border px-3 py-2 text-sm"
                        />
                      </Field>
                      <Field label="Compare-at">
                        <input
                          value={v.compare_at_price ?? ""}
                          onChange={(e) => {
                            const next = [...variants];
                            next[idx] = { ...v, compare_at_price: e.target.value };
                            setVariants(next);
                          }}
                          className="w-full rounded-md bg-input/60 border border-border px-3 py-2 text-sm"
                        />
                      </Field>
                    </div>
                    <button
                      onClick={() => saveVariant(v)}
                      disabled={saving}
                      className="btn-outline-neon rounded-full px-4 py-1.5 text-[10px] uppercase font-bold disabled:opacity-50"
                    >
                      Save variant
                    </button>
                  </div>
                ))}
              </div>
            )}

            {tab === "images" && product && (
              <div className="space-y-3">
                <label className="block">
                  <div className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/60 p-6 text-sm text-muted-foreground hover:border-[color:var(--cyan)] cursor-pointer">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Upload image (JPG / PNG / WebP, up to 10 MB)
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload(f);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {product.images.map((img, i) => (
                    <div key={img.id} className="relative group rounded-xl overflow-hidden border border-border/40 bg-white">
                      <img src={img.src} alt={img.alt ?? ""} className="aspect-square w-full object-contain" />
                      <div className="absolute inset-x-1 top-1 flex items-center justify-between gap-1 opacity-0 group-hover:opacity-100 transition">
                        <div className="flex gap-1">
                          <button
                            onClick={() => moveImage(i, Math.max(0, i - 1))}
                            disabled={i === 0}
                            className="rounded bg-black/70 text-white p-1 text-[10px] disabled:opacity-30"
                            aria-label="Move left"
                          >
                            ←
                          </button>
                          <button
                            onClick={() => moveImage(i, Math.min(product.images.length - 1, i + 1))}
                            disabled={i === product.images.length - 1}
                            className="rounded bg-black/70 text-white p-1 text-[10px] disabled:opacity-30"
                            aria-label="Move right"
                          >
                            →
                          </button>
                        </div>
                        <button
                          onClick={() => handleDeleteImage(img.id)}
                          className="rounded bg-destructive/90 text-white p-1"
                          aria-label="Delete image"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white flex items-center gap-1">
                        <GripVertical className="h-2.5 w-2.5" />#{i + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
