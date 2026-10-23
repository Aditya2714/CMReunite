import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const backendProxy = () => ({
  target: "http://localhost:4000",
  changeOrigin: true,
  ws: true,
  // Several API prefixes are also valid SPA routes. Let browser document
  // navigation reach Vite's history fallback while proxying XHR/fetch calls.
  bypass(request) {
    if (request.headers.accept?.includes("text/html")) return request.url;
    return undefined;
  },
});

const apiPrefixes = [
  "/auth",
  "/super-admin",
  "/departments",
  "/posts",
  "/profile",
  "/alumni",
  "/admin",
  "/event",
  "/jobs",
  "/bulk",
  "/announcements",
  "/uploads",
  "/recognition",
  "/connections",
  "/mentorship",
  "/referrals",
  "/community",
  "/contributions",
  "/ml",
  "/otp",
  "/notifications",
  "/messages",
  "/assistant",
  "/network",
  "/socket.io",
  "/register",
];

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: Object.fromEntries(apiPrefixes.map((prefix) => [prefix, backendProxy()])),
  },
});
