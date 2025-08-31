const line = "import { config as env, corsConfig } from './config/environment';";
console.log('Original:', line);

const result = line.replace(/import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"];/g, (match, imports, module) => {
  // Handle mixed destructuring with aliases
  const transformedImports = imports
    .split(',')
    .map(imp => imp.trim())
    .map(imp => {
      if (imp.includes(' as ')) {
        const [original, alias] = imp.split(' as ').map(s => s.trim());
        return `${original}: ${alias}`;
      }
      return imp;
    })
    .join(', ');
  return `const { ${transformedImports} } = require('${module}');`;
});

console.log('Result:', result);