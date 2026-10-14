package generation.grimoire.repository.pve;

import generation.grimoire.entity.pve.Donjon;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DonjonRepository extends JpaRepository<Donjon, Long> {
    List<Donjon> findAllByOrderByDisplayOrderAsc();

    @Modifying(clearAutomatically = true)
    @Query("UPDATE Donjon d SET d.displayOrder = :displayOrder WHERE d.id = :id")
    void updateDisplayOrder(@Param("id") Long id, @Param("displayOrder") int displayOrder);
}
