package generation.grimoire.repository.pve;

import generation.grimoire.entity.pve.LootEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.cache.annotation.Cacheable;

import java.util.List;

public interface LootEntryRepository extends JpaRepository<LootEntry, Long> {
    @Cacheable("lootEntriesByEquipment")
    List<LootEntry> findByEquipmentId(Long equipmentId);
    void deleteByEquipmentId(Long equipmentId);
}
