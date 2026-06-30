package com.bossrush.backend.inventory;

import org.springframework.stereotype.Service;

import java.util.List;

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
}
