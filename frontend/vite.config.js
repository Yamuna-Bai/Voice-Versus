import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig({
  plugins: [react(), basicSsl()],

  server: {
    host: "0.0.0.0",
    https: true,

    proxy: {
      "/login": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },

      "/signup": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },

      "/multiplayer": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/debate": {
    target: "http://127.0.0.1:8000",
    changeOrigin: true,
  },
    },
  },
});