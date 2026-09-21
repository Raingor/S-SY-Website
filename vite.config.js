import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  build: {
    // 不使用会改写媒体查询语法的 CSS 压缩器，兼容部分旧版 iOS / Android WebView。
    cssMinify: false,
    rollupOptions: {
      input: fileURLToPath(new URL('./src-entry.html', import.meta.url)),
    },
  },
})
