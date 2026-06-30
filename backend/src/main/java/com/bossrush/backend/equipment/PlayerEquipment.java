package com.bossrush.backend.equipment;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** An owned equipment instance (references a Catalog definition by defId). */
@Entity
@Table(name = "player_equipment")
public class PlayerEquipment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long playerId;
    private String defId;
    private Integer enhanceLevel;
    private Boolean equipped;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getPlayerId() { return playerId; }
    public void setPlayerId(Long playerId) { this.playerId = playerId; }

    public String getDefId() { return defId; }
    public void setDefId(String defId) { this.defId = defId; }

    public Integer getEnhanceLevel() { return enhanceLevel; }
    public void setEnhanceLevel(Integer enhanceLevel) { this.enhanceLevel = enhanceLevel; }

    public Boolean getEquipped() { return equipped; }
    public void setEquipped(Boolean equipped) { this.equipped = equipped; }
}
