package com.bossrush.backend.run;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.bossrush.backend.progress.PlayerProgress;
import com.bossrush.backend.progress.PlayerProgressRepository;

import java.time.Instant;

/** Phase 3 run-progress persistence. No auth yet; defaults to player 1. */
@RestController
@RequestMapping("/api/run")
public class RunController {

    private final RunProgressRepository repo;
    private final PlayerProgressRepository progressRepo;

    public RunController(RunProgressRepository repo, PlayerProgressRepository progressRepo) {
        this.repo = repo;
        this.progressRepo = progressRepo;
    }

    /** Current run for the player, or null if none. */
    @GetMapping
    public RunProgress get(@RequestParam(defaultValue = "1") Long playerId) {
        return repo.findByPlayerId(playerId).orElse(null);
    }

    /** Upsert the player's run progress. */
    @PostMapping("/save")
    public RunProgress save(@RequestParam(defaultValue = "1") Long playerId,
                            @RequestBody SaveRequest req) {
        RunProgress r = repo.findByPlayerId(playerId).orElseGet(RunProgress::new);
        r.setPlayerId(playerId);
        r.setMapId(req.mapId());
        r.setCurrentLevel(req.currentLevel());
        r.setHp(req.hp());
        r.setStatus(req.status());
        r.setBuild(req.build());
        r.setUpdatedAt(Instant.now());

        // Clearing a map's final boss unlocks the next map.
        if ("WON".equals(req.status()) && req.mapId() != null) {
            PlayerProgress p = progressRepo.findByPlayerId(playerId).orElseGet(() -> {
                PlayerProgress np = new PlayerProgress();
                np.setPlayerId(playerId);
                np.setHighestClearedMap(0);
                return np;
            });
            if (req.mapId() > p.getHighestClearedMap()) {
                p.setHighestClearedMap(req.mapId());
                progressRepo.save(p);
            }
        }
        return repo.save(r);
    }

    public record SaveRequest(Integer mapId, Integer currentLevel, Integer hp, String status, String build) {}
}
