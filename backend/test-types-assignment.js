const line1 = "export const logger = winston.createLogger({";
const line2 = "const config: Config = getConfig();";
const line3 = "write: (message: string) => logger.info(message.trim()),";

console.log('Testing assignment (should not be affected):');
console.log('Original:', line1);
const result1 = line1
  .replace(/:\s*[A-Za-z\[\]<>|&\s]+(?=\s*[;,\)])/g, '');
console.log('Result:', result1);

console.log('\nTesting type annotation (should be removed):');
console.log('Original:', line2);
const result2 = line2
  .replace(/(const|let|var)\s+(\w+)\s*:\s*[^=]+(\s*=)/g, '$1 $2$3')
  .replace(/:\s*[A-Za-z\[\]<>|&\s]+(?=\s*[;,\)])/g, '');
console.log('Result:', result2);

console.log('\nTesting function parameter (should be handled by other regex):');
console.log('Original:', line3);
const result3 = line3
  .replace(/\(\s*(\w+)\s*:\s*[^)]+\)/g, '($1)')
  .replace(/:\s*[A-Za-z\[\]<>|&\s]+(?=\s*[;,\)])/g, '');
console.log('Result:', result3);