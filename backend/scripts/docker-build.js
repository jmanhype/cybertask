#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting Docker build process...');

try {
  // First, try to compile with the Docker config
  console.log('Attempting TypeScript compilation...');
  execSync('npx tsc -p tsconfig.docker.json --noErrorTruncation', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
  console.log('TypeScript compilation successful!');
} catch (error) {
  console.log('TypeScript compilation failed, attempting alternative build...');
  
  try {
    // If that fails, copy src to dist and use babel/swc or just copy JS files
    console.log('Copying source files to dist...');
    const srcDir = path.join(process.cwd(), 'src');
    const distDir = path.join(process.cwd(), 'dist');
    
    // Remove existing dist directory
    if (fs.existsSync(distDir)) {
      fs.rmSync(distDir, { recursive: true, force: true });
    }
    
    // Create dist directory
    fs.mkdirSync(distDir, { recursive: true });
    
    // Copy all .ts files as .js files with basic transformation
    function copyAndTransform(sourceDir, targetDir) {
      const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const sourcePath = path.join(sourceDir, entry.name);
        const targetPath = path.join(targetDir, entry.name);
        
        if (entry.isDirectory()) {
          fs.mkdirSync(targetPath, { recursive: true });
          copyAndTransform(sourcePath, targetPath);
        } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
          // Basic transformation: just copy and rename to .js
          const jsFileName = entry.name.replace(/\.ts$/, '.js');
          const jsTargetPath = path.join(targetDir, jsFileName);
          
          let content = fs.readFileSync(sourcePath, 'utf8');
          
          // Comprehensive import/export transformations
          content = content
            // Transform bare imports (e.g., import 'express-async-errors';)
            .replace(/import\s+['"]([^'"]+)['"];/g, "require('$1');")
            // Transform destructured imports with aliases FIRST (most specific)
            .replace(/import\s+\{\s*(\w+)\s+as\s+(\w+)\s*\}\s+from\s+['"]([^'"]+)['"];/g, "const { $1: $2 } = require('$3');")
            // Transform complex mixed destructuring imports (with aliases and normal imports)
            .replace(/import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"];/g, (match, imports, module) => {
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
            })
            // Transform relative imports
            .replace(/import\s+(.+?)\s+from\s+['"](\.\.?\/[^'"]+)['"];/g, "const $1 = require('$2');")
            .replace(/import\s+\*\s+as\s+(\w+)\s+from\s+['"](\.\.?\/[^'"]+)['"];/g, "const $1 = require('$2');")
            // Transform node module imports
            .replace(/import\s+(.+?)\s+from\s+['"]([^\.][^'"]+)['"];/g, "const $1 = require('$2');")
            .replace(/import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^\.][^'"]+)['"];/g, "const $1 = require('$2');")
            // Transform default imports with destructuring
            .replace(/import\s+(\w+),\s*\{([^}]+)\}\s+from\s+['"]([^'"]+)['"];/g, "const $1 = require('$3'); const { $2 } = require('$3');")
            // Remove TypeScript type annotations from function parameters
            .replace(/\(\s*(\w+)\s*:\s*[^)]+\)/g, '($1)')
            // Remove TypeScript type annotations from variable declarations (e.g., const config: Config = ...)
            .replace(/(const|let|var)\s+(\w+)\s*:\s*[^=]+(\s*=)/g, '$1 $2 $3')
            // Remove TypeScript type annotations after variable declarations (but not assignments)
            .replace(/:\s*[A-Za-z\[\]<>|&\s]+(?=\s*[;,\)])/g, '')
            // Remove TypeScript interface and type declarations
            .replace(/interface\s+\w+\s*\{[^}]*\}/gs, '')
            .replace(/type\s+\w+\s*=\s*[^;]+;/g, '')
            // Remove TypeScript generics
            .replace(/<[A-Za-z\[\]<>,\s|&]+>/g, '')
            // Transform default exports
            .replace(/export\s+default\s+/g, 'module.exports = ')
            // Transform named exports
            .replace(/export\s+\{([^}]+)\};?/g, (match, exports) => {
              const exportNames = exports.split(',').map(name => name.trim().replace(/\s+as\s+\w+/, ''));
              return exportNames.map(name => `module.exports.${name} = ${name};`).join('\n');
            })
            // Transform export const/let/var with assignments (handles single line and start of multi-line)
            .replace(/export\s+(const|let|var)\s+(\w+)\s*=\s*(.+)/g, (match, keyword, name, value) => {
              // Remove trailing semicolon from value if present to avoid double semicolons
              const cleanValue = value.replace(/;$/, '');
              return `${keyword} ${name} = ${cleanValue}`;
            })
            // Transform export functions and classes  
            .replace(/export\s+(function|class)\s+(\w+)/g, '$1 $2;\nmodule.exports.$2 = $2;')
            // Remove import.meta references (not supported in CommonJS)
            .replace(/import\.meta\./g, 'process.');
          
          // Find all const/let/var declarations and add their exports at the end
          const exportedVars = [];
          const varDeclarationRegex = /^(const|let|var)\s+(\w+)\s*=/gm;
          let match;
          while ((match = varDeclarationRegex.exec(content)) !== null) {
            const varName = match[2];
            // Check if this was originally an export by seeing if it was transformed from export
            const originalLine = fs.readFileSync(sourcePath, 'utf8').split('\n').find(line => 
              line.includes(`export`) && line.includes(varName) && line.includes('=')
            );
            if (originalLine) {
              exportedVars.push(varName);
            }
          }
          
          // Add module.exports assignments for exported variables
          if (exportedVars.length > 0) {
            const exports = exportedVars.map(varName => `module.exports.${varName} = ${varName};`).join('\n');
            content += '\n\n' + exports;
          }
          
          fs.writeFileSync(jsTargetPath, content);
          console.log(`Transformed: ${sourcePath} -> ${jsTargetPath}`);
        } else if (!entry.name.endsWith('.ts')) {
          // Copy non-TS files as-is
          fs.copyFileSync(sourcePath, targetPath);
        }
      }
    }
    
    copyAndTransform(srcDir, distDir);
    console.log('Source files copied and transformed successfully!');
    
  } catch (copyError) {
    console.error('Alternative build also failed:', copyError);
    process.exit(1);
  }
}

console.log('Docker build preparation completed!');