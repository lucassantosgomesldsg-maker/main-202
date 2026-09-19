import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["**/node_modules/**", "**/e2e/**", "**/.next/**"],
    /*
     * O Node 25+ liga por padrão um `localStorage` próprio (Web Storage), que
     * sem `--localstorage-file` é um getter que devolve `undefined` e avisa.
     * Esse global vence o do jsdom dentro do worker, e o `afterEach` do
     * `vitest.setup.ts` — `window.localStorage.clear()` — derruba TODOS os
     * testes de uma vez. Desligar o experimento no worker devolve o
     * `localStorage` ao jsdom, que é o que os testes sempre usaram.
     */
    execArgv: ["--no-experimental-webstorage"],
  },
});
