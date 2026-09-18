-- Script BDD pour marquer comme "vus" (claim) les secrets (rang 2 et 3)
-- afin de supprimer le badge rouge pour les utilisateurs qui ne les ont pas cliqués.

-- Pour le niveau 2
INSERT IGNORE INTO user_claimed_secret_rewards (user_id, secret_level_key)
SELECT user_id, CONCAT(secret_name, ':2')
FROM user_unlocked_secrets
WHERE level >= 2;

-- Pour le niveau 3 (si applicable)
INSERT IGNORE INTO user_claimed_secret_rewards (user_id, secret_level_key)
SELECT user_id, CONCAT(secret_name, ':3')
FROM user_unlocked_secrets
WHERE level >= 3;

-- Note : IGNORE permet d'ignorer les erreurs de duplication au cas où
-- l'utilisateur aurait déjà cliqué sur le secret.
