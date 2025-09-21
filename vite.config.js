import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/couple_diary/',  // 這裡的 'couple-diary' 改成你自己的 repo 名稱
  plugins: [react()],
})
