package com.bossrush.backend.craft;

import com.bossrush.backend.catalog.Catalog;
import com.bossrush.backend.equipment.EquipmentService;
import com.bossrush.backend.inventory.InventoryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/craft")
public class CraftController {

    private final InventoryService inventory;
    private final EquipmentService equipment;

    public CraftController(InventoryService inventory, EquipmentService equipment) {
        this.inventory = inventory;
        this.equipment = equipment;
    }

    @GetMapping("/recipes")
    public List<Catalog.Recipe> recipes() {
        return Catalog.RECIPES;
    }

    @PostMapping
    public CraftResult craft(@RequestParam(defaultValue = "1") Long playerId, @RequestBody CraftRequest req) {
        Catalog.Recipe recipe = Catalog.recipe(req.recipeId());
        if (recipe == null) return new CraftResult(false, "unknown recipe");
        if (!inventory.has(playerId, recipe.cost())) return new CraftResult(false, "材料不足");
        inventory.deduct(playerId, recipe.cost());
        if ("EQUIPMENT".equals(recipe.type())) {
            equipment.create(playerId, recipe.output());
        } else {
            inventory.add(playerId, recipe.output(), 1);
        }
        return new CraftResult(true, null);
    }

    public record CraftRequest(String recipeId) {}
    public record CraftResult(boolean ok, String reason) {}
}
