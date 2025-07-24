import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // GitHub Pages 사용자 페이지용 (username.github.io)
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
