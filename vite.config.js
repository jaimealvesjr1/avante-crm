import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Aumentamos o limite do aviso para 1MB (já que 500kb é muito estrito hoje em dia)
    chunkSizeWarningLimit: 1000, 
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Se o código vier de uma biblioteca (node_modules), vamos separá-lo
          if (id.includes('node_modules')) {
            
            // Ficheiro 1: Só para as bibliotecas de exportação (MUITO PESADAS)
            if (id.includes('xlsx') || id.includes('jspdf') || id.includes('html2canvas')) {
              return 'export-vendor';
            }
            
            // Ficheiro 2: Só para o Firebase
            if (id.includes('firebase')) {
              return 'firebase-vendor';
            }
            
            // Ficheiro 3: Só para os gráficos (Recharts)
            if (id.includes('recharts')) {
              return 'chart-vendor';
            }
            
            // Ficheiro 4: Restante (React, Lucide, etc)
            return 'react-vendor';
          }
        }
      }
    }
  }
})
