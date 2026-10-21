package com.cloudscale.ticket.repository;

import com.cloudscale.ticket.model.Seat;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SeatRepository extends JpaRepository<Seat, Long> {
    List<Seat> findByEventId(Long eventId);
    long countByEventIdAndStatus(Long eventId, String status);
}
