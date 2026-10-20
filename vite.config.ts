import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Auto-sync verify logo for PublicValidation (/verify)
try {
  const verifyLogoCandidates = [
    'C:/Users/andres.matiz/.gemini/antigravity/brain/8eae4990-9456-4140-8948-2a46ab3a3002/.user_uploaded/media_1792468515788_5b0f47aa.png'
  ];
  for (const vp of verifyLogoCandidates) {
    if (fs.existsSync(vp)) {
      const vbuf = fs.readFileSync(vp);
      const vb64 = vbuf.toString('base64');
      const vdataUri = `data:image/png;base64,${vb64}`;

      // Write to public in RED
      const p1 = path.resolve(__dirname, './public/kfc_verify_logo.png');
      fs.writeFileSync(p1, vbuf);

      // Write to public in red-kfc (GitLab)
      const p2 = 'c:/Users/andres.matiz/OneDrive - International Food Services - Grupo KFC/Escritorio/A2M Labs/RED_Gitlab/red-kfc/public/kfc_verify_logo.png';
      try { fs.writeFileSync(p2, vbuf); } catch (_) {}

      // Write TS in RED
      const ts1 = path.resolve(__dirname, './src/features/safe-hands/verifyLogo.ts');
      fs.writeFileSync(ts1, `export const VERIFY_LOGO = "${vdataUri}";\n`, 'utf8');

      // Write TS in red-kfc
      const ts2 = 'c:/Users/andres.matiz/OneDrive - International Food Services - Grupo KFC/Escritorio/A2M Labs/RED_Gitlab/red-kfc/src/features/safe-hands/verifyLogo.ts';
      try { fs.writeFileSync(ts2, `export const VERIFY_LOGO = "${vdataUri}";\n`, 'utf8'); } catch (_) {}
      break;
    }
  }
} catch (e) {
  // Silent fallback
}

// Auto-sync carnet template for Safe Hands (templateBase64.ts)
try {
  const carnetCandidates = [
    'C:/Users/andres.matiz/.gemini/antigravity/brain/8eae4990-9456-4140-8948-2a46ab3a3002/.user_uploaded/media_1792471270216_db5a5006.png',
    path.resolve(__dirname, './public/plantilla_carnet.png'),
    path.resolve(__dirname, './public/plantilla_carnet.jpg'),
    path.resolve(__dirname, './public/carnet_template.png'),
    path.resolve(__dirname, './public/carnet_template.jpg'),
    path.resolve(__dirname, './public/template_carnet.png'),
    path.resolve(__dirname, './public/template_carnet.jpg'),
    path.resolve(__dirname, './public/Carnet de Manipulación - 1.png'),
    path.resolve(__dirname, './public/carnet.png'),
    path.resolve(__dirname, './public/carnet.jpg'),
    path.resolve(__dirname, './src/features/safe-hands/plantilla_carnet.png'),
    path.resolve(__dirname, './src/features/safe-hands/carnet_template.png')
  ];
  for (const cp of carnetCandidates) {
    if (fs.existsSync(cp)) {
      const cbuf = fs.readFileSync(cp);
      const cb64 = cbuf.toString('base64');
      const ext = path.extname(cp).toLowerCase() === '.jpg' || path.extname(cp).toLowerCase() === '.jpeg' ? 'jpeg' : 'png';
      const cdataUri = `data:image/${ext};base64,${cb64}`;

      const ts1 = path.resolve(__dirname, './src/features/safe-hands/utils/templateBase64.ts');
      fs.writeFileSync(ts1, `export const templateBase64 = "${cdataUri}";\n`, 'utf8');

      const ts2 = 'c:/Users/andres.matiz/OneDrive - International Food Services - Grupo KFC/Escritorio/A2M Labs/RED_Gitlab/red-kfc/src/features/safe-hands/utils/templateBase64.ts';
      try { fs.writeFileSync(ts2, `export const templateBase64 = "${cdataUri}";\n`, 'utf8'); } catch (_) {}
      break;
    }
  }
} catch (e) {}

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

