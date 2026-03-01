import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'
import { seedData } from './seed'

if (typeof window !== 'undefined') {
  (window as any).seedDemo = seedData;
  if (window.location.search.includes('seed=true')) {
    seedData();
  }
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
    <App />
  </React.StrictMode>,
)
