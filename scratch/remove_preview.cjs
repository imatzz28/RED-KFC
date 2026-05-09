const fs = require('fs');
const path = 'c:/Users/andre/OneDrive/Escritorio/Antigravity/Curvas KFC/src/features/safe-hands/SafeHands.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove previewData state
content = content.replace('const [previewData, setPreviewData] = useState<{ cert: SafeHandsCert, person: SafeHandsPerson } | null>(null);', '');

// 2. Remove Eye and X imports if not used elsewhere (optional, but keep it simple)

// 3. Remove "Previsualizar" button in table
const eyeButton = `<button 
                                onClick={() => setPreviewData({ cert, person })}
                                className="p-2 bg-white border border-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-all shadow-sm"
                                title="Previsualizar"
                              >
                                <Eye className="w-4 h-4" />
                              </button>`;
content = content.replace(eyeButton, '');

// 4. Remove the Preview Modal block (from {/* Preview Modal */} to end of block)
const modalStart = '{/* Preview Modal */}';
const modalEnd = ')}'; // This is tricky, I'll look for the whole block carefully.
// I will find the block by string matching since it is very specific.

const modalRegex = /\{\/\* Preview Modal \*\/\}[\s\S]*?\{previewData \&\& \([\s\S]*?\}\)/;
content = content.replace(modalRegex, '');

fs.writeFileSync(path, content);
console.log('Preview functionality removed from SafeHands.tsx');
