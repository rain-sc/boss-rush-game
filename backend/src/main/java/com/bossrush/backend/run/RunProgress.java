package com.bossrush.backend.run;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/** A player's current boss-rush run (one row per player for Phase 3). */
@Entity
@Table(name = "run_progress")
public class RunProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long playerId;
    private Integer mapId;
    private Integer currentLevel;
    private Integer hp;
    private String status; // PLAYING, WON, LOST

    @Column(columnDefinition = "text")
    private String build; // JSON string of the accumulated build

    private Instant updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getPlayerId() { return playerId; }
    public void setPlayerId(Long playerId) { this.playerId = playerId; }

    public Integer getMapId() { return mapId; }
    public void setMapId(Integer mapId) { this.mapId = mapId; }

    public Integer getCurrentLevel() { return currentLevel; }
    public void setCurrentLevel(Integer currentLevel) { this.currentLevel = currentLevel; }

    public Integer getHp() { return hp; }
    public void setHp(Integer hp) { this.hp = hp; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getBuild() { return build; }
    public void setBuild(String build) { this.build = build; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
