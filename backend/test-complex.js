const line = "import { config as env, corsConfig } from './config/environment';";
console.log('Original:', line);
const result = line.replace(/import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]([^'"]+)['"];/g, "const { $1 } = require('$2');");
console.log('Result:', result);