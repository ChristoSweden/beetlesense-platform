import { useEffect, useState } from 'react'

export function UpdateBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.ready.then(registration => {
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setShow(true)
          }
        })
      })

      // Also trigger a manual update check
      registration.update().catch(() => {})
    }).catch(() => {})
  }, [])

  if (!show) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-3 px-4 py-2 bg-[#1B5E20] text-white text-xs font-medium">
      <span>New version available</span>
      <button
        onClick={() => window.location.reload()}
        className="underline underline-offset-2 font-semibold hover:opacity-80 transition-opacity"
      >
        Update
      </button>
      <button
        onClick={() => setShow(false)}
        className="ml-1 opacity-60 hover:opacity-100 transition-opacity text-base leading-none"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}
