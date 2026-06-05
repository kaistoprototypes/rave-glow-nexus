import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";

import appCss from "../styles.css?url";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CartSheet } from "@/components/CartSheet";
import { AnimatedBg } from "@/components/AnimatedBg";
import { Toaster } from "@/components/ui/sonner";
import { OrderNotifications } from "@/components/OrderNotifications";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-8xl font-black text-neon">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Lost in the strobe</h2>
        <p className="mt-2 text-sm text-muted-foreground">This page never made it past the door.</p>
        <Link to="/" className="btn-neon mt-6 inline-block rounded-full px-6 py-2.5 text-xs">Back to the floor</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight">Something glitched</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="btn-neon rounded-full px-5 py-2 text-xs">Try again</button>
          <a href="/" className="btn-outline-neon rounded-full px-5 py-2 text-xs">Go home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "-" },
      { name: "description", content: "-" },
      { name: "author", content: "Electric Pulse Emporium" },
      { property: "og:title", content: "-" },
      { property: "og:description", content: "-" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "-" },
      { name: "twitter:description", content: "-" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/32f66351-ba1e-4544-b6e1-f08637e34124/id-preview-e81bf6ca--24e6b821-7ac9-4112-b1e7-4cf3bbadc2fd.lovable.app-1780607554855.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/32f66351-ba1e-4544-b6e1-f08637e34124/id-preview-e81bf6ca--24e6b821-7ac9-4112-b1e7-4cf3bbadc2fd.lovable.app-1780607554855.png" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AuthBridge() {
  const router = useRouter();
  const qc = useQueryClient();
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      router.invalidate();
      qc.invalidateQueries();
    });
    return () => subscription.unsubscribe();
  }, [router, qc]);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthBridge />
      <AnimatedBg />
      <Navbar />
      <main className="min-h-[60vh]">
        <Outlet />
      </main>
      <Footer />
      <CartSheet />
      <OrderNotifications />
      <Toaster />
    </QueryClientProvider>
  );
}
