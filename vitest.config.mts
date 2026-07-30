import { defineConfig } from "vitest/config";

// Node environment only: everything under test is pure. The one browser-dependent
// path (sanitizeHnHtml's DOMParser fallback) is guarded at runtime and left
// untested rather than pulling in jsdom.
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
