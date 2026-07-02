package com.bossrush.backend.progress;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/progress")
public class ProgressController {

    private final PlayerProgressRepository repo;

    public ProgressController(PlayerProgressRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public ProgressView get(@RequestParam(defaultValue = "1") Long playerId) {
        int highest = repo.findByPlayerId(playerId).map(PlayerProgress::getHighestClearedMap).orElse(0);
        return new ProgressView(highest);
    }

    public record ProgressView(int highestClearedMap) {}
}
