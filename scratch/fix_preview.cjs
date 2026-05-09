const fs = require('fs');
const path = 'c:/Users/andre/OneDrive/Escritorio/Antigravity/Curvas KFC/src/features/safe-hands/SafeHands.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix background image syntax
content = content.replace(/backgroundImage: 'url\(\$\{templateBase64\}\)'/g, 'backgroundImage: `url(${templateBase64})`');
content = content.replace(/backgroundImage: "url\(\$\{templateBase64\}\)"/g, 'backgroundImage: `url(${templateBase64})`');

// Update coordinates to new values
content = content.replace(/top-\[36.5%\]/g, 'top-[38.25%]');
content = content.replace(/top-\[49.5%\]/g, 'top-[51.25%]');
content = content.replace(/top-\[64.5%\]/g, 'top-[66.25%]');

// Update QR block
content = content.replace(
  'absolute right-[8%] top-[37.5%] w-[21%]',
  'absolute right-[7.5%] top-[39.25%] w-[18.3%]'
);

content = content.replace(
  'border-2 border-red-600 rounded-sm',
  'border-2 border-red-600 rounded-lg'
);

fs.writeFileSync(path, content);
console.log('File updated successfully');
