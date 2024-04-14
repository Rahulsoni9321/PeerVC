import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { SocketcontextProvider } from './Context/SocketContext.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <SocketcontextProvider>
    <App />
    </SocketcontextProvider>
    )
