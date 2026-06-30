package com.bossrush.backend.farm;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/** A planted crop in a farm plot. Growth is real-time via readyAt. */
@Entity
@Table(name = "farm_plot")
public class FarmPlot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long playerId;
    private Integer plotIndex;
    private String cropItemId;
    private Instant plantedAt;
    private Instant readyAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getPlayerId() { return playerId; }
    public void setPlayerId(Long playerId) { this.playerId = playerId; }

    public Integer getPlotIndex() { return plotIndex; }
    public void setPlotIndex(Integer plotIndex) { this.plotIndex = plotIndex; }

    public String getCropItemId() { return cropItemId; }
    public void setCropItemId(String cropItemId) { this.cropItemId = cropItemId; }

    public Instant getPlantedAt() { return plantedAt; }
    public void setPlantedAt(Instant plantedAt) { this.plantedAt = plantedAt; }

    public Instant getReadyAt() { return readyAt; }
    public void setReadyAt(Instant readyAt) { this.readyAt = readyAt; }
}
