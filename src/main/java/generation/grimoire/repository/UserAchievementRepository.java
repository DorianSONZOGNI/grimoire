package generation.grimoire.repository;

import generation.grimoire.entity.achievement.UserAchievement;
import generation.grimoire.enumeration.AchievementType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserAchievementRepository extends JpaRepository<UserAchievement, Long> {
    List<UserAchievement> findByUserId(Long userId);
    Optional<UserAchievement> findByUserIdAndAchievement(Long userId, AchievementType achievement);
    List<UserAchievement> findByUserIdAndUnlockedTrueAndNotifiedFalse(Long userId);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE UserAchievement ua SET ua.notified = true WHERE ua.user.id = :userId AND ua.notified = false")
    void markAllAsNotified(@Param("userId") Long userId);
}
