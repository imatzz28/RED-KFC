const fs = require('fs');
const path = 'c:/Users/andre/OneDrive/Escritorio/Antigravity/Curvas KFC/src/features/safe-hands/SafeHands.tsx';
let content = fs.readFileSync(path, 'utf8');

// Align names and titles perfectly
content = content.replace(/left-\[35.8%\]/g, 'left-[36.3%]');

// Date higher and black
content = content.replace(/text-red-600 font-bold/g, 'text-slate-800 font-bold');

// Insert unique code block after the QR div
const qrEnd = 'QR<br/>Validable</p>\n                 </div>';
const codeBlock = '\n\n                 {/* Código único bajo el QR */}\n                 <div className="absolute right-[8%] top-[67%] w-[20%]">\n                    <p className="text-[5px] font-medium text-slate-400 text-center uppercase tracking-tighter leading-none">{previewData.cert.certificateCode}</p>\n                 </div>';

if (content.indexOf('Código único bajo el QR') === -1) {
    content = content.replace(qrEnd, qrEnd + codeBlock);
}

fs.writeFileSync(path, content);
console.log('File updated successfully');
