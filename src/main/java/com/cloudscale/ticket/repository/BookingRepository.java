
package com.cloudscale.ticket.repository;

import com.cloudscale.ticket.model.Booking;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    // Get bookings for a user
    List<Booking> findByUserId(Long userId);

    // Check whether event has bookings
    boolean existsByEventId(Long eventId);

    // NEW: Get bookings linked to a Razorpay payment
    List<Booking> findByPaymentId(Long paymentId);
}
