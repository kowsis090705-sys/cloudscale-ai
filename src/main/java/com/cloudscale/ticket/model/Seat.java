package com.cloudscale.ticket.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "seats")
@Data
public class Seat {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "event_id")
    private Long eventId;
    @Column(name = "seat_no")
    private String seatNo;
    private String status = "AVAILABLE";
    @Version                       // optimistic locking: stops double booking
    private Long version;
}
