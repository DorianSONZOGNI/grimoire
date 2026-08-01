const fs = require('fs');
let content = fs.readFileSync('src/main/resources/static/js/dungeons.js', 'utf8');

// Remove showNotif
content = content.replace(/function showNotif\(message, isError = false\) \{[\s\S]*?\}\s*\n/, '// showNotif -> utils.js\n');

// Remove DEFAULT_SECRETS_META
content = content.replace(/const DEFAULT_SECRETS_META = \[\s*\{ name: "Secret du Chaos"[\s\S]*?\];\s*/, '');

fs.writeFileSync('src/main/resources/static/js/dungeons.js', content);
console.log('Removed from dungeons.js');
