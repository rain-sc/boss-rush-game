package com.bossrush.backend.progress;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Long-term per-player progression (highest map cleared). */
@Entity
@Table(name = "player_progress")
public class PlayerProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long playerId;
    private Integer highestClearedMap; // 0 = none cleared yet (map 1 always playable)

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getPlayerId() { return playerId; }
    public void setPlayerId(Long playerId) { this.playerId = playerId; }

    public Integer getHighestClearedMap() { return highestClearedMap; }
    public void setHighestClearedMap(Integer highestClearedMap) { this.highestClearedMap = highestClearedMap; }
}
