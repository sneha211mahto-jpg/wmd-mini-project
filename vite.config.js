import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    watch: {
      ignored: ['**/src/assets/shared-living-room.jpg'],
    },
  },
})
