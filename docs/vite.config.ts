import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // GitHub Pages 项目站点：https://insight68.github.io/ScienceX/
  // 若改用自定义域名（根路径 /），把 base 改回 '/' 即可
  base: '/ScienceX/',
  plugins: [vue()],
  build: {
    target: 'es2020',
    outDir: 'dist',
  },
})
