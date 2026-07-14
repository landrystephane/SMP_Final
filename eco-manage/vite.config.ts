import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — chargé en premier, mis en cache longtemps
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          // i18n — séparé car lourd (dictionnaires)
          'i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          // PDF — chargé uniquement quand l'utilisateur génère un PDF
          'jspdf': ['jspdf', 'jspdf-autotable'],
          // Graphiques — chargés uniquement sur le Dashboard
          'charts': ['recharts'],
          // Cartes — chargées uniquement sur Transport
          'maps': ['leaflet', 'react-leaflet'],
        },
      },
    },
  },
})
