package com.bossrush.backend.inventory;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {

    private final InventoryService service;

    public InventoryController(InventoryService service) {
        this.service = service;
    }

    @GetMapping
    public List<InventoryItem> list(@RequestParam(defaultValue = "1") Long playerId) {
        return service.list(playerId);
    }

    @PostMapping("/add")
    public InventoryItem add(@RequestParam(defaultValue = "1") Long playerId, @RequestBody AddRequest req) {
        return service.add(playerId, req.itemId(), req.qty() == null ? 1 : req.qty());
    }

    @PostMapping("/use")
    public UseResult use(@RequestParam(defaultValue = "1") Long playerId, @RequestBody UseRequest req) {
        return new UseResult(service.useOne(playerId, req.itemId()));
    }

    public record AddRequest(String itemId, Integer qty) {}
    public record UseRequest(String itemId) {}
    public record UseResult(boolean ok) {}
}
