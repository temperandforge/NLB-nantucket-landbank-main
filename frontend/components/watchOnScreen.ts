/**
 * Calls `onChange(true)` while `el` is on screen in a foreground tab and `onChange(false)`
 * otherwise, once per change. Returns a cleanup. Use it from an effect.
 *
 * Anything that moves or plays on its own (video, an auto-scrolling carousel, a timer-driven
 * animation) should run only while this is true, and resume from where it was when it turns true
 * again. Browsers do not do this for us: a video started with a script `play()` keeps decoding
 * off-screen, and a `requestAnimationFrame` loop keeps running for as long as the tab is shown.
 * See DECISIONS 25.
 */
export function watchOnScreen(el: Element, onChange: (active: boolean) => void): () => void {
  let intersecting = false
  let current: boolean | null = null
  const update = () => {
    const next = intersecting && document.visibilityState === 'visible'
    if (next === current) return
    current = next
    onChange(next)
  }
  const observer = new IntersectionObserver((entries) => {
    intersecting = entries[entries.length - 1].isIntersecting
    update()
  })
  observer.observe(el)
  document.addEventListener('visibilitychange', update)
  return () => {
    observer.disconnect()
    document.removeEventListener('visibilitychange', update)
  }
}
