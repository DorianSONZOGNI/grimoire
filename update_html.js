const fs = require('fs');
const path = require('path');
const dir = 'src/main/resources/static';

const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove navbar scripts from wherever they are
    content = content.replace(/<script[^>]*src="\/js\/components\/navbar\.js"[^>]*><\/script>/g, '');
    content = content.replace(/<script[^>]*src='\/js\/components\/navbar\.js'[^>]*><\/script>/g, '');
    
    // Add view-transition meta if not exists
    if (!content.includes('name="view-transition"')) {
        content = content.replace('<head>', '<head>\n    <meta name="view-transition" content="same-origin">');
    }
    
    // Inject navbar script into head
    content = content.replace('</head>', '    <script src="/js/components/navbar.js"></script>\n</head>');
    
    fs.writeFileSync(filePath, content);
    console.log('Updated ' + file);
}
