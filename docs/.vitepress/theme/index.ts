import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import './custom.css'

const RIPPLE_CLASS = 'vp-droplet-ripple'
const RIPPLE_LIFETIME_MS = 900
const DEBOUNCE_MS = 400
const PENDING_NAV_TIMEOUT_MS = 4000

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function prefersReducedMotion(): boolean {
  return isBrowser() && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function spawnRipple(x: number, y: number) {
  if (prefersReducedMotion()) return
  const el = document.createElement('span')
  el.className = RIPPLE_CLASS
  el.style.left = `${x}px`
  el.style.top = `${y}px`
  document.body.appendChild(el)
  const cleanup = () => el.remove()
  el.addEventListener('animationend', cleanup, { once: true })
  // Fallback nếu animationend không bắn (vd tab bị ẩn khi animation chạy)
  setTimeout(cleanup, RIPPLE_LIFETIME_MS)
}

// Debounce theo từng phần tử: click nhanh nhiều lần vào CÙNG một phần tử
// trong khoảng DEBOUNCE_MS chỉ bắn ripple một lần.
const lastFiredAt = new WeakMap<Element, number>()

function shouldFire(target: Element): boolean {
  const now = Date.now()
  const last = lastFiredAt.get(target) ?? 0
  if (now - last < DEBOUNCE_MS) return false
  lastFiredAt.set(target, now)
  return true
}

function isInternalLink(a: HTMLAnchorElement): boolean {
  if (a.target === '_blank' || a.hasAttribute('download')) return false
  try {
    return new URL(a.href, window.location.href).origin === window.location.origin
  } catch {
    return false
  }
}

// Click vào nav link chỉ bắn ripple SAU KHI điều hướng thành công, nên phải
// giữ tạm toạ độ click rồi xác nhận qua hook onAfterRouteChanged của router.
let pendingNavClick: { x: number; y: number; timer: ReturnType<typeof setTimeout> } | null = null

function clearPendingNavClick() {
  if (pendingNavClick) {
    clearTimeout(pendingNavClick.timer)
    pendingNavClick = null
  }
}

// Nav bar "condense" khi cuộn: chỉ toggle 1 class, CSS lo phần hiển thị.
// Không phụ thuộc reduced-motion ở tầng JS — trạng thái vẫn đúng, CSS sẽ
// tự bỏ phần transition khi người dùng bật prefers-reduced-motion.
function attachScrollCondense() {
  const SCROLL_THRESHOLD = 12
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

function attachRippleListeners() {
  document.addEventListener(
    'click',
    (event: MouseEvent) => {
      const target = event.target as Element | null
      if (!target) return

      const ctaButton = target.closest('.VPButton.brand')
      if (ctaButton && shouldFire(ctaButton)) {
        spawnRipple(event.clientX, event.clientY)
        return
      }

      const featureCard = target.closest('.VPFeature')
      if (featureCard && shouldFire(featureCard)) {
        spawnRipple(event.clientX, event.clientY)
        return
      }

      const navLink = target.closest('.VPNavBar a') as HTMLAnchorElement | null
      if (navLink && isInternalLink(navLink) && shouldFire(navLink)) {
        clearPendingNavClick()
        const timer = setTimeout(() => {
          pendingNavClick = null
        }, PENDING_NAV_TIMEOUT_MS)
        pendingNavClick = { x: event.clientX, y: event.clientY, timer }
      }
    },
    true
  )
}

export default {
  extends: DefaultTheme,
  enhanceApp({ router }) {
    if (!isBrowser()) return

    attachScrollCondense()

    if (prefersReducedMotion()) return

    attachRippleListeners()

    const previousOnAfterRouteChanged = router.onAfterRouteChanged
    router.onAfterRouteChanged = (to) => {
      if (pendingNavClick) {
        spawnRipple(pendingNavClick.x, pendingNavClick.y)
        clearPendingNavClick()
      }
      return previousOnAfterRouteChanged?.(to)
    }
  }
} satisfies Theme
