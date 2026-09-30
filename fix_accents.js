const fs = require('fs');

const file = 'src/main/resources/static/js/pages/dungeons.js';
let content = fs.readFileSync(file, 'utf8');

const replacements = {
    'Ã©': 'é',
    'Ã¨': 'è',
    'Ãª': 'ê',
    'Ã«': 'ë',
    'Ã\xA0': 'à', // Ã followed by non-breaking space 0xA0
    'Ã ': 'à',   // just in case it's a normal space (0x20 is wrong but let's be safe)
    'Ã¢': 'â',
    'Ã®': 'î',
    'Ã¯': 'ï',
    'Ã´': 'ô',
    'Ã¶': 'ö',
    'Ã»': 'û',
    'Ã¼': 'ü',
    'Ã§': 'ç',
    'Ã‰': 'É',
    'Ãˆ': 'È',
    'ÃŠ': 'Ê',
    'Ã€': 'À',
    'Ã‚': 'Â',
    'ÃŽ': 'Î',
    'Ã”': 'Ô',
    'Ã›': 'Û',
    'Ã‡': 'Ç'
};

for (const [bad, good] of Object.entries(replacements)) {
    content = content.split(bad).join(good);
}

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed dungeons.js');
