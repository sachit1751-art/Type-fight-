export const MOBILE_FOCUS_BREAKPOINT = 860;

export function isMobileFocusViewport(): boolean {
  return typeof window !== 'undefined' && window.innerWidth <= MOBILE_FOCUS_BREAKPOINT;
}

export function isSoftKeyboardActive(): boolean {
  if (typeof window === 'undefined' || !isMobileFocusViewport()) return false;
  const vv = window.visualViewport;
  if (vv && vv.height < window.innerHeight * 0.78) return true;
  const active = document.activeElement;
  return Boolean(active && active.classList.contains('mobile-input'));
}

export function centerElementInVisibleViewport(
  el: HTMLElement | null,
  behavior: ScrollBehavior = 'smooth'
): void {
  if (!el || typeof window === 'undefined') return;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  const vv = window.visualViewport;
  const vvHeight = vv ? vv.height : window.innerHeight;
  const vvTop = vv ? vv.offsetTop : 0;

  let delta = 0;
  if (rect.height >= vvHeight - 16) {
    delta = rect.top - (vvTop + 8);
  } else {
    const elCenter = rect.top + rect.height / 2;
    const vvCenter = vvTop + vvHeight / 2;
    delta = elCenter - vvCenter;
  }

  if (Math.abs(delta) > 4) {
    window.scrollBy({ top: delta, behavior });
  }
}
