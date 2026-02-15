import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const DEFAULT_GLOBAL_CONF = {
  web: {
    host: '127.0.0.1',
    port: 5173
  },
  api: {
    host: '127.0.0.1',
    port: 3001
  }
}

const shouldLoadGlobalConf = process.env.NO_GLOBAL_CONF !== '1'
let globalConf = DEFAULT_GLOBAL_CONF

if (shouldLoadGlobalConf) {
  try {
    const loadedGlobalConf = require('../global.conf.js')
    globalConf = loadedGlobalConf || DEFAULT_GLOBAL_CONF
  } catch (error) {
    if (error?.code !== 'MODULE_NOT_FOUND') {
      throw error
    }
  }
}

export default defineConfig(() => {
  const webHost = process.env.WEB_HOST || globalConf.web.host
  const webPort = Number(process.env.WEB_PORT || globalConf.web.port)
  const apiHost = process.env.VITE_API_HOST || globalConf.api.host
  const apiPort = Number(process.env.VITE_API_PORT || globalConf.api.port)
  const apiProtocol = process.env.VITE_API_PROTOCOL || 'http'
  const apiBase = process.env.VITE_API_BASE || `${apiProtocol}://${apiHost}:${apiPort}`

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_API_BASE': JSON.stringify(apiBase)
    },
    server: {
      host: webHost,
      port: webPort
    }
  }
})
