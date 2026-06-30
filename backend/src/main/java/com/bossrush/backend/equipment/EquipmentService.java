package com.bossrush.backend.equipment;

import com.bossrush.backend.catalog.Catalog;
import com.bossrush.backend.inventory.InventoryService;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class EquipmentService {

    private final EquipmentRepository repo;
    private final InventoryService inventory;

    public EquipmentService(EquipmentRepository repo, InventoryService inventory) {
        this.repo = repo;
        this.inventory = inventory;
    }

    public record EquipmentView(
            Long instanceId, String defId, String name, String slot,
            int enhanceLevel, boolean equipped,
            int attack, int maxHp, Map<String, Integer> enhanceCost) {}

    public record LoadoutStats(int attack, int maxHp) {}

    public List<EquipmentView> list(Long playerId) {
        List<EquipmentView> out = new ArrayList<>();
        for (PlayerEquipment e : repo.findByPlayerId(playerId)) {
            Catalog.EquipmentDef def = Catalog.equipment(e.getDefId());
            if (def == null) continue;
            int lvl = e.getEnhanceLevel();
            out.add(new EquipmentView(
                    e.getId(), def.id(), def.name(), def.slot(), lvl, Boolean.TRUE.equals(e.getEquipped()),
                    def.baseAttack() + def.attackPerLevel() * lvl,
                    def.baseMaxHp() + def.maxHpPerLevel() * lvl,
                    def.enhanceCost()));
        }
        return out;
    }

    public void equip(Long playerId, Long instanceId) {
        PlayerEquipment target = repo.findById(instanceId).orElse(null);
        if (target == null || !target.getPlayerId().equals(playerId)) return;
        Catalog.EquipmentDef def = Catalog.equipment(target.getDefId());
        if (def == null) return;
        // unequip others in the same slot
        for (PlayerEquipment e : repo.findByPlayerId(playerId)) {
            Catalog.EquipmentDef d = Catalog.equipment(e.getDefId());
            if (d != null && d.slot().equals(def.slot()) && Boolean.TRUE.equals(e.getEquipped())) {
                e.setEquipped(false);
                repo.save(e);
            }
        }
        target.setEquipped(true);
        repo.save(target);
    }

    public boolean enhance(Long playerId, Long instanceId) {
        PlayerEquipment target = repo.findById(instanceId).orElse(null);
        if (target == null || !target.getPlayerId().equals(playerId)) return false;
        Catalog.EquipmentDef def = Catalog.equipment(target.getDefId());
        if (def == null || !inventory.has(playerId, def.enhanceCost())) return false;
        inventory.deduct(playerId, def.enhanceCost());
        target.setEnhanceLevel(target.getEnhanceLevel() + 1);
        repo.save(target);
        return true;
    }

    public LoadoutStats loadoutStats(Long playerId) {
        int attack = 0;
        int maxHp = 0;
        for (PlayerEquipment e : repo.findByPlayerId(playerId)) {
            if (!Boolean.TRUE.equals(e.getEquipped())) continue;
            Catalog.EquipmentDef def = Catalog.equipment(e.getDefId());
            if (def == null) continue;
            int lvl = e.getEnhanceLevel();
            attack += def.baseAttack() + def.attackPerLevel() * lvl;
            maxHp += def.baseMaxHp() + def.maxHpPerLevel() * lvl;
        }
        return new LoadoutStats(attack, maxHp);
    }

    public PlayerEquipment create(Long playerId, String defId) {
        PlayerEquipment e = new PlayerEquipment();
        e.setPlayerId(playerId);
        e.setDefId(defId);
        e.setEnhanceLevel(0);
        e.setEquipped(false);
        return repo.save(e);
    }
}
