import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const EMPTY_CONTENT = {
  settings: {}, home: {}, countries: [], guides: [], routes: [], destinations: [], cities: [],
  attractions: [], sampleItineraries: [], destinationCategories: [], experiences: [],
}
const SiteContentContext = createContext(null)

export function SiteContentProvider({ children }) {
  const [countryId, setCountryId] = useState('greece')
  const [content, setContent] = useState(EMPTY_CONTENT)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setStatus('loading')
    setError('')
    try {
      const response = await fetch(`/api/content?country=${encodeURIComponent(countryId)}`)
      if (!response.ok) throw new Error(`内容服务暂不可用（${response.status}）`)
      const payload = await response.json()
      setContent({ ...EMPTY_CONTENT, ...payload })
      setStatus('ready')
    } catch (cause) {
      setContent(EMPTY_CONTENT)
      setError(cause instanceof Error ? cause.message : '内容服务暂不可用')
      setStatus('error')
    }
  }, [countryId])

  useEffect(() => { if (window.location.protocol !== 'file:') void reload(); else { setStatus('error'); setError('请通过网站地址访问内容服务') } }, [reload])

  const value = useMemo(() => ({ content, status, error, countryId, setCountryId, reload }), [content, status, error, countryId, reload])
  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>
}

export function useSiteContent() {
  const value = useContext(SiteContentContext)
  if (!value) throw new Error('useSiteContent must be used inside SiteContentProvider')
  return value
}

export function visibleRecords(records = []) {
  return records.filter((item) => item && item.enabled !== false && item.status !== 'unpublished' && item.status !== 'archived')
}
