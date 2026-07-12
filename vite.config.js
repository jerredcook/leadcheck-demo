import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves a project site under /<repo>/, so the build needs a
// matching base path.  Override with VITE_BASE when the repo/host differs
// (e.g. VITE_BASE=/ for a user/root site or local preview).
export default defineConfig({
  base: process.env.VITE_BASE || "/leadcheck-demo/",
  plugins: [react()],
});
