package generation.grimoire.repository;

import generation.grimoire.entity.achievement.UserCustomAchievement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserCustomAchievementRepository extends JpaRepository<UserCustomAchievement, Long> {
    List<UserCustomAchievement> findByUser_Id(Long userId);
    boolean existsByUser_IdAndTitle(Long userId, String title);
    Optional<UserCustomAchievement> findByUser_IdAndTitle(Long userId, String title);
}
