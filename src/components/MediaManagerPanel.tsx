import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  adminListProducts,
  adminUpdateProduct,
  adminListCategories,
  adminUpdateCategory,
} from "@/lib/admin.functions";
import { toast } from "sonner";
import { Upload, Trash2, Star, Film, Image as ImageIcon, Loader2 } from "lucide-react";

const BUCKET_PRODUCT = "product-images";
const BUCKET_SITE = "site-media";

async function uploadFile(bucket: string, folder: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

async function deleteByUrl(bucket: string, url: string) {
  // public URL pattern: .../object/public/<bucket>/<path>
  const marker = `/object/public/${bucket}/`;
  const i = url.indexOf(marker);
  if (i < 0) return;
  const path = url.slice(i + marker.length);
  await supabase.storage.from(bucket).remove([path]);
}

export function MediaManagerPanel() {
  const qc = useQueryClient();
  const listProducts = useServerFn(adminListProducts);
  const updateProduct = useServerFn(adminUpdateProduct);
  const listCategories = useServerFn(adminListCategories);
  const updateCategory = useServerFn(adminUpdateCategory);

  const { data: prods } = useQuery({
    queryKey: ["admin-media-products"],
    queryFn: () => listProducts({ data: {} }),
  });
  const { data: cats } = useQuery({
    queryKey: ["admin-media-categories"],
    queryFn: () => listCategories(),
  });

  const [tab, setTab] = useState<"products" | "collections">("products");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const products = prods?.products ?? [];
  const collections = (cats?.categories ?? []).filter((c: any) => c.kind === "collection");

  const selectedProduct = products.find((p: any) => p.id === selectedId);
  const selectedCollection = collections.find((c: any) => c.id === selectedId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-black uppercase tracking-tight">Media manager</h2>
          <p className="text-xs text-muted-foreground">Upload, replace, and delete product images and MP4 hero videos.</p>
        </div>
        <nav className="flex gap-1 rounded-full glass p-1">
          {(["products", "collections"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setSelectedId(null); }}
              className={`rounded-full px-4 py-2 text-xs uppercase tracking-widest ${tab === t ? "bg-[color:var(--cyan)] text-black font-bold" : "text-foreground/70 hover:text-foreground"}`}
            >
              {t}
            </button>
          ))}
        </nav>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="card-glow rounded-2xl p-2 max-h-[600px] overflow-y-auto">
          {tab === "products" && products.map((p: any) => (
            <button
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${selectedId === p.id ? "bg-[color:var(--lime)]/15 text-[color:var(--lime)]" : "hover:bg-white/5"}`}
            >
              <span className="truncate flex-1">{p.name}</span>
              {(p.gallery?.length ?? 0) > 0 && <ImageIcon className="h-3 w-3 opacity-50" />}
              {p.video_url && <Film className="h-3 w-3 opacity-50" />}
            </button>
          ))}
          {tab === "collections" && collections.map((c: any) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${selectedId === c.id ? "bg-[color:var(--cyan)]/15 text-[color:var(--cyan)]" : "hover:bg-white/5"}`}
            >
              <span className="truncate flex-1">{c.name}</span>
              {c.image_url && <ImageIcon className="h-3 w-3 opacity-50" />}
              {c.video_url && <Film className="h-3 w-3 opacity-50" />}
            </button>
          ))}
          {tab === "collections" && collections.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">No collections defined.</p>
          )}
        </aside>

        <section className="card-glow rounded-2xl p-5">
          {!selectedId && (
            <div className="text-sm text-muted-foreground text-center py-12">
              Pick {tab === "products" ? "a product" : "a collection"} on the left to manage its media.
            </div>
          )}

          {tab === "products" && selectedProduct && (
            <ProductMediaEditor
              key={selectedProduct.id}
              product={selectedProduct}
              onSave={async (patch) => {
                await updateProduct({ data: { id: selectedProduct.id, patch } });
                qc.invalidateQueries({ queryKey: ["admin-media-products"] });
                qc.invalidateQueries({ queryKey: ["admin-products"] });
                qc.invalidateQueries({ queryKey: ["home"] });
                qc.invalidateQueries({ queryKey: ["product", selectedProduct.slug] });
              }}
            />
          )}

          {tab === "collections" && selectedCollection && (
            <CollectionMediaEditor
              key={selectedCollection.id}
              collection={selectedCollection}
              onSave={async (patch) => {
                await updateCategory({ data: { id: selectedCollection.id, patch } });
                qc.invalidateQueries({ queryKey: ["admin-media-categories"] });
              }}
            />
          )}
        </section>
      </div>
    </div>
  );
}

