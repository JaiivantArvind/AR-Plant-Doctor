const fs = require('fs');
const path = require('path');
const arMarkerGenerator = require('ar-marker-generator');

const generatePattern = typeof arMarkerGenerator === 'function' 
  ? arMarkerGenerator 
  : (arMarkerGenerator.generatePattern || arMarkerGenerator.encodeImage || arMarkerGenerator.default);

for (let i = 1; i <= 5; i++) {
  const svgPath = path.join(__dirname, 'markers', `marker-${i}.svg`);
  const pattPath = path.join(__dirname, 'markers', `marker-${i}.patt`);
  
  const svgContent = fs.readFileSync(svgPath, 'utf8');
  const pattContent = generatePattern(svgContent);
  
  fs.writeFileSync(pattPath, pattContent, 'utf8');
  console.log(`Generated markers/marker-${i}.patt`);
}
