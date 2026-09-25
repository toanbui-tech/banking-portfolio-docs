import { defineConfig, type DefaultTheme } from 'vitepress'

// Đường dẫn cơ sở khi deploy lên GitHub Pages dạng project site:
// https://toanbui-tech.github.io/banking-portfolio-docs/
// Dùng chung biến này cho `base` và cho href tuyệt đối trong `head`,
// vì VitePress KHÔNG tự động gắn base vào các href khai báo thủ công trong head.
const base = '/banking-portfolio-docs/'

// Danh sách ADR dùng chung cho cả 2 ngôn ngữ — tên ADR giữ nguyên tiếng Anh/thuật ngữ.
// `vi`/`en` chỉ khác nhau ở ADR-007.
const adrs = [
  { id: '001', slug: 'saga-orchestration-vs-choreography', vi: 'Saga Orchestration vs Choreography' },
  { id: '002', slug: 'double-entry-ledger-immutable-pattern', vi: 'Double-Entry Immutable Ledger' },
  { id: '003', slug: 'pessimistic-vs-optimistic-locking-hot-accounts', vi: 'Pessimistic vs Optimistic Locking' },
  { id: '004', slug: 'idempotency-duplicate-message-prevention', vi: 'Idempotency' },
  { id: '005', slug: 'spring-batch-chunk-vs-tasklet-eod', vi: 'Spring Batch Chunk EOD Settlement' },
  { id: '006', slug: 'derived-balance-vs-stored-balance', vi: 'Derived vs Stored Balance' },
  { id: '007', slug: 'pessimistic-locking-withdraw', vi: 'Pessimistic Locking khi rút tiền', en: 'Pessimistic Locking for Withdrawals' },
  { id: '008', slug: 'transaction-aggregate-root', vi: 'Transaction Aggregate Root' },
  { id: '009', slug: 'outbox-pattern-kafka-event-publishing', vi: 'Outbox Pattern & Kafka Event Publishing' },
  { id: '010', slug: 'redis-cache-account-balance', vi: 'Redis Cache Account Balance' },
  { id: '011', slug: 'oracle-dual-profile-support', vi: 'Oracle Dual-Profile Support' },
  { id: '012', slug: 'money-fixed-scale', vi: 'Money Fixed Scale' },
  { id: '013', slug: 'kubernetes-deployment', vi: 'Kubernetes Deployment' }
]

// ADR liên quan hiển thị trong sidebar của từng sub-project
const coreBankingAdrs = ['002', '003', '006', '007', '008', '009', '010', '011', '012', '013']
const paymentGatewayAdrs = ['001', '004', '005']

type Lang = 'vi' | 'en'

const t = {
  vi: {
    home: 'Trang chủ', roadmap: 'Lộ trình', projects: 'Dự án', adrNav: 'Thiết kế & ADRs',
    devlogNav: 'Nhật ký (Devlog)', status: 'Trạng thái dự án', related: 'Tài liệu liên quan',
    cb: ['1. Tổng quan & Nghiệp vụ', '2. Kiến trúc Double-Entry Ledger', '3. Công nghệ & Concurrency', '4. Hướng dẫn chạy & Kiểm thử', '5. Thử thách & Bài học rút ra'],
    pg: ['1. Tổng quan & Nghiệp vụ', '2. Kiến trúc & Chuẩn ISO 20022', '3. Công nghệ & Stack', '4. Hướng dẫn chạy & Kiểm thử', '5. Thử thách & Bài học rút ra'],
    adrOverview: 'Tổng quan & Ma trận ADR',
    devlog: ['Tổng quan tiến độ', 'Giai đoạn 1: Core Banking', 'Giai đoạn 2: Payment Gateway', 'Giai đoạn 3: Tích hợp & hoàn thiện'],
    devlogTitle: 'Nhật ký phát triển (Devlog)'
  },
  en: {
    home: 'Home', roadmap: 'Roadmap', projects: 'Projects', adrNav: 'Design & ADRs',
    devlogNav: 'Devlog', status: 'Project Status', related: 'Related documents',
    cb: ['1. Overview & Business Context', '2. Double-Entry Ledger Architecture', '3. Tech Stack & Concurrency', '4. Running & Testing', '5. Challenges & Lessons Learned'],
    pg: ['1. Overview & Business Context', '2. Architecture & ISO 20022', '3. Tech Stack', '4. Running & Testing', '5. Challenges & Lessons Learned'],
    adrOverview: 'Overview & ADR Matrix',
    devlog: ['Progress overview', 'Phase 1: Core Banking', 'Phase 2: Payment Gateway', 'Phase 3: Integration & Polish'],
    devlogTitle: 'Development Log (Devlog)'
  }
}

