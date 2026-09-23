const log1 = "Vous avez sacrifié l'anomalie : Cristal.";
console.log(log1.match(/sacrifi. l'item : (.*) !/) || log1.match(/sacrifi. l'anomalie : (.*)\./));

const log2 = "Objet trouvé : Cristal (Item Spécial) !";
console.log(log2.match(/Objet trouv. : (.*?) \(/));

const log3 = "Effet appliqué : +10 PV et +5 XP sur Dorian.";
console.log(log3.match(/Effet appliqu. : ([-+0-9]+) PV et ([-+0-9]+) XP sur (.*)\./));

const log4 = "L'autel a offert l'équipement : Cape du Vent (ajouté au groupe).";
console.log(log4.match(/L'autel a offert l'.quipement : (.*) !/) || log4.match(/L'autel a offert l'.quipement : (.*) \(ajout. au groupe\)\./) || log4.match(/L'autel a offert l'.quipement : (.*) \(envoy. au coffre\)\./));
