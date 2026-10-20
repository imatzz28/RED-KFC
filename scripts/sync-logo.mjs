import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const candidatePaths = [
  path.resolve(rootDir, 'public/logo_reporte.png'),
  path.resolve(rootDir, 'public/logo_curvas_reporte.png'),
  path.normalize('C:/Users/andres.matiz/.gemini/antigravity/brain/f3c551a1-a0d0-4c36-b50d-9830ebc3764e/.user_uploaded/media_1790096976215.png'),
  path.normalize('C:/Users/andres.matiz/.gemini/antigravity/brain/f3c551a1-a0d0-4c36-b50d-9830ebc3764e/.user_uploaded/media_1790096493931.png'),
  path.normalize('C:/Users/andres.matiz/.gemini/antigravity/brain/f3c551a1-a0d0-4c36-b50d-9830ebc3764e/.tempmediaStorage/media_1790096524235.png')
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

      const p1 = path.resolve(rootDir, 'public/kfc_verify_logo.png');
      fs.writeFileSync(p1, vbuf);

      const p2 = 'c:/Users/andres.matiz/OneDrive - International Food Services - Grupo KFC/Escritorio/A2M Labs/RED_Gitlab/red-kfc/public/kfc_verify_logo.png';
      try { fs.writeFileSync(p2, vbuf); } catch (_) {}

      const ts1 = path.resolve(rootDir, 'src/features/safe-hands/verifyLogo.ts');
      fs.writeFileSync(ts1, `export const VERIFY_LOGO = "${vdataUri}";\n`, 'utf8');

      const ts2 = 'c:/Users/andres.matiz/OneDrive - International Food Services - Grupo KFC/Escritorio/A2M Labs/RED_Gitlab/red-kfc/src/features/safe-hands/verifyLogo.ts';
      try { fs.writeFileSync(ts2, `export const VERIFY_LOGO = "${vdataUri}";\n`, 'utf8'); } catch (_) {}
      
      console.log(`[SYNC-LOGO] Logo Verify (/verify) sincronizado exitosamente.`);
      break;
    }
  }
} catch (err) {
  console.error('[SYNC-LOGO] Error al sincronizar logo verify:', err);
}

