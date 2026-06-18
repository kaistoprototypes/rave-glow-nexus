import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="mt-32 border-t border-border/40 glass">
      <div className="mx-auto max-w-7xl grid gap-10 px-6 py-14 md:grid-cols-4">
        <div className="space-y-3">
          <h3 className="font-display text-2xl font-black text-neon">Electric Pulse</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Original neon festival ravewear, psychedelic streetwear, and after-dark accessories. Independent label — no protected logos, no copycat artwork.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-[color:var(--lime)]">Shop</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/shop" search={{ gender: "men" } as any} className="hover:text-[color:var(--cyan)]">Men</Link></li>
            <li><Link to="/shop" search={{ gender: "women" } as any} className="hover:text-[color:var(--cyan)]">Women</Link></li>
            <li><Link to="/shop" search={{ gender: "accessories" } as any} className="hover:text-[color:var(--cyan)]">Accessories</Link></li>
            <li><Link to="/shop" search={{ new_drop: "1" } as any} className="hover:text-[color:var(--cyan)]">New Drops</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-[color:var(--lime)]">Help</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/shipping" className="hover:text-[color:var(--cyan)]">Shipping</Link></li>
            <li><Link to="/returns" className="hover:text-[color:var(--cyan)]">Returns</Link></li>
            <li><Link to="/faq" className="hover:text-[color:var(--cyan)]">FAQ</Link></li>
            <li><Link to="/contact" className="hover:text-[color:var(--cyan)]">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-[color:var(--lime)]">Stay lit</h4>
          <p className="text-sm text-muted-foreground mb-3">Drops, restocks, desert weekend specials.</p>
          <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
            <input className="flex-1 rounded-md bg-input/60 px-3 py-2 text-sm outline-none border border-border focus:border-[color:var(--lime)]" placeholder="you@rave.com" />
            <button className="btn-neon rounded-md px-4 py-2 text-xs">Join</button>
          </form>
        </div>
      </div>
      <div className="border-t border-border/40 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Electric Pulse Emporium. After-dark festival fashion. All designs original.
      </div>
    </footer>
  );
}
