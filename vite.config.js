// Fix: Import defineConfig from 'vitest/config' to get correct typings for the 'test' property and remove the need for the triple-slash directive.
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 8080
  },
  preview: {
    port: 8080
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [], // Add setup files if needed
  },
})
