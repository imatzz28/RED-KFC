const fs = require('fs');
const path = require('path');

const root = __dirname;
const src = path.join(root, 'src');

const dirs = [
    'src',
    'src/features/admin',
    'src/features/dashboard',
    'src/features/reports',
    'src/features/stores',
    'src/features/auth',
    'src/components/layout',
    'src/services',
    'src/types',
    'src/utils'
];

dirs.forEach(d => {
    const p = path.join(root, d);
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

const fileMap = {
    'App.tsx': 'src/App.tsx',
    'index.tsx': 'src/index.tsx',
    'types.ts': 'src/types/index.ts',
    'dataService.ts': 'src/services/dataService.ts',
    'constants.ts': 'src/utils/constants.ts',
    'logo_final.ts': 'src/utils/logo_final.ts',
    'components/AdminPanel.tsx': 'src/features/admin/AdminPanel.tsx',
    'components/Dashboard.tsx': 'src/features/dashboard/Dashboard.tsx',
    'components/EmployeeList.tsx': 'src/features/admin/EmployeeList.tsx',
    'components/EntriesExitsReport.tsx': 'src/features/reports/EntriesExitsReport.tsx',
    'components/GradeEditor.tsx': 'src/features/dashboard/GradeEditor.tsx',
    'components/MyStores.tsx': 'src/features/stores/MyStores.tsx',
    'components/Login.tsx': 'src/features/auth/Login.tsx',
    'components/Header.tsx': 'src/components/layout/Header.tsx',
    'components/Sidebar.tsx': 'src/components/layout/Sidebar.tsx',
};

// 1. Read files and fix imports in memory
const processedFiles = {};

for (const [oldPath, newPath] of Object.entries(fileMap)) {
    const fullOldPath = path.join(root, oldPath);
    if (fs.existsSync(fullOldPath)) {
        let content = fs.readFileSync(fullOldPath, 'utf8');

        // Replace imports using regex
        content = content.replace(/from\s+['"](?:\.\/|\.\.\/)+types['"]/g, "from '@/types'");
        content = content.replace(/from\s+['"](?:\.\/|\.\.\/)+dataService['"]/g, "from '@/services/dataService'");
        content = content.replace(/from\s+['"](?:\.\/|\.\.\/)+constants['"]/g, "from '@/utils/constants'");
        content = content.replace(/from\s+['"](?:\.\/|\.\.\/)+logo_final['"]/g, "from '@/utils/logo_final'");

        // Update specific components imports
        content = content.replace(/from\s+['"](?:\.\/|\.\.\/)+components\/AdminPanel['"]/g, "from '@/features/admin/AdminPanel'");
        content = content.replace(/from\s+['"](?:\.\/|\.\.\/)+components\/Dashboard['"]/g, "from '@/features/dashboard/Dashboard'");
        content = content.replace(/from\s+['"](?:\.\/|\.\.\/)+components\/EmployeeList['"]/g, "from '@/features/admin/EmployeeList'");
        content = content.replace(/from\s+['"](?:\.\/|\.\.\/)+components\/EntriesExitsReport['"]/g, "from '@/features/reports/EntriesExitsReport'");
        content = content.replace(/from\s+['"](?:\.\/|\.\.\/)+components\/GradeEditor['"]/g, "from '@/features/dashboard/GradeEditor'");
        content = content.replace(/from\s+['"](?:\.\/|\.\.\/)+components\/MyStores['"]/g, "from '@/features/stores/MyStores'");
        content = content.replace(/from\s+['"](?:\.\/|\.\.\/)+components\/Login['"]/g, "from '@/features/auth/Login'");
        content = content.replace(/from\s+['"](?:\.\/|\.\.\/)+components\/Header['"]/g, "from '@/components/layout/Header'");
        content = content.replace(/from\s+['"](?:\.\/|\.\.\/)+components\/Sidebar['"]/g, "from '@/components/layout/Sidebar'");

        // Handle without /components if they were relative between components
        content = content.replace(/from\s+['"]\.\/EmployeeList['"]/g, "from '@/features/admin/EmployeeList'");
        content = content.replace(/from\s+['"]\.\/GradeEditor['"]/g, "from '@/features/dashboard/GradeEditor'");

        // App in index.tsx
        content = content.replace(/from\s+['"]\.\/App['"]/g, "from '@/App'");

        processedFiles[newPath] = content;
    }
}

// 2. Write new files and delete old ones
for (const [newPath, content] of Object.entries(processedFiles)) {
    fs.writeFileSync(path.join(root, newPath), content, 'utf8');
}

for (const [oldPath, _] of Object.entries(fileMap)) {
    const fullOldPath = path.join(root, oldPath);
    if (fs.existsSync(fullOldPath)) {
        fs.unlinkSync(fullOldPath);
    }
}

// Maybe remove components dir if empty
try {
    fs.rmdirSync(path.join(root, 'components'));
} catch (e) { }

console.log("Refactoring complete");
