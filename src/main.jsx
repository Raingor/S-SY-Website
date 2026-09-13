import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import App from './App'
import './styles.css'

// Keep previously shared hash links working on the hosted site while using clean
// URLs for crawlers. Local file:// opening continues to use HashRouter.
function normalizeLegacyHash() {
  if (window.location.protocol !== 'file:' && window.location.hash.startsWith('#/')) {
    window.history.replaceState(null, '', `${window.location.hash.slice(1)}${window.location.search}`)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }
}
normalizeLegacyHash()
window.addEventListener('hashchange', normalizeLegacyHash)

const Router = window.location.protocol === 'file:' ? HashRouter : BrowserRouter

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>,
)
