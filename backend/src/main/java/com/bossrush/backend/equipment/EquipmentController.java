package com.bossrush.backend.equipment;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
public class EquipmentController {

    private final EquipmentService service;

    public EquipmentController(EquipmentService service) {
        this.service = service;
    }

    @GetMapping("/equipment")
    public List<EquipmentService.EquipmentView> list(@RequestParam(defaultValue = "1") Long playerId) {
        return service.list(playerId);
    }

    @PostMapping("/equipment/{id}/equip")
    public List<EquipmentService.EquipmentView> equip(@RequestParam(defaultValue = "1") Long playerId,
                                                      @PathVariable Long id) {
        service.equip(playerId, id);
        return service.list(playerId);
    }

    @PostMapping("/equipment/{id}/enhance")
    public EnhanceResult enhance(@RequestParam(defaultValue = "1") Long playerId, @PathVariable Long id) {
        return new EnhanceResult(service.enhance(playerId, id));
    }

    @GetMapping("/loadout/stats")
    public EquipmentService.LoadoutStats stats(@RequestParam(defaultValue = "1") Long playerId) {
        return service.loadoutStats(playerId);
    }

    public record EnhanceResult(boolean ok) {}
}
