import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'
import { clearAppStorage } from './lib/storage'

if (window.location.search.includes('reset=true')) {
  clearAppStorage()
  window.location.href = window.location.pathname; // Remove query params after reset
}

// Kill-switch for stuck PWA service workers. Visit /?clear-sw=1 to unregister all
// service workers and clear caches — useful when an old SW is hijacking auth paths
// and the user can't easily reinstall the PWA.
if (window.location.search.includes('clear-sw=1')) {
  void (async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.map((r) => r.unregister()))
      }
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      }
    } finally {
      window.location.replace(window.location.pathname)
    }
  })()
}

const SW_MIGRATION_KEY = 'questdo_sw_migration_v2_done'

const cleanupLegacyRootServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) return
  if (localStorage.getItem(SW_MIGRATION_KEY) === 'true') return

  const registrations = await navigator.serviceWorker.getRegistrations()

  await Promise.all(
    registrations.map(async (registration) => {
      const scriptUrl =
        registration.active?.scriptURL ??
        registration.waiting?.scriptURL ??
        registration.installing?.scriptURL ??
        ''
      const scopePath = new URL(registration.scope).pathname
      const isLegacyRootFirebaseSw =
        scopePath === '/' && scriptUrl.includes('/firebase-messaging-sw.js')

      if (isLegacyRootFirebaseSw) {
        await registration.unregister()
      }
    }),
  )

  localStorage.setItem(SW_MIGRATION_KEY, 'true')
}

const initServiceWorker = async () => {
  await cleanupLegacyRootServiceWorker()

  registerSW({
    immediate: true,
    onNeedRefresh() {
      window.location.reload()
    },
    onOfflineReady() {
      console.info('QuestDo is ready for offline use.')
    },
  })
}

void initServiceWorker()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)

