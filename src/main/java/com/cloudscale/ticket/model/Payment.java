package com.cloudscale.ticket.model;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments")
@Data
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Customer and event information
    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private Long eventId;

    // Razorpay order ID
    @Column(nullable = false, unique = true)
    private String razorpayOrderId;

    // Selected seats for this payment order
    // Example: "6,9"
    @Column(name = "selected_seat_ids", columnDefinition = "TEXT")
    private String selectedSeatIds;

    // Razorpay payment ID after successful payment
    @Column(unique = true)
    private String razorpayPaymentId;

    // Payment amount in INR
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false)
    private String currency = "INR";

    private String paymentMethod;

    // CREATED, CAPTURED, FAILED,
    // PARTIALLY_REFUNDED, REFUNDED
    @Column(nullable = false)
    private String status = "CREATED";

    // Total refunded amount in INR
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal refundedAmount = BigDecimal.ZERO;

    // Timestamps
    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime paidAt;

    private LocalDateTime refundedAt;
}
