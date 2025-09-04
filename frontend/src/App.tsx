import { ConfigProvider } from '@arco-design/web-react'
import enUS from '@arco-design/web-react/es/locale/en-US'
import { Toaster } from './shared/components/ui'
import TradingDashboard from './components/TradingDashboard'

function App() {
  return (
    <ConfigProvider locale={enUS}>
      <TradingDashboard />
      <Toaster />
    </ConfigProvider>
  )
}

export default App
