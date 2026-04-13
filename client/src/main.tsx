import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";

import "./index.css";
import { initLocales } from "./lib/i18n";
import { registerSW } from "virtual:pwa-register";

const queryClient = new QueryClient();

// Public pages where UNAUTHORIZED errors should NOT trigger a redirect
const PUBLIC_PATHS = [
  "/", "/register", "/lookup", "/chatbot", "/flight-tracker",
  "/flight-pickup", "/booking", "/community", "/schedule",
  "/pickup", "/channel", "/immigration-checklist", "/survey",
  "/login", "/forgot-password", "/reset-password", "/verify-email",
  "/welcome", "/invite",
];

const isPublicPage = () => {
  const path = window.location.pathname;
  return PUBLIC_PATHS.some(p => path === p || path.startsWith(p + "/"));
};

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;
  if (!isUnauthorized) return;

  // Don't redirect if already on login page (prevent infinite loop)
  if (window.location.pathname === "/login") return;

  // Don't redirect on public pages - these pages handle auth state gracefully
  if (isPublicPage()) return;

  // Only redirect for admin/protected-only pages
  window.location.href = "/login";
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

// Register PWA Service Worker
const updateSW = registerSW({
  onNeedRefresh() { updateSW(true); },
  onOfflineReady() { console.log("[PWA] App ready for offline use"); },
});

// Load initial locale(s) then render
initLocales().then(() => {
  createRoot(document.getElementById("root")!).render(
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  );
});
