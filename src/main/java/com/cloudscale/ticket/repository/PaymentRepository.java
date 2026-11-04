
package com.cloudscale.ticket.repository;

import com.cloudscale.ticket.model.Payment;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PaymentRepository
        extends JpaRepository<Payment, Long> {

    Optional<Payment> findByRazorpayOrderId(
            String razorpayOrderId
    );

    Optional<Payment> findByRazorpayPaymentId(
            String razorpayPaymentId
    );

    // Prevent duplicate confirmation of the same order
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT p FROM Payment p
        WHERE p.razorpayOrderId = :orderId
    """)
    Optional<Payment> findByOrderIdForUpdate(
            @Param("orderId") String orderId
    );
}
