const fs = require('fs');
const path = 'c:/Users/andre/OneDrive/Escritorio/Antigravity/Curvas KFC/src/features/safe-hands/SafeHands.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove previewData state and its import if Eye or X are not used
content = content.replace(/const \[previewData, setPreviewData\] = useState[\s\S]*?;/, '');

// 2. Remove the "Previsualizar" button in the table
// Since the button has been partially mangled, I'll use a more generic regex
content = content.replace(/<button\s+onClick=\{\(\) => setPreviewData[\s\S]*?<\/button>/g, '');

// 3. Remove the entire Preview Modal block
// I'll look for everything from {/* Preview Modal */} down to the end of that conditional block
const previewBlockRegex = /\{\/\* Preview Modal \*\/\}[\s\S]*?\{previewData \&\& \([\s\S]*?\)\}/g;
content = content.replace(previewBlockRegex, '');

// 4. Clean up any leftover mangled bits (like the stray ` } } > )
content = content.replace(/` \}\}\s+>\s+<div[\s\S]*?<\/div>\s+<\/div>/, '');

// Actually, it's safer to just remove everything from the end of the table to the start of the Settings Modal
const tableEnd = '</tbody>\n            </table>\n          </div>\n        )\}\n      </div>';
const settingsStart = '{/* Settings Modal */}';

const middlePartRegex = new RegExp(`${tableEnd}[\\s\\S]*?${settingsStart}`);
content = content.replace(middlePartRegex, tableEnd + '\n\n      ' + settingsStart);

fs.writeFileSync(path, content);
console.log('SafeHands.tsx cleaned up successfully');
