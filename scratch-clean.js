const fs = require('fs');

const files = [
    {name: 'index.html'},
    {name: 'dungeons.html'},
    {name: 'armory.html'},
    {name: 'vault.html'},
    {name: 'shop.html'},
    {name: 'shop-admin.html'},
    {name: 'pve-admin.html'},
    {name: 'secrets.html'},
    {name: 'alchemy.html'},
    {name: 'alchemy-admin.html'},
    {name: 'combat.html'}
];

const basePath = 'c:/Users/doria/Desktop/Project/grimoire/src/main/resources/static/';

files.forEach(f => {
    let content = fs.readFileSync(basePath + f.name, 'utf8');
    
    // Remove all notification div
    content = content.replace(/<div class="notification".*?<\/div>/g, '');
    
    // Remove all modals
    const modalRegex = /<div[^>]*class="vault-modal-overlay"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g;
    content = content.replace(modalRegex, '');
    // Wait, regex for balanced divs is hard. We can just use a trick:
    // the modals end right before <style> or <script> or another modal.
    // Let's use a simpler approach: finding `<div id="xyzModal" class="vault-modal-overlay">` and removing it.
    
    // It's safer to just replace them manually via regex because they have a specific structure.
    content = content.replace(/<!--.*?Modal.*?-->/gi, '');
    
    // A modal starts with <div id="somethingModal" class="vault-modal-overlay">
    // and ends with </div>\n    </div>\n    </div>
    content = content.replace(/<div id="[^"]+" class="vault-modal-overlay">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g, '');
    
    // Also remove the <style> block that contains vault-modal-overlay
    content = content.replace(/<style>\s*\.vault-modal-overlay[\s\S]*?<\/style>/g, '');

    fs.writeFileSync(basePath + f.name, content);
    console.log('Cleaned ' + f.name);
});
