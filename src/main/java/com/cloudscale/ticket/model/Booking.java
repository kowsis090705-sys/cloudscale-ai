package com.cloudscale.ticket.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "bookings")
@Data
public class Booking {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "user_id")
    private Long userId;
    @Column(name = "event_id")
    private Long eventId;
    @Column(name = "seat_id")
    private Long seatId;
    private String status = "CONFIRMED";
    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;
}
