import { ConfigProvider } from '@arco-design/web-react'
import enUS from '@arco-design/web-react/es/locale/en-US'
import TradingDashboard from './components/TradingDashboard'

function App() {
  return (
    <ConfigProvider locale={enUS}>
      <TradingDashboard />
    </ConfigProvider>
  )
}

export default App
