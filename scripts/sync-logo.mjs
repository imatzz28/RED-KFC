import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const candidatePaths = [
  'C:/Users/andres.matiz/.gemini/antigravity/brain/f3c551a1-a0d0-4c36-b50d-9830ebc3764e/.user_uploaded/media_1790096976215.png',
  'C:/Users/andres.matiz/.gemini/antigravity/brain/f3c551a1-a0d0-4c36-b50d-9830ebc3764e/.user_uploaded/media_1790096493931.png',
  'C:/Users/andres.matiz/.gemini/antigravity/brain/f3c551a1-a0d0-4c36-b50d-9830ebc3764e/.tempmediaStorage/media_1790096524235.png'
];

let found = false;

for (const p of candidatePaths) {
  if (fs.existsSync(p)) {
    const buf = fs.readFileSync(p);
    const b64 = buf.toString('base64');
    
    // Read PNG dimensions
    let width = 100;
    let height = 100;
    if (buf.length > 24) {
      width = buf.readUInt32BE(16);
      height = buf.readUInt32BE(20);
    }
    const ratio = width / height;

    const targetTs = path.resolve(rootDir, 'src/utils/logo_final.ts');
    const content = `// Auto-generated logo asset for Curves Report
export const APP_LOGO_B64 = "data:image/png;base64,${b64}";
export const APP_LOGO_WIDTH = ${width};
export const APP_LOGO_HEIGHT = ${height};
export const APP_LOGO_RATIO = ${ratio.toFixed(4)};
`;
    fs.writeFileSync(targetTs, content, 'utf8');

    const publicPath = path.resolve(rootDir, 'public/logo_curvas_reporte.png');
    fs.writeFileSync(publicPath, buf);

    // Inject base64 directly into preview_pdf.html so iframe renders it with zero CORS/CSP errors
    const previewHtmlPath = 'C:/Users/andres.matiz/.gemini/antigravity/brain/f3c551a1-a0d0-4c36-b50d-9830ebc3764e/preview_pdf.html';
    if (fs.existsSync(previewHtmlPath)) {
      let html = fs.readFileSync(previewHtmlPath, 'utf8');
      html = html.replace(/src="\.user_uploaded\/[^"]+"/g, `src="data:image/png;base64,${b64}"`);
      fs.writeFileSync(previewHtmlPath, html, 'utf8');
    }

    console.log(`[SYNC-LOGO] Logotipo sincronizado exitosamente:`);
    console.log(`  - Origen: ${p}`);
    console.log(`  - Dimensiones: ${width}x${height} (Ratio: ${ratio.toFixed(2)})`);
    console.log(`  - Destino TS: ${targetTs}`);
    console.log(`  - Destino Public: ${publicPath}`);
    found = true;
    break;
  }
}

if (!found) {
  console.log('[SYNC-LOGO] No se detectó nueva imagen en .gemini, usando logo existente.');
}
