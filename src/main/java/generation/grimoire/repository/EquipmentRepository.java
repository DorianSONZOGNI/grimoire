package generation.grimoire.repository;

import generation.grimoire.entity.Equipment;
import generation.grimoire.enumeration.EquipmentSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.cache.annotation.Cacheable;

import org.springframework.lang.NonNull;
import java.util.List;
import java.util.Optional;

@Repository
public interface EquipmentRepository extends JpaRepository<Equipment, Long> {
    @NonNull
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"personnage", "user"})
    List<Equipment> findAll();

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"personnage", "user"})
    List<Equipment> findByPersonnageId(Long personnageId);

    Optional<Equipment> findByPersonnageIdAndSlot(Long personnageId, EquipmentSlot slot);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"personnage", "user"})
    List<Equipment> findByPersonnageIsNullAndUser_Username(String username);

    List<Equipment> findByPersonnageIsNull();

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"personnage", "user"})
    List<Equipment> findByUser_Username(String username);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"personnage", "user"})
    List<Equipment> findByOwnerUsername(String username);

    @Cacheable("equipmentTemplateByName")
    Equipment findFirstByNameAndIsTemplateTrueOrderByIdAsc(String name);

    @Cacheable("equipmentTemplates")
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"personnage", "user"})
    List<Equipment> findByIsTemplateTrue();

    @Cacheable("equipmentShopTemplates")
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"personnage", "user"})
    List<Equipment> findByIsTemplateTrueAndAvailableInShopTrue();

    List<Equipment> findByName(String name);

    @Cacheable("equipmentDistinctNames")
    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT e.name FROM Equipment e")
    List<String> findDistinctNames();
}
