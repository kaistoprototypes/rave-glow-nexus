import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useCart } from "@/lib/cart-store";
import { Menu, X, Search, ShoppingBag, User, Sparkles } from "lucide-react";

const navLinks = [
  { to: "/shop", label: "All" },
  { to: "/shop", search: { gender: "men" }, label: "Men" },
  { to: "/shop", search: { gender: "women" }, label: "Women" },
  { to: "/shop", search: { gender: "accessories" }, label: "Accessories" },
  { to: "/shop", search: { new_drop: "1" }, label: "New Drops" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const count = useCart((s) => s.count());
  const openCart = useCart((s) => s.open);

  return (
    <header className="sticky top-0 z-40 glass border-b border-border/40">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
        <Link to="/" className="flex items-center gap-2 text-base sm:text-lg font-display font-black tracking-tight min-w-0">
          <Sparkles className="h-5 w-5 text-[color:var(--lime)] glow-lime shrink-0" />
          <span className="animate-neon-pulse truncate">
            ELECTRIC PULSE <span className="hidden sm:inline">EMPORIUM</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm font-semibold uppercase tracking-wider">
          {navLinks.map((l, i) => (
            <Link
              key={i}
              to={l.to as any}
              search={l.search as any}
              className="text-foreground/80 hover:text-[color:var(--lime)] transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/shop" className="hidden md:inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/5">
            <Search className="h-5 w-5" />
          </Link>
          <Link to="/account" className="hidden md:inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/5">
            <User className="h-5 w-5" />
          </Link>
          <button
            onClick={openCart}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/5"
            aria-label="Cart"
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-[color:var(--magenta)] px-1 text-[10px] font-bold text-white ring-glow-magenta">
                {count}
              </span>
            )}
          </button>
          <button
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/5"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-border/40 glass animate-fade-up">
          <nav className="flex flex-col px-4 py-4 gap-1">
            {navLinks.map((l, i) => (
              <Link
                key={i}
                to={l.to as any}
                search={l.search as any}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-3 text-sm font-semibold uppercase tracking-wider hover:bg-white/5 hover:text-[color:var(--lime)]"
              >
                {l.label}
              </Link>
            ))}
            <Link to="/account" onClick={() => setOpen(false)} className="rounded-md px-3 py-3 text-sm font-semibold uppercase tracking-wider hover:bg-white/5">
              Account
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
