package com.bossrush.backend.farm;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FarmPlotRepository extends JpaRepository<FarmPlot, Long> {
    List<FarmPlot> findByPlayerId(Long playerId);
    Optional<FarmPlot> findByPlayerIdAndPlotIndex(Long playerId, Integer plotIndex);
}
