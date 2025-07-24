import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/family-music-app/', // GitHub 저장소 이름으로 수정
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
