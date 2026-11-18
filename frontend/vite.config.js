import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

const configDirectory = path.dirname(fileURLToPath(import.meta.url));
const developmentCertificate = path.join(configDirectory, "certs", "voice-versus-dev.pfx");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, configDirectory, "");
  const https = fs.existsSync(developmentCertificate)
    ? {
        pfx: fs.readFileSync(developmentCertificate),
        passphrase: env.VITE_DEV_CERT_PASSWORD,
      }
    : true;

  return {
  plugins: [react(), basicSsl()],

  server: {
    host: "0.0.0.0",
    https,

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
};
});
