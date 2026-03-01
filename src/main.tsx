import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'

// Jednorázový reset aplikace pro zobrazení úvodní obrazovky
const CANCEL_SIMULATION_KEY = 'questdo_cancel_simulation_v2_done';

if (window.location.search.includes('reset=true')) {
  localStorage.clear();
  window.location.href = window.location.pathname; // Remove query params after reset
} else if (!localStorage.getItem(CANCEL_SIMULATION_KEY)) {
  localStorage.clear();
  localStorage.setItem(CANCEL_SIMULATION_KEY, 'true');
  window.location.reload();
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
