const fs = require('fs');
const path = 'c:/Users/andre/OneDrive/Escritorio/Antigravity/Curvas KFC/src/features/safe-hands/SafeHands.tsx';
let content = fs.readFileSync(path, 'utf8');

// Update Left alignment
content = content.replace(/left-\[35.8%\]/g, 'left-[36.3%]');

// Update Date top and color
content = content.replace(/top-\[66.25%\]/g, 'top-[63.75%]');
content = content.replace(/text-red-600 italic tracking-tight leading-none/g, 'text-slate-800 italic tracking-tight leading-none');

// Update QR block and add unique code
const qrSearch = 'Validable</p>\n                 </div>';
const qrReplace = 'Validable</p>\n                 </div>\n\n                 {/* Código único bajo el QR */}\n                 <div className="absolute right-[8%] top-[67%] w-[20%]">\n                    <p className="text-[5px] font-medium text-slate-400 text-center uppercase tracking-tighter leading-none">{previewData.cert.certificateCode}</p>\n                 </div>';

content = content.replace(qrSearch, qrReplace);

fs.writeFileSync(path, content);
console.log('File updated successfully with new alignment, date color and unique code');
