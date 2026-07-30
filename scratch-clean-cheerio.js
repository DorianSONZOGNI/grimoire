const fs = require('fs');
const cheerio = require('cheerio');

const files = [
    'index.html',
    'dungeons.html',
    'armory.html',
    'vault.html',
    'shop.html',
    'shop-admin.html',
    'pve-admin.html',
    'secrets.html',
    'alchemy.html',
    'alchemy-admin.html',
    'combat.html'
];

const basePath = 'c:/Users/doria/Desktop/Project/grimoire/src/main/resources/static/';

const modalsToRemove = [
    '#deleteSpellModal',
    '#deleteConfirmModal',
    '#buyConfirmModal',
    '#fleeConfirmModal',
    '#consumeTargetModal',
    '#deletePersonnageModal',
    '#buyRosterModal',
    '#notif'
];

files.forEach(f => {
    let content = fs.readFileSync(basePath + f, 'utf8');
    const $ = cheerio.load(content, { xmlMode: false, decodeEntities: false });
    
    // Remove targeted modals
    modalsToRemove.forEach(selector => {
        $(selector).remove();
    });

    // Remove notification
    $('.notification').remove();

    // Re-serialize html
    let newHtml = $.html();
    
    // Remove redundant <style> content
    newHtml = newHtml.replace(/<style>\s*\.vault-modal-overlay[\s\S]*?<\/style>/g, '');
    newHtml = newHtml.replace(/<style>\s*\.magic-rock[\s\S]*?<\/style>/g, '');

    fs.writeFileSync(basePath + f, newHtml);
    console.log('Cleaned ' + f);
});
