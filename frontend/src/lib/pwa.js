// HEROW como app instalable que abre sin internet (PWA).
// El service worker (public build: /sw.js) lo genera vite.config.js con la lista
// de todos los archivos del juego, para guardarlos en el celular la primera vez.
import { useEffect, useState } from 'react'
import { EVENTS, track } from './analytics'

let installEvent = null
const subs = new Set()
const notify = () => subs.forEach(fn => fn())

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
  // En desarrollo no: Vite recarga los módulos y un caché solo estorbaría.
  if (!import.meta.env.PROD) return

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // lo mostramos nosotros con un botón, en el momento adecuado
    installEvent = e
    notify()
  })
  window.addEventListener('appinstalled', () => { installEvent = null; notify() })

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        reg.installing?.addEventListener('statechange', notify)
      })
      notify()
    }).catch(() => { /* sin service worker la app funciona igual, solo que no sin internet */ })
  })
  navigator.serviceWorker.addEventListener?.('controllerchange', notify)
}

/** ¿La app ya quedó guardada en este dispositivo? y ¿se puede instalar? */
export function usePwa() {
  const [, force] = useState(0)
  const [offlineReady, setOfflineReady] = useState(false)

  useEffect(() => {
    const fn = () => force(x => x + 1)
    subs.add(fn)
    let alive = true
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.ready.then(() => { if (alive) setOfflineReady(true) }).catch(() => {})
    }
    return () => { alive = false; subs.delete(fn) }
  }, [])

  const install = async () => {
    if (!installEvent) return false
    installEvent.prompt()
    const choice = await installEvent.userChoice.catch(() => null)
    installEvent = null
    notify()
    if (choice?.outcome === 'accepted') track(EVENTS.appInstalada)
    return choice?.outcome === 'accepted'
  }

  return { canInstall: Boolean(installEvent), install, offlineReady }
}
