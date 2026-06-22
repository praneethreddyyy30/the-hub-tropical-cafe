package com.smartcafe.backend.repository;

import com.smartcafe.backend.entity.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Map;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    
    List<Feedback> findAllByOrderByCreatedAtDesc();

    @Query("SELECT AVG(f.rating) FROM Feedback f")
    Double getAverageRating();

    @Query("SELECT f.rating as rating, COUNT(f) as count FROM Feedback f GROUP BY f.rating")
    List<Map<String, Object>> getRatingDistribution();
}
