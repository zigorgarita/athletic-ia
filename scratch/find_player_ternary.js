const fs = require('fs');
const code = fs.readFileSync('c:/Users/zigor/Desktop/indautxu-26-27/components/tactica/ABPSection.tsx', 'utf8');
const lines = code.split('\n');
lines.forEach((line, index) => {
  if (line.includes('player ? player.nombre')) {
    console.log(`${index + 1}: ${line}`);
  }
});
