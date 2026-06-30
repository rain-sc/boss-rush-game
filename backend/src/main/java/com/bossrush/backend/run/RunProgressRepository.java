package com.bossrush.backend.run;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RunProgressRepository extends JpaRepository<RunProgress, Long> {
    Optional<RunProgress> findByPlayerId(Long playerId);
}