function themeFor(lang: Lang): DefaultTheme.Config {
  const p = lang === 'vi' ? '' : '/en'
  const s = t[lang]
  const adrLink = (id: string) => {
    const a = adrs.find((x) => x.id === id)!
    return { text: `ADR-${a.id}: ${(lang === 'en' && a.en) || a.vi}`, link: `${p}/adr/ADR-${a.id}-${a.slug}` }
  }
  const pages = ['', 'architecture', 'tech-stack', 'run-guide', 'lessons-learned']

  return {
    nav: [
      { text: s.home, link: `${p}/` },
      { text: s.roadmap, link: `${p}/roadmap` },
      {
        text: s.projects,
        items: [
          { text: 'Sub-project B: Core Banking System', link: `${p}/core-banking/` },
          { text: 'Sub-project A: Payment Gateway (ISO 20022)', link: `${p}/payment-gateway/` }
        ]
      },
      { text: s.adrNav, link: `${p}/adr/` },
      { text: s.devlogNav, link: `${p}/devlog/` },
      { text: s.status, link: `${p}/project-status` },
      { text: 'GitHub', link: 'https://github.com/toanbui-tech' }
    ],

    sidebar: {
      [`${p}/core-banking/`]: [
        {
          text: 'Core Banking System',
          collapsed: false,
          items: pages.map((page, i) => ({ text: s.cb[i], link: `${p}/core-banking/${page}` }))
        },
        { text: s.related, items: coreBankingAdrs.map(adrLink) }
      ],
      [`${p}/payment-gateway/`]: [
        {
          text: 'Interbank Payment Gateway',
          collapsed: false,
          items: pages.map((page, i) => ({ text: s.pg[i], link: `${p}/payment-gateway/${page}` }))
        },
        { text: s.related, items: paymentGatewayAdrs.map(adrLink) }
      ],
      [`${p}/adr/`]: [
        {
          text: 'Architecture Decision Records (ADR)',
          collapsed: false,
          items: [{ text: s.adrOverview, link: `${p}/adr/` }, ...adrs.map((a) => adrLink(a.id))]
        }
      ],
      [`${p}/devlog/`]: [
        {
          text: s.devlogTitle,
          collapsed: false,
          items: ['', 'phase-1-core-banking', 'phase-2-payment-gateway', 'phase-3-integration'].map((page, i) => ({
            text: s.devlog[i],
            link: `${p}/devlog/${page}`
          }))
        }
      ]
    },

    ...(lang === 'vi'
      ? {
          outline: { level: [2, 3], label: 'Mục lục trên trang' },
          docFooter: { prev: 'Trang trước', next: 'Trang tiếp theo' },
          lastUpdated: {
            text: 'Cập nhật lần cuối',
            formatOptions: { dateStyle: 'medium', timeStyle: 'short', forceLocale: true }
          },
          langMenuLabel: 'Đổi ngôn ngữ',
          returnToTopLabel: 'Về đầu trang',
          sidebarMenuLabel: 'Menu',
          darkModeSwitchLabel: 'Giao diện'
        }
      : {
          outline: { level: [2, 3], label: 'On this page' },
          lastUpdated: {
            text: 'Last updated',
            formatOptions: { dateStyle: 'medium', timeStyle: 'short', forceLocale: true }
          }
        })
  }
}

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Banking & Fintech Systems",
  base,
  lastUpdated: true,

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}favicon.svg` }],
    // Icon khi "Thêm vào màn hình chính" trên iOS (iOS không dùng favicon SVG)
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: `${base}apple-touch-icon.png` }],
    ['meta', { name: 'theme-color', content: '#ffffff' }],
  ],

  // Tiếng Việt là ngôn ngữ gốc (root, giữ nguyên URL cũ); tiếng Anh nằm dưới /en/
  locales: {
    root: {
      label: 'Tiếng Việt',
      lang: 'vi-VN',
      description: "Java/Spring Boot: ISO 20022 Interbank Payment Gateway & Core Banking double-entry ledger — mô phỏng hạ tầng ngân hàng",
      themeConfig: themeFor('vi')
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      description: "Java/Spring Boot: ISO 20022 Interbank Payment Gateway & Core Banking double-entry ledger — simulated banking infrastructure",
      themeConfig: themeFor('en')
    }
  },

  themeConfig: {
    // Logo cạnh tên site trên nav bar — cùng biểu tượng T-account với favicon.
    // Tách 2 file light/dark vì dark mode của site bật bằng class (nút toggle),
    // không theo prefers-color-scheme như favicon. alt rỗng vì tên site đã đứng ngay cạnh.
    logo: { light: '/logo.svg', dark: '/logo-dark.svg', alt: '' },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/toanbui-tech' },
      { icon: 'linkedin', link: 'https://www.linkedin.com/in/toanbui-tech' }
    ],

    footer: {
      message: 'Simulated Banking & Fintech Systems — Java & Spring Boot',
      copyright: 'Copyright © 2024-2026 Toan Bui - Software Engineer. All rights reserved.'
    },

    search: {
      provider: 'local'
    }
  }
})
