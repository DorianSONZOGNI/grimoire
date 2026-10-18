package generation.grimoire.repository;

import generation.grimoire.entity.achievement.UserAchievement;
import generation.grimoire.enumeration.AchievementType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserAchievementRepository extends JpaRepository<UserAchievement, Long> {
    List<UserAchievement> findByUserId(Long userId);
    Optional<UserAchievement> findByUserIdAndAchievement(Long userId, AchievementType achievement);
}
