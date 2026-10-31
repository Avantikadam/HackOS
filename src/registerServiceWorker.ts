/**
 * Service Worker Registration for HACKOS PWA
 * Ensures Android Chrome and desktop browser installability and offline app shell caching.
 */
export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  // Register in production or when running locally on localhost
  const isLocalhost = Boolean(
    window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
  )

  window.addEventListener('load', () => {
    // In production or HTTPS or localhost
    if (import.meta.env.PROD || isLocalhost) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content is available; prompt or silent skipWaiting
                  installingWorker.postMessage({ type: 'SKIP_WAITING' })
                }
              })
            }
          })
        })
        .catch((err) => {
          console.warn('[HACKOS PWA] Service Worker registration failed:', err)
        })
    }
  })
}
