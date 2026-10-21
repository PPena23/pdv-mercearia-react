import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { DadosProvider } from './store/DadosProvider'
import { CaixaProvider } from './store/CaixaProvider'
import { ToastProvider } from './components/ui'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <DadosProvider>
        <CaixaProvider>
          <App />
        </CaixaProvider>
      </DadosProvider>
    </ToastProvider>
  </StrictMode>,
)
