package generation.grimoire.repository;

import generation.grimoire.entity.achievement.UserCustomAchievement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserCustomAchievementRepository extends JpaRepository<UserCustomAchievement, Long> {
    List<UserCustomAchievement> findByUser_Id(Long userId);
    boolean existsByUser_IdAndTitle(Long userId, String title);
    Optional<UserCustomAchievement> findByUser_IdAndTitle(Long userId, String title);
    List<UserCustomAchievement> findByUser_IdAndNotifiedFalse(Long userId);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE UserCustomAchievement uca SET uca.notified = true WHERE uca.user.id = :userId AND uca.notified = false")
    void markAllAsNotified(@Param("userId") Long userId);
}
