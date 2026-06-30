package com.bossrush.backend.inventory;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/** Shared inventory mutations (used by gathering, fishing, farming harvest). */
@Service
public class InventoryService {

    private final InventoryRepository repo;

    public InventoryService(InventoryRepository repo) {
        this.repo = repo;
    }

    public List<InventoryItem> list(Long playerId) {
        return repo.findByPlayerId(playerId);
    }

    public InventoryItem add(Long playerId, String itemId, int qty) {
        InventoryItem item = repo.findByPlayerIdAndItemId(playerId, itemId).orElseGet(() -> {
            InventoryItem i = new InventoryItem();
            i.setPlayerId(playerId);
            i.setItemId(itemId);
            i.setQty(0);
            return i;
        });
        item.setQty(item.getQty() + qty);
        return repo.save(item);
    }

    /** True if the player has at least the given quantities of every item. */
    public boolean has(Long playerId, Map<String, Integer> cost) {
        for (Map.Entry<String, Integer> e : cost.entrySet()) {
            InventoryItem item = repo.findByPlayerIdAndItemId(playerId, e.getKey()).orElse(null);
            if (item == null || item.getQty() < e.getValue()) return false;
        }
        return true;
    }

    /** Deduct the given quantities (caller should have checked has()). */
    public void deduct(Long playerId, Map<String, Integer> cost) {
        for (Map.Entry<String, Integer> e : cost.entrySet()) {
            InventoryItem item = repo.findByPlayerIdAndItemId(playerId, e.getKey()).orElseThrow();
            item.setQty(item.getQty() - e.getValue());
            repo.save(item);
        }
    }

    /** Consume one of an item if available; returns whether it succeeded. */
    public boolean useOne(Long playerId, String itemId) {
        InventoryItem item = repo.findByPlayerIdAndItemId(playerId, itemId).orElse(null);
        if (item == null || item.getQty() <= 0) return false;
        item.setQty(item.getQty() - 1);
        repo.save(item);
        return true;
    }
}
