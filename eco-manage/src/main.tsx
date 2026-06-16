import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './utils/i18n'
import App from './App.tsx'
import { dataService } from './utils/dataService'
import { initSaaSBridge } from './saasApiBridge'

initSaaSBridge();
dataService.init().catch(console.error);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
