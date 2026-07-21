import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/DiamondCapsule/", // GitHub Pages 서브경로
  plugins: [react()],
});
