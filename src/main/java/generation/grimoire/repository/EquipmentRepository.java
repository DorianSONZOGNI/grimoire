package generation.grimoire.repository;

import generation.grimoire.entity.Equipment;
import generation.grimoire.enumeration.EquipmentSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.cache.annotation.Cacheable;

import java.util.List;
import java.util.Optional;

@Repository
public interface EquipmentRepository extends JpaRepository<Equipment, Long> {

    List<Equipment> findByPersonnageId(Long personnageId);

    Optional<Equipment> findByPersonnageIdAndSlot(Long personnageId, EquipmentSlot slot);

    List<Equipment> findByPersonnageIsNullAndUser_Username(String username);

    List<Equipment> findByPersonnageIsNull();

    List<Equipment> findByUser_Username(String username);

    List<Equipment> findByOwnerUsername(String username);

    @Cacheable("equipmentTemplateByName")
    Equipment findFirstByNameAndIsTemplateTrueOrderByIdAsc(String name);

    @Cacheable("equipmentTemplates")
    List<Equipment> findByIsTemplateTrue();

    @Cacheable("equipmentShopTemplates")
    List<Equipment> findByIsTemplateTrueAndAvailableInShopTrue();

    List<Equipment> findByName(String name);

    @Cacheable("equipmentDistinctNames")
    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT e.name FROM Equipment e")
    List<String> findDistinctNames();
}
