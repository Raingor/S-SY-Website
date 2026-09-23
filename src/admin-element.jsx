import { useEffect, useRef } from 'react'
import { mountElementAdmin } from './admin-vue/mount'

// Keep the public site's React router intact while mounting the Vue 2 admin
// application only inside the existing protected admin route.
export default function ElementAdminBridge() {
  const host = useRef(null)

  useEffect(() => {
    const unmount = mountElementAdmin(host.current)
    return () => unmount?.()
  }, [])

  return <div ref={host} className="element-admin-host" />
}
