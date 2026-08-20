import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Banking & Fintech Systems Portfolio",
  description: "Enterprise Java/Spring Boot Engineering Portfolio: ISO 20022 Payment Gateway & Core Banking Ledger",
  lang: 'vi-VN',
  lastUpdated: true,

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#0f172a' }],
    ['meta', { name: 'author', content: 'Java FullStack Engineer' }],
  ],

  themeConfig: {
    // Navigation bar top
    nav: [
      { text: 'Trang chủ', link: '/' },
      { text: 'Lộ trình', link: '/roadmap' },
      {
        text: 'Dự án',
        items: [
          { text: 'Sub-project B: Core Banking System', link: '/core-banking/' },
          { text: 'Sub-project A: Payment Gateway (ISO 20022)', link: '/payment-gateway/' }
        ]
      },
      { text: 'Thiết kế & ADRs', link: '/adr/' },
      { text: 'Nhật ký (Devlog)', link: '/devlog/' },
      { text: 'GitHub', link: 'https://github.com/toanbui-tech' }
    ],

    // Multi-sidebar configuration
    sidebar: {
      // Sidebar cho Sub-project B: Core Banking
      '/core-banking/': [
        {
          text: 'Core Banking System',
          collapsed: false,
          items: [
            { text: '1. Tổng quan & Nghiệp vụ', link: '/core-banking/' },
            { text: '2. Kiến trúc Double-Entry Ledger', link: '/core-banking/architecture' },
            { text: '3. Công nghệ & Concurrency', link: '/core-banking/tech-stack' },
            { text: '4. Hướng dẫn chạy & Kiểm thử', link: '/core-banking/run-guide' },
            { text: '5. Thử thách & Bài học rút ra', link: '/core-banking/lessons-learned' }
          ]
        },
        {
          text: 'Tài liệu liên quan',
          items: [
            { text: 'ADR-002: Double-Entry Immutable Ledger', link: '/adr/ADR-002-double-entry-ledger-immutable-pattern' },
            { text: 'ADR-003: Concurrency & Hot Accounts', link: '/adr/ADR-003-pessimistic-vs-optimistic-locking-hot-accounts' }
          ]
        }
      ],

      // Sidebar cho Sub-project A: Payment Gateway
      '/payment-gateway/': [
        {
          text: 'Interbank Payment Gateway',
          collapsed: false,
          items: [
            { text: '1. Tổng quan & Nghiệp vụ', link: '/payment-gateway/' },
            { text: '2. Kiến trúc & Chuẩn ISO 20022', link: '/payment-gateway/architecture' },
            { text: '3. Công nghệ & Stack', link: '/payment-gateway/tech-stack' },
            { text: '4. Hướng dẫn chạy & Kiểm thử', link: '/payment-gateway/run-guide' },
            { text: '5. Thử thách & Bài học rút ra', link: '/payment-gateway/lessons-learned' }
          ]
        },
        {
          text: 'Tài liệu liên quan',
          items: [
            { text: 'ADR-001: Saga Orchestrator', link: '/adr/ADR-001-saga-orchestration-vs-choreography' },
            { text: 'ADR-004: Idempotency', link: '/adr/ADR-004-idempotency-duplicate-message-prevention' }
          ]
        }
      ],

      // Sidebar cho ADRs
      '/adr/': [
        {
          text: 'Architecture Decision Records (ADR)',
          collapsed: false,
          items: [
            { text: 'Tổng quan & Ma trận ADR', link: '/adr/' },
            { text: 'ADR-001: Saga Orchestration vs Choreography', link: '/adr/ADR-001-saga-orchestration-vs-choreography' },
            { text: 'ADR-002: Double-Entry Immutable Ledger', link: '/adr/ADR-002-double-entry-ledger-immutable-pattern' },
            { text: 'ADR-003: Pessimistic vs Optimistic Locking', link: '/adr/ADR-003-pessimistic-vs-optimistic-locking-hot-accounts' },
            { text: 'ADR-004: Idempotency', link: '/adr/ADR-004-idempotency-duplicate-message-prevention' },
            { text: 'ADR-005: Spring Batch Chunk EOD Settlement', link: '/adr/ADR-005-spring-batch-chunk-vs-tasklet-eod' }
          ]
        }
      ],

      // Sidebar cho Devlog
      '/devlog/': [
        {
          text: 'Nhật ký phát triển (Devlog)',
          collapsed: false,
          items: [
            { text: 'Tổng quan tiến độ', link: '/devlog/' },
            { text: 'Giai đoạn 1: Core Banking', link: '/devlog/phase-1-core-banking' },
            { text: 'Giai đoạn 2: Payment Gateway', link: '/devlog/phase-2-payment-gateway' },
            { text: 'Giai đoạn 3: Tích hợp & hoàn thiện', link: '/devlog/phase-3-integration' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/toanbui-tech' },
      { icon: 'linkedin', link: 'https://www.linkedin.com/in/toanbui-tech' }
    ],

    footer: {
      message: 'Fintech Engineering Portfolio — Architected with Java & Spring Boot',
      copyright: 'Copyright © 2024-2025 Your Name'
    },

    search: {
      provider: 'local'
    },

    outline: {
      level: [2, 3],
      label: 'Mục lục trên trang'
    },

    docFooter: {
      prev: 'Trang trước',
      next: 'Trang tiếp theo'
    },

    lastUpdated: {
      text: 'Cập nhật lần cuối'
    }
  }
})
