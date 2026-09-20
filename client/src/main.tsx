import { PlatformProvider } from './lib/platform-catalog'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PlatformProvider><App /></PlatformProvider>
  </React.StrictMode>,
)

import './experience.css'

import './profile-theme.css'
