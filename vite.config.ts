import { defineConfig } from 'vite'
import type { ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { exec } from 'child_process'
import type { IncomingMessage, ServerResponse } from 'http'

// Custom plugin to handle data updates locally
const updateDataPlugin = () => ({
  name: 'update-data-plugin',
  configureServer(server: ViteDevServer) {
    server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
      if (req.url === '/api/update') {
        console.log('Received request to update PMP data from Excel...')
        
        exec('powershell -ExecutionPolicy Bypass -File export-data.ps1', (error, _stdout, _stderr) => {
          if (error) {
            console.error(`Error running export-data.ps1: ${error.message}`)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: false, error: error.message }))
            return
          }
          
          console.log('PMP data export completed successfully!')
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ success: true }))
        })
      } else {
        next()
      }
    })
  }
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), updateDataPlugin()],
})
