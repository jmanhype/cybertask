const line = "import { Server as SocketIOServer } from 'socket.io';";
console.log('Original:', line);
const result = line.replace(/import\s+\{\s*(\w+)\s+as\s+(\w+)\s*\}\s+from\s+['"]([^'"]+)['"];/g, "const { $1: $2 } = require('$3');");
console.log('Result:', result);