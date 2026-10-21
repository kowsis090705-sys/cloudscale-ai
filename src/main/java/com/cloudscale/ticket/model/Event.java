package com.cloudscale.ticket.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "events")
@Data
public class Event {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String title;
    private String type;
    private String venue;
    @Column(name = "show_time")
    private LocalDateTime showTime;
    @Column(name = "total_seats")
    private Integer totalSeats;
}
