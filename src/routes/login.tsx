import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Electric Pulse Emporium" }] }),
  component: Login,
});

function Login() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) nav({ to: "/account", replace: true }); });
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/account`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
        nav({ to: "/account", replace: true });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Auth failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="text-center mb-8">
        <Sparkles className="mx-auto h-8 w-8 text-[color:var(--lime)] glow-lime" />
        <h1 className="font-display text-4xl font-black mt-3">{mode === "signin" ? "Welcome back" : "Join the rave"}</h1>
        <p className="text-sm text-muted-foreground mt-1">{mode === "signin" ? "Sign in to track orders & wishlist." : "Create an account in seconds."}</p>
      </div>
      <form onSubmit={submit} className="card-glow rounded-2xl p-6 space-y-4">
        {mode === "signup" && (
          <Field label="Full name"><input required value={fullName} onChange={(e)=>setFullName(e.target.value)} className="inp" /></Field>
        )}
        <Field label="Email"><input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} className="inp" /></Field>
        <Field label="Password"><input type="password" minLength={6} required value={password} onChange={(e)=>setPassword(e.target.value)} className="inp" /></Field>
        <button disabled={loading} className="btn-neon w-full rounded-full py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-60">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "signin" ? "Sign in" : "Create account"}
        </button>
        <button type="button" onClick={()=>setMode(mode==="signin"?"signup":"signin")} className="block w-full text-center text-xs text-muted-foreground hover:text-[color:var(--cyan)] uppercase tracking-widest">
          {mode==="signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
      </form>
      <style>{`.inp{margin-top:.25rem;width:100%;border-radius:.375rem;background:oklch(0.20 0.05 170 / 0.7);border:1px solid var(--border);padding:.625rem .75rem;font-size:.875rem;outline:none;}.inp:focus{border-color:var(--lime);}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>{children}</label>;
}
