const fs = require('fs');
const path = 'c:/Users/andre/OneDrive/Escritorio/Antigravity/Curvas KFC/src/features/safe-hands/SafeHands.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove state
content = content.replace(/const \[previewData, setPreviewData\] = useState[\s\S]*?;/, '');

// 2. Remove buttons in table - use a simple search and replace for the Eye button
// I'll search for the specific lines from the previous view_file
const lines = content.split('\n');
const filteredLines = lines.filter(line => {
    return !line.includes('setPreviewData({ cert, person })') && 
           !line.includes('<Eye className="w-4 h-4" />') &&
           !line.includes('title="Previsualizar"');
});

content = filteredLines.join('\n');

// 3. Remove everything between the table end and the settings modal
const tableEndTag = '</table>';
const settingsStartTag = '{/* Settings Modal */}';

const tableEndIndex = content.indexOf(tableEndTag);
const settingsStartIndex = content.indexOf(settingsStartTag);

if (tableEndIndex !== -1 && settingsStartIndex !== -1) {
    // We want to keep the divs that close the table container
    const afterTable = content.substring(tableEndIndex + tableEndTag.length);
    const containerCloseIndex = afterTable.indexOf('</div>') + 6; // first div
    const secondContainerCloseIndex = afterTable.indexOf('</div>', containerCloseIndex) + 6; // second div
    const thirdContainerCloseIndex = afterTable.indexOf('</div>', secondContainerCloseIndex) + 6; // third div
    
    const cutStart = tableEndIndex + tableEndTag.length + thirdContainerCloseIndex;
    const newContent = content.substring(0, cutStart) + '\n\n      ' + content.substring(settingsStartIndex);
    fs.writeFileSync(path, newContent);
    console.log('SafeHands.tsx cleaned up successfully');
} else {
    console.log('Could not find markers', { tableEndIndex, settingsStartIndex });
}
