
package com.cloudscale.ticket.model;

import jakarta.persistence.*;

import lombok.Data;
import lombok.ToString;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "bookings")
@Data
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Customer details
    @Column(name = "user_id")
    private Long userId;

    // Event details
    @Column(name = "event_id")
    private Long eventId;

    // Booked seat
    @Column(name = "seat_id")
    private Long seatId;

    // Linked Razorpay payment
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Payment payment;

    // CONFIRMED or CANCELLED
    private String status = "CONFIRMED";

    // Razorpay refund reference
    @Column(name = "razorpay_refund_id", unique = true)
    private String razorpayRefundId;

    // Example: PENDING, PROCESSED, FAILED
    @Column(name = "refund_status")
    private String refundStatus;

    // Refund amount in INR
    @Column(name = "refund_amount", precision = 12, scale = 2)
    private BigDecimal refundAmount;

    // Booking creation timestamp
    @Column(
        name = "created_at",
        insertable = false,
        updatable = false
    )
    private LocalDateTime createdAt;
}
