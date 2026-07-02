package com.bossrush.backend.progress;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PlayerProgressRepository extends JpaRepository<PlayerProgress, Long> {
    Optional<PlayerProgress> findByPlayerId(Long playerId);
}
