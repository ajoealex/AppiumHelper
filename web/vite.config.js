import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')
dotenv.config({ path: path.join(ROOT_DIR, '.env') })
dotenv.config({ path: path.join(ROOT_DIR, '.env.local'), override: true })

function getRequiredEnv(name) {
  const value = process.env[name]
  if (!value || !value.trim()) {
    throw new Error(`[ENV] Missing required environment variable: ${name}`)
  }
  return value.trim()
}

function getRequiredPort(name) {
  const raw = getRequiredEnv(name)
  const port = Number(raw)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`[ENV] ${name} must be an integer between 1 and 65535. Received: "${raw}"`)
  }
  return port
}

export default defineConfig(() => {
  const webHost = getRequiredEnv('WEB_HOST')
  const webPort = getRequiredPort('WEB_PORT')
  const apiHost = getRequiredEnv('API_HOST')
  const apiPort = getRequiredPort('API_PORT')
  const apiBase = `http://${apiHost}:${apiPort}`

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.API_BASE': JSON.stringify(apiBase)
    },
    server: {
      host: webHost,
      port: webPort
    }
  }
})
