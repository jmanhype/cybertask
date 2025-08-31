const line1 = "export const config = getConfig();";
const line2 = "export const logger = winston.createLogger({";

console.log('Testing simple export:');
console.log('Original:', line1);
const result1 = line1
  .replace(/export\s+(const|let|var)\s+(\w+)\s*=\s*(.+);?/g, (match, keyword, name, value) => {
    return `${keyword} ${name} = ${value};\nmodule.exports.${name} = ${name};`;
  });
console.log('Result:', result1);

console.log('\nTesting multi-line export:');
console.log('Original:', line2);
const result2 = line2
  .replace(/export\s+(const|let|var)\s+(\w+)\s*=\s*(.+);?/g, (match, keyword, name, value) => {
    return `${keyword} ${name} = ${value};\nmodule.exports.${name} = ${name};`;
  });
console.log('Result:', result2);