package com.cloudscale.ticket.repository;

import com.cloudscale.ticket.model.Event;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EventRepository extends JpaRepository<Event, Long> {
}
