package com.smartcafe.backend.controller;

import com.smartcafe.backend.entity.Feedback;
import com.smartcafe.backend.repository.FeedbackRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class FeedbackController {

    private final FeedbackRepository feedbackRepository;

    // Public API: Submit feedback
    @PostMapping("/feedback/submit")
    public ResponseEntity<Feedback> submitFeedback(@RequestBody Feedback feedback) {
        if (feedback.getRating() < 1 || feedback.getRating() > 5) {
            throw new IllegalArgumentException("Rating must be between 1 and 5.");
        }
        return ResponseEntity.ok(feedbackRepository.save(feedback));
    }

    // Public/Admin API: Get all reviews (sorted by newest)
    @GetMapping("/feedback")
    public ResponseEntity<List<Feedback>> getAllFeedback() {
        return ResponseEntity.ok(feedbackRepository.findAllByOrderByCreatedAtDesc());
    }

    // Admin API: Get rating summary metrics
    @GetMapping("/admin/feedback/summary")
    public ResponseEntity<Map<String, Object>> getFeedbackSummary() {
        Double avgRating = feedbackRepository.getAverageRating();
        long totalReviews = feedbackRepository.count();
        List<Map<String, Object>> distribution = feedbackRepository.getRatingDistribution();

        Map<String, Object> summary = new HashMap<>();
        summary.put("averageRating", avgRating != null ? Math.round(avgRating * 10.0) / 10.0 : 0.0);
        summary.put("totalReviews", totalReviews);
        summary.put("ratingDistribution", distribution);

        return ResponseEntity.ok(summary);
    }
}
