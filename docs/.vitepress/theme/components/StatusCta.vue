<script setup lang="ts">
import { withBase } from 'vitepress'
</script>

<template>
  <a class="status-cta" :href="withBase('/project-status.html')">
    <svg
      class="status-cta-icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="status-cta-grad" x1="2" y1="20" x2="22" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="var(--status-cta-grad-from)" />
          <stop offset="1" stop-color="var(--status-cta-grad-to)" />
        </linearGradient>
      </defs>
      <path
        d="M3 17L9.5 10.5L13.5 14.5L21 7"
        stroke="url(#status-cta-grad)"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M15 7H21V13"
        stroke="url(#status-cta-grad)"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
    <span>Xem trạng thái dự án</span>
  </a>
</template>
