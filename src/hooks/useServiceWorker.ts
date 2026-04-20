import { useEffect, useState } from 'react'

export function useServiceWorker() {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      // Register service worker
      navigator.serviceWorker
        .register('/service-worker.js')
        .then(reg => {
          setRegistration(reg)

          // Check for updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New update available
                  setIsUpdateAvailable(true)
                }
              })
            }
          })
        })
        .catch(error => {
          console.error('Service worker registration failed:', error)
        })

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', event => {
        if (event.data && event.data.type === 'SYNC_TRADES') {
          // Trigger data sync
          window.dispatchEvent(new CustomEvent('sync-requested'))
        }
      })
    }
  }, [])

  const updateServiceWorker = () => {
    if (registration && registration.waiting) {
      // Tell SW to skip waiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      
      // Reload once activated
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload()
      })
    }
  }

  const requestBackgroundSync = async () => {
    if ('sync' in registration!) {
      try {
        await (registration as any).sync.register('sync-trades')
        console.log('Background sync registered')
      } catch (error) {
        console.error('Background sync registration failed:', error)
      }
    }
  }

  return {
    isUpdateAvailable,
    updateServiceWorker,
    requestBackgroundSync
  }
}