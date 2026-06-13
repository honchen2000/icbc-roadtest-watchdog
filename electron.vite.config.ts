import { defineConfig, externalizeDepsPlugin } from "electron-vite";

// Conventional electron-vite layout:
//   main     -> src/main/index.ts
//   preload  -> src/preload/index.ts
//   renderer -> src/renderer/index.html
//
// This is a "type": "module" package, but we emit main + preload as CommonJS (.cjs):
//   - a sandboxed preload must be CommonJS, and
//   - the main process uses __dirname, which only exists in CommonJS.
// The renderer stays ESM (it runs in the browser/Vite context).
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: { rollupOptions: { output: { format: "cjs", entryFileNames: "index.cjs" } } },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: { rollupOptions: { output: { format: "cjs", entryFileNames: "index.cjs" } } },
  },
  renderer: {},
});
