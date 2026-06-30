package com.bossrush.backend.equipment;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EquipmentRepository extends JpaRepository<PlayerEquipment, Long> {
    List<PlayerEquipment> findByPlayerId(Long playerId);
}
