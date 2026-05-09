const fs = require('fs');
const path = 'c:/Users/andre/OneDrive/Escritorio/Antigravity/Curvas KFC/src/features/safe-hands/SafeHands.tsx';
let content = fs.readFileSync(path, 'utf8');

// Update background
content = content.replace('url("/Plantilla Carnet.png")', 'url(${templateBase64})');

// Update coordinates
content = content.replace('top-[38.5%]', 'top-[36.5%]');
content = content.replace('top-[56%]', 'top-[49.5%]');
content = content.replace('top-[73%]', 'top-[64.5%]');

// Update QR border
content = content.replace(
  'border-2 border-slate-50 rounded-lg bg-white/50 backdrop-blur-[2px]">',
  'border-2 border-red-600 rounded-sm bg-white/50 backdrop-blur-[2px]">'
);
content = content.replace(
  'text-slate-400 text-center uppercase tracking-tighter">QR Validable</p>',
  'text-red-600 text-center uppercase tracking-tighter leading-tight font-black">QR<br/>Validable</p>'
);

fs.writeFileSync(path, content);
console.log('File updated successfully');
