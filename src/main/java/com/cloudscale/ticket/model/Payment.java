
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

    // Customer and event details
    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private Long eventId;

    // Razorpay transaction identifiers
    @Column(nullable = false, unique = true)
    private String razorpayOrderId;

    @Column(unique = true)
    private String razorpayPaymentId;

    // Payment information
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false)
    private String currency = "INR";

    private String paymentMethod;

    // CREATED, CAPTURED, FAILED, REFUNDED,
    // PARTIALLY_REFUNDED
    @Column(nullable = false)
    private String status = "CREATED";

    // Total amount refunded so far
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal refundedAmount = BigDecimal.ZERO;

    // Timestamps
    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime paidAt;

    private LocalDateTime refundedAt;
}
