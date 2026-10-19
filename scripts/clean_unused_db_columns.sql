-- =============================================================================
-- Nettoyage BDD - NOUVELLES COLONNES (Session 2)
-- Colonnes validées suite à l'audit du code mort & mécaniques dépréciées.
-- Exécutable directement sur la BDD distante (DBeaver, phpMyAdmin, etc.)
-- =============================================================================

-- 1. Salle : champs autel non persistés (gérés en mémoire via @Transient)
ALTER TABLE `salle`
  DROP COLUMN `altar_required_spirituality`,
  DROP COLUMN `altar_reward_type`,
  DROP COLUMN `altar_reward_value`;

-- 2. Spell : ancien système de variantes obsolète (remplacé par required_choice_key sur les effets)
ALTER TABLE `spell`
  DROP COLUMN `variant_id`,
  DROP COLUMN `condition_type`,
  DROP COLUMN `choice_key`;

-- 3. SpellEffect : ancien compteur de charges consumable (mécanique supprimée)
ALTER TABLE `spell_effect`
  DROP COLUMN `remaining_applications`;

-- 4. VoiePassiveEffect : ancien bonus_level orphelin et stat_affected inutilisé
ALTER TABLE `voie_passive_effect`
  DROP COLUMN `bonus_level`,
  DROP COLUMN `stat_affected`;

-- 5. SpiritualitePassiveEffect : stat_affected inutilisé
ALTER TABLE `spiritualite_passive_effect`
  DROP COLUMN `stat_affected`;

-- =============================================================================
-- RAPPEL : Colonnes de la Session 1 (DÉJÀ SUPPRIMÉES sur la BDD distante)
-- Ne pas ré-exécuter sauf sur une nouvelle base locale vierge.
-- =============================================================================
-- ALTER TABLE `equipment` DROP COLUMN `price_anomaly_name`;
-- ALTER TABLE `salle`
--   DROP COLUMN `boss_global_buff_armor`,
--   DROP COLUMN `boss_global_buff_hp_pct`,
--   DROP COLUMN `boss_global_buff_on_hit_effect`,
--   DROP COLUMN `boss_global_buff_resistance`,
--   DROP COLUMN `boss_global_buff_shield_duration`,
--   DROP COLUMN `boss_global_buff_shield_pct`,
--   DROP COLUMN `boss_global_buff_stats_duration`;
-- ALTER TABLE `spell` DROP COLUMN `zone_effect`;
-- ALTER TABLE `spell_effect` DROP COLUMN `target_expression`, DROP COLUMN `is_poison`;
