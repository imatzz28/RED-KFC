import fs from 'fs';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Auto-sync uploaded logo to logo_final.ts and public
try {
  const candidatePaths = [
    'C:/Users/andres.matiz/.gemini/antigravity/brain/f3c551a1-a0d0-4c36-b50d-9830ebc3764e/.user_uploaded/media_1790096976215.png',
    'C:/Users/andres.matiz/.gemini/antigravity/brain/f3c551a1-a0d0-4c36-b50d-9830ebc3764e/.user_uploaded/media_1790096493931.png'
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      const buf = fs.readFileSync(p);
      const b64 = buf.toString('base64');
      let width = 100;
      let height = 100;
      if (buf.length > 24) {
        width = buf.readUInt32BE(16);
        height = buf.readUInt32BE(20);
      }
      const ratio = width / height;
      const targetTs = path.resolve(__dirname, './src/utils/logo_final.ts');
      const content = `// Auto-generated logo asset for Curves Report
export const APP_LOGO_B64 = "data:image/png;base64,${b64}";
export const APP_LOGO_WIDTH = ${width};
export const APP_LOGO_HEIGHT = ${height};
export const APP_LOGO_RATIO = ${ratio.toFixed(4)};
`;
      fs.writeFileSync(targetTs, content, 'utf8');
      const publicPath = path.resolve(__dirname, './public/logo_curvas_reporte.png');
      fs.writeFileSync(publicPath, buf);

      // Inject base64 directly into preview_pdf.html so iframe renders it with zero CORS/CSP errors
      const previewHtmlPath = 'C:/Users/andres.matiz/.gemini/antigravity/brain/f3c551a1-a0d0-4c36-b50d-9830ebc3764e/preview_pdf.html';
      if (fs.existsSync(previewHtmlPath)) {
        let html = fs.readFileSync(previewHtmlPath, 'utf8');
        html = html.replace(/src="\.user_uploaded\/[^"]+"/g, `src="data:image/png;base64,${b64}"`);
        fs.writeFileSync(previewHtmlPath, html, 'utf8');
      }
      break;
    }
  }
} catch (e) {
  // Silent fallback in production/Vercel
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },

    build: {
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('pdfmake') || id.includes('jspdf')) {
                return 'vendor-pdf';
              }
              if (id.includes('xlsx')) {
                return 'vendor-xlsx';
              }
              if (id.includes('recharts') || id.includes('d3')) {
                return 'vendor-charts';
              }
              if (id.includes('@supabase') || id.includes('localforage')) {
                return 'vendor-data';
              }
            }
          }
        }
      }
    }
  };
});

