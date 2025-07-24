import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/family-music-app/', // GitHub Pages 프로젝트 페이지용
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
