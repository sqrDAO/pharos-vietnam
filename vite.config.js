import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import handlebars from 'vite-plugin-handlebars';

// Per-page metadata injected into the shared Handlebars partials (partials/).
// `page` drives the active nav highlight; `og`/`keywords`/`ogDescription` add
// Open Graph tags (homepage only); `devColumn` swaps the footer's resources
// column for the developer column (technology page).
const pageMeta = {
  'index.html': {
    page: 'index',
    title: 'Pharos Vietnam | Cộng Đồng Pharos Network Việt Nam',
    description: 'Cộng đồng Pharos Network tại Việt Nam - Khám phá hệ sinh thái blockchain L1 nhanh nhất, thông tin về dự án, hướng dẫn tham gia testnet và cập nhật tin tức mới nhất bằng tiếng Việt.',
    og: true,
    keywords: 'Pharos Network, Pharos Vietnam, blockchain, EVM, L1, Web3, DeFi, RWA, crypto, tiếng Việt',
    ogDescription: 'Cổng thông tin cộng đồng Pharos Network tại Việt Nam - thông tin hệ sinh thái, hướng dẫn tham gia và tin tức mới nhất.',
  },
  'about.html': {
    page: 'about',
    title: 'Về Pharos Network | Pharos Vietnam',
    description: 'Tìm hiểu về Pharos Network — blockchain L1 EVM nhanh nhất, kiến trúc modular 3 lớp, tầm nhìn và sứ mệnh kết nối tài chính toàn cầu.',
  },
  'ecosystem.html': {
    page: 'ecosystem',
    title: 'Hệ Sinh Thái Pharos | Pharos Vietnam',
    description: 'Khám phá toàn bộ hệ sinh thái Pharos Network — các dự án, đối tác, nhà đầu tư đang xây dựng trên nền tảng blockchain L1 EVM nhanh nhất.',
  },
  'technology.html': {
    page: 'technology',
    title: 'Công Nghệ Pharos | Pharos Vietnam',
    description: 'Khám phá công nghệ cốt lõi của Pharos Network: AsyncBFT consensus, Dual VM (EVM+WASM), Speculative Parallel Execution, Delta-Encoded Storage và SPNs.',
    devColumn: true,
  },
  'guide.html': {
    page: 'guide',
    title: 'Hướng Dẫn Tham Gia | Pharos Vietnam',
    description: 'Hướng dẫn chi tiết bằng tiếng Việt cách tham gia Pharos Network: cài đặt ví, tham gia testnet, chạy validator node và trở thành developer trên Pharos.',
  },
  'news.html': {
    page: 'news',
    title: 'Tin Tức Pharos | Pharos Vietnam',
    description: 'Tin tức và cập nhật mới nhất về Pharos Network bằng tiếng Việt — thông báo, hợp tác, cập nhật công nghệ và sự kiện cộng đồng.',
  },
  'community.html': {
    page: 'community',
    title: 'Cộng Đồng Pharos Vietnam | Pharos Vietnam',
    description: 'Tham gia cộng đồng Pharos Network Việt Nam — kết nối, học hỏi và cùng nhau xây dựng tương lai Web3 tại Việt Nam.',
  },
};

// Multi-page static site. Each page is a standalone HTML entry that pulls its
// shared chrome (head/navbar/footer) from partials/ via vite-plugin-handlebars.
// The vanilla JS files (js/data.js, js/main.js, js/ecosystem.js, js/guide.js,
// js/news.js) rely on global `window.PharosData` and cross-file globals, so they
// are kept as plain (non-module) scripts and copied through as static assets.
export default defineConfig({
  root: resolve(__dirname),
  plugins: [
    handlebars({
      partialDirectory: resolve(__dirname, 'partials'),
      context(pagePath) {
        return pageMeta[pagePath.split('/').pop()] || {};
      },
    }),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      // Explicit inputs so macOS resource-fork files (._*.html) are ignored.
      input: {
        index: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
        ecosystem: resolve(__dirname, 'ecosystem.html'),
        technology: resolve(__dirname, 'technology.html'),
        guide: resolve(__dirname, 'guide.html'),
        news: resolve(__dirname, 'news.html'),
        community: resolve(__dirname, 'community.html'),
      },
    },
  },
});
