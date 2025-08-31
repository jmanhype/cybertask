const line = "    write: (message: string) => logger.info(message.trim()),";
console.log('Original:', line);

const result = line
  // Remove TypeScript type annotations from function parameters
  .replace(/\(\s*(\w+)\s*:\s*[^)]+\)/g, '($1)')
  // Remove TypeScript type annotations after variable declarations
  .replace(/:\s*[A-Za-z\[\]<>|&\s]+(?=\s*[=;,\)])/g, '');

console.log('Result:', result);