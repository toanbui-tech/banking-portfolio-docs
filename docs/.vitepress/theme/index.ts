import type { Theme } from 'vitepress'
import { useData } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import { defineComponent, h } from 'vue'
import './custom.css'

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

// Nav bar hiện viền dưới khi cuộn: chỉ toggle 1 class, CSS lo phần hiển thị.
function attachScrollBorder() {
  const SCROLL_THRESHOLD = 8
  let ticking = false

  const applyState = () => {
    document.documentElement.classList.toggle('vp-scrolled', window.scrollY > SCROLL_THRESHOLD)
    ticking = false
  }

  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(applyState)
    },
    { passive: true }
  )

  applyState()
}

// Pill nhỏ phía trên tiêu đề hero ở trang chủ (kiểu medusajs.com)
const HeroEyebrow = defineComponent({
  setup() {
    const { lang } = useData()
    return () =>
      h('div', { class: 'mc-eyebrow' }, [
        h('span', { class: 'mc-eyebrow-dot', 'aria-hidden': 'true' }),
        h(
          'span',
          lang.value.startsWith('vi')
            ? 'Java · Spring Boot · Mô phỏng hạ tầng ngân hàng'
            : 'Java · Spring Boot · Simulated banking infrastructure'
        )
      ])
  }
})

export default {
  extends: DefaultTheme,
  Layout: () => h(DefaultTheme.Layout, null, { 'home-hero-info-before': () => h(HeroEyebrow) }),
  enhanceApp() {
    if (!isBrowser()) return
    attachScrollBorder()
  }
} satisfies Theme
