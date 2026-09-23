import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import vue2 from '@vitejs/plugin-vue2'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  base: './',
  plugins: [react(), vue2(), viteSingleFile()],
  resolve: {
    dedupe: ['vue'],
    // Element UI ships CommonJS components while the app uses Vue's ESM entry.
    // Resolve both import styles to one runtime so table store reactivity is shared.
    alias: [{ find: /^vue$/, replacement: fileURLToPath(new URL('./node_modules/vue/dist/vue.runtime.esm.js', import.meta.url)) }],
  },
  build: {
    // 不使用会改写媒体查询语法的 CSS 压缩器，兼容部分旧版 iOS / Android WebView。
    cssMinify: false,
    rollupOptions: {
      input: fileURLToPath(new URL('./src-entry.html', import.meta.url)),
    },
  },
})
