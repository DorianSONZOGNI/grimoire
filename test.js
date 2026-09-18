let name = "L'Aube";
let specialItemNameArg = `'${name.replace(/'/g, "\\'").replace(/"/g, '&quot;')}'`;
let buttonHtml = `<button onclick="openBuyModal(0, '...', 0, ${specialItemNameArg})"></button>`;
console.log(buttonHtml);
