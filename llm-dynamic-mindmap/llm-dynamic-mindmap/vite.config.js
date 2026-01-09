import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  // YAMLファイルをraw textとしてインポート可能にする
  assetsInclude: ['**/*.yaml', '**/*.yml']
})