function ProductMediaEditor({ product, onSave }: { product: any; onSave: (patch: any) => Promise<void> }) {
  const [gallery, setGallery] = useState<string[]>(product.gallery ?? []);
  const [featured, setFeatured] = useState<string | null>(product.featured_image ?? null);
  const [video, setVideo] = useState<string | null>(product.video_url ?? null);
  const [busy, setBusy] = useState(false);
  const imgInput = useRef<HTMLInputElement>(null);
  const vidInput = useRef<HTMLInputElement>(null);

  const persist = async (next: Partial<{ gallery: string[]; featured_image: string | null; video_url: string | null }>) => {
    try {
      await onSave(next);
      toast.success("Media saved");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) {
        if (!f.type.startsWith("image/")) { toast.error(`Skipping ${f.name}: not an image`); continue; }
        const url = await uploadFile(BUCKET_PRODUCT, `products/${product.id}`, f);
        urls.push(url);
      }
      const nextGallery = [...gallery, ...urls];
      const nextFeatured = featured ?? urls[0] ?? null;
      setGallery(nextGallery);
      setFeatured(nextFeatured);
      await persist({ gallery: nextGallery, featured_image: nextFeatured });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
      if (imgInput.current) imgInput.current.value = "";
    }
  };

  const handleVideoUpload = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    if (!f.type.startsWith("video/")) { toast.error("Please upload an MP4/video file"); return; }
    setBusy(true);
    try {
      if (video) await deleteByUrl(BUCKET_PRODUCT, video);
      const url = await uploadFile(BUCKET_PRODUCT, `products/${product.id}/video`, f);
      setVideo(url);
      await persist({ video_url: url });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
      if (vidInput.current) vidInput.current.value = "";
    }
  };

  const removeImage = async (url: string) => {
    if (!confirm("Remove this image?")) return;
    const nextGallery = gallery.filter((u) => u !== url);
    const nextFeatured = featured === url ? (nextGallery[0] ?? null) : featured;
    setGallery(nextGallery);
    setFeatured(nextFeatured);
    await persist({ gallery: nextGallery, featured_image: nextFeatured });
    deleteByUrl(BUCKET_PRODUCT, url).catch(() => {});
  };

  const makePrimary = async (url: string) => {
    setFeatured(url);
    await persist({ featured_image: url });
  };

  const removeVideo = async () => {
    if (!video) return;
    if (!confirm("Remove the hero video?")) return;
    const old = video;
    setVideo(null);
    await persist({ video_url: null });
    deleteByUrl(BUCKET_PRODUCT, old).catch(() => {});
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-display text-xl font-bold uppercase tracking-widest">{product.name}</h3>
          <p className="text-xs text-muted-foreground">{gallery.length} image{gallery.length === 1 ? "" : "s"}{video ? " · hero video" : ""}</p>
        </div>
        {busy && <Loader2 className="h-4 w-4 animate-spin text-[color:var(--cyan)]" />}
      </header>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold uppercase tracking-widest text-[color:var(--lime)]">Design images</h4>
          <label className="btn-outline-neon rounded-full px-3 py-1.5 text-[10px] cursor-pointer inline-flex items-center gap-1">
            <Upload className="h-3 w-3" /> Add images
            <input ref={imgInput} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImageUpload(e.target.files)} />
          </label>
        </div>
        {gallery.length === 0 && <p className="text-xs text-muted-foreground py-4">No images yet. Upload to start.</p>}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {gallery.map((url) => (
            <div key={url} className="relative group rounded-xl overflow-hidden border border-border/40 aspect-square bg-card/40">
              <img src={url} alt="" className="h-full w-full object-cover" />
              {featured === url && (
                <span className="absolute top-1 left-1 rounded-full bg-[color:var(--lime)] text-black text-[9px] font-bold uppercase px-2 py-0.5 flex items-center gap-1">
                  <Star className="h-2.5 w-2.5" /> Primary
                </span>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1 p-2">
                {featured !== url && (
                  <button onClick={() => makePrimary(url)} className="rounded-full bg-[color:var(--lime)] text-black px-2 py-1 text-[10px] font-bold uppercase">Set primary</button>
                )}
                <button onClick={() => removeImage(url)} className="rounded-full bg-destructive/80 text-destructive-foreground p-1.5" aria-label="Delete">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold uppercase tracking-widest text-[color:var(--magenta)]">Hero video (MP4)</h4>
          <label className="btn-outline-neon rounded-full px-3 py-1.5 text-[10px] cursor-pointer inline-flex items-center gap-1">
            <Upload className="h-3 w-3" /> {video ? "Replace" : "Upload"} video
            <input ref={vidInput} type="file" accept="video/mp4,video/*" className="hidden" onChange={(e) => handleVideoUpload(e.target.files)} />
          </label>
        </div>
        {video ? (
          <div className="rounded-xl overflow-hidden border border-border/40 bg-card/40 relative max-w-md">
            <video src={video} controls muted className="w-full h-auto" />
            <button onClick={removeVideo} className="absolute top-2 right-2 rounded-full bg-destructive/80 text-destructive-foreground p-1.5" aria-label="Delete video">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No hero video set.</p>
        )}
      </div>
    </div>
  );
}

function CollectionMediaEditor({ collection, onSave }: { collection: any; onSave: (patch: any) => Promise<void> }) {
  const [image, setImage] = useState<string | null>(collection.image_url ?? null);
  const [video, setVideo] = useState<string | null>(collection.video_url ?? null);
  const [busy, setBusy] = useState(false);

  const handleImage = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      if (image) await deleteByUrl(BUCKET_SITE, image);
      const url = await uploadFile(BUCKET_SITE, `collections/${collection.slug}`, f);
      setImage(url);
      await onSave({ image_url: url });
      toast.success("Image saved");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const handleVideo = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    if (!f.type.startsWith("video/")) { toast.error("Please upload an MP4/video file"); return; }
    setBusy(true);
    try {
      if (video) await deleteByUrl(BUCKET_SITE, video);
      const url = await uploadFile(BUCKET_SITE, `collections/${collection.slug}/video`, f);
      setVideo(url);
      await onSave({ video_url: url });
      toast.success("Video saved");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const removeImage = async () => {
    if (!image || !confirm("Remove cover image?")) return;
    const old = image; setImage(null);
    await onSave({ image_url: null });
    deleteByUrl(BUCKET_SITE, old).catch(() => {});
  };
  const removeVideo = async () => {
    if (!video || !confirm("Remove hero video?")) return;
    const old = video; setVideo(null);
    await onSave({ video_url: null });
    deleteByUrl(BUCKET_SITE, old).catch(() => {});
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-display text-xl font-bold uppercase tracking-widest">{collection.name}</h3>
          <p className="text-xs text-muted-foreground">Collection · {collection.slug}</p>
        </div>
        {busy && <Loader2 className="h-4 w-4 animate-spin text-[color:var(--cyan)]" />}
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[color:var(--lime)]">Cover image</h4>
            <label className="btn-outline-neon rounded-full px-3 py-1.5 text-[10px] cursor-pointer inline-flex items-center gap-1">
              <Upload className="h-3 w-3" /> {image ? "Replace" : "Upload"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImage(e.target.files)} />
            </label>
          </div>
          {image ? (
            <div className="relative rounded-xl overflow-hidden border border-border/40 aspect-video">
              <img src={image} alt="" className="h-full w-full object-cover" />
              <button onClick={removeImage} className="absolute top-2 right-2 rounded-full bg-destructive/80 text-destructive-foreground p-1.5" aria-label="Delete image"><Trash2 className="h-3 w-3" /></button>
            </div>
          ) : <p className="text-xs text-muted-foreground">No image.</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[color:var(--magenta)]">Hero video (MP4)</h4>
            <label className="btn-outline-neon rounded-full px-3 py-1.5 text-[10px] cursor-pointer inline-flex items-center gap-1">
              <Upload className="h-3 w-3" /> {video ? "Replace" : "Upload"}
              <input type="file" accept="video/mp4,video/*" className="hidden" onChange={(e) => handleVideo(e.target.files)} />
            </label>
          </div>
          {video ? (
            <div className="relative rounded-xl overflow-hidden border border-border/40">
              <video src={video} controls muted className="w-full h-auto" />
              <button onClick={removeVideo} className="absolute top-2 right-2 rounded-full bg-destructive/80 text-destructive-foreground p-1.5" aria-label="Delete video"><Trash2 className="h-3 w-3" /></button>
            </div>
          ) : <p className="text-xs text-muted-foreground">No video.</p>}
        </div>
      </div>
    </div>
  );
}
