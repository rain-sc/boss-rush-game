package com.bossrush.backend.catalog;

import java.util.List;
import java.util.Map;

/** Static Phase 5 catalog: crafting recipes and equipment definitions. */
public final class Catalog {

    public record EquipmentDef(
            String id, String name, String slot,
            int baseAttack, int baseMaxHp,
            int attackPerLevel, int maxHpPerLevel,
            Map<String, Integer> enhanceCost) {}

    public record Recipe(
            String id, String name, String type, // POTION | EQUIPMENT
            Map<String, Integer> cost,
            String output, String outputName) {}

    public static final Map<String, EquipmentDef> EQUIPMENT = Map.of(
            "iron_sword", new EquipmentDef("iron_sword", "鐵劍", "WEAPON", 8, 0, 3, 0, Map.of("ore", 1)),
            "leather_armor", new EquipmentDef("leather_armor", "皮甲", "ARMOR", 0, 30, 0, 12, Map.of("herb", 1)));

    public static final List<Recipe> RECIPES = List.of(
            new Recipe("potion_small", "小補血藥水", "POTION", Map.of("herb", 1, "carrot", 1), "potion_small", "小補血藥水"),
            new Recipe("iron_sword", "鐵劍", "EQUIPMENT", Map.of("wood", 2, "ore", 2), "iron_sword", "鐵劍"),
            new Recipe("leather_armor", "皮甲", "EQUIPMENT", Map.of("wood", 1, "herb", 2), "leather_armor", "皮甲"));

    public static Recipe recipe(String id) {
        return RECIPES.stream().filter(r -> r.id().equals(id)).findFirst().orElse(null);
    }

    public static EquipmentDef equipment(String id) {
        return EQUIPMENT.get(id);
    }

    private Catalog() {}
}
