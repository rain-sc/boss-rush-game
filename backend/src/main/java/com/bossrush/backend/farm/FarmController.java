package com.bossrush.backend.farm;

import com.bossrush.backend.inventory.InventoryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

/** Real-time farming: plant sets readyAt; harvest only succeeds once ready. */
@RestController
@RequestMapping("/api/farm")
public class FarmController {

    private final FarmPlotRepository repo;
    private final InventoryService inventory;

    public FarmController(FarmPlotRepository repo, InventoryService inventory) {
        this.repo = repo;
        this.inventory = inventory;
    }

    @GetMapping
    public List<FarmPlot> list(@RequestParam(defaultValue = "1") Long playerId) {
        return repo.findByPlayerId(playerId);
    }

    @PostMapping("/plant")
    public FarmPlot plant(@RequestParam(defaultValue = "1") Long playerId, @RequestBody PlantRequest req) {
        FarmPlot plot = repo.findByPlayerIdAndPlotIndex(playerId, req.plotIndex()).orElseGet(FarmPlot::new);
        Instant now = Instant.now();
        plot.setPlayerId(playerId);
        plot.setPlotIndex(req.plotIndex());
        plot.setCropItemId(req.cropItemId());
        plot.setPlantedAt(now);
        plot.setReadyAt(now.plusSeconds(req.growSeconds()));
        return repo.save(plot);
    }

    @PostMapping("/harvest")
    public HarvestResult harvest(@RequestParam(defaultValue = "1") Long playerId, @RequestBody HarvestRequest req) {
        FarmPlot plot = repo.findByPlayerIdAndPlotIndex(playerId, req.plotIndex()).orElse(null);
        if (plot == null || plot.getReadyAt() == null || Instant.now().isBefore(plot.getReadyAt())) {
            return new HarvestResult(false, null);
        }
        String crop = plot.getCropItemId();
        inventory.add(playerId, crop, 1);
        repo.delete(plot);
        return new HarvestResult(true, crop);
    }

    public record PlantRequest(Integer plotIndex, String cropItemId, Long growSeconds) {}
    public record HarvestRequest(Integer plotIndex) {}
    public record HarvestResult(boolean harvested, String item) {}
}
