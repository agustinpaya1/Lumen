const fs = require('fs');
const path = require('path');
const { globSync } = require('crypto') ? require('fs') : null; // Native glob sync not in old node, I'll just use a simple recursive read.
const glob = require('glob'); // Not guaranteed, wait I can just read the 5 known files.

const components = ['home', 'camera', 'onboarding', 'admin'];

for (const comp of components) {
  const scssPath = `src/app/features/${comp}/${comp}.scss`;
  const htmlPath = `src/app/features/${comp}/${comp}.html`;
  const tsPath = `src/app/features/${comp}/${comp}.ts`;
  
  if (!fs.existsSync(scssPath) || !fs.existsSync(htmlPath)) continue;
  
  const scssContent = fs.readFileSync(scssPath, 'utf8');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  const tsContent = fs.readFileSync(tsPath, 'utf8');
  
  // Extract all class selectors (naively)
  const classMatches = scssContent.match(/\.[a-zA-Z0-9_-]+/g) || [];
  const uniqueClasses = [...new Set(classMatches.map(c => c.substring(1)))];
  
  const unused = [];
  for (const cls of uniqueClasses) {
    if (
      !htmlContent.includes(cls) && 
      !tsContent.includes(cls) &&
      !cls.includes(':') && !cls.includes('#')
    ) {
      unused.push(cls);
    }
  }
  if (unused.length > 0) {
    console.log(`Unused in ${comp}:`, unused.join(', '));
  } else {
    console.log(`No unused classes in ${comp}`);
  }
}
