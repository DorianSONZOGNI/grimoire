const fs = require('fs');

const files = [
    {name: 'dungeons.html', page: 'dungeon'},
    {name: 'armory.html', page: 'armory'},
    {name: 'vault.html', page: 'vault'},
    {name: 'shop.html', page: 'shop'},
    {name: 'shop-admin.html', page: 'admin'},
    {name: 'pve-admin.html', page: 'admin'},
    {name: 'secrets.html', page: 'secret'},
    {name: 'alchemy.html', page: 'alchemy'},
    {name: 'alchemy-admin.html', page: 'admin'}
];

const basePath = 'c:/Users/doria/Desktop/Project/grimoire/src/main/resources/static/';

files.forEach(f => {
    let content = fs.readFileSync(basePath + f.name, 'utf8');
    
    // Replace <header class="top-header"> ... </header>
    const headerRegex = /<header class="top-header">[\s\S]*?<\/header>/;
    content = content.replace(headerRegex, `<app-navbar active-page="${f.page}"></app-navbar>`);
    
    // Add script tag before </body>
    if (!content.includes('navbar.js')) {
        content = content.replace(/<\/body>/, '    <script src="/js/components/navbar.js"></script>\n</body>');
    }
    
    fs.writeFileSync(basePath + f.name, content);
    console.log('Updated ' + f.name);
});
