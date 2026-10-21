package com.cloudscale.ticket.service;

import com.cloudscale.ticket.model.Booking;
import com.cloudscale.ticket.model.Seat;
import com.cloudscale.ticket.repository.BookingRepository;
import com.cloudscale.ticket.repository.SeatRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final SeatRepository seatRepo;
    private final BookingRepository bookingRepo;

    @Transactional
    public Booking book(Long userId, Long seatId)
    {
        if (userId == null || userId <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid user ID"
            );
        }
        if (seatId == null || seatId <= 0) {
    throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Invalid seat ID"
    );
}

        Seat seat = seatRepo.findById(seatId).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Seat not found"));

        if (!"AVAILABLE".equals(seat.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Seat already booked");
        }

        seat.setStatus("BOOKED");
        seatRepo.saveAndFlush(seat);   // version check happens here

        Booking b = new Booking();
        b.setUserId(userId);
        b.setEventId(seat.getEventId());
        b.setSeatId(seatId);
        return bookingRepo.save(b);
    }

    @Transactional
    public Booking cancel(Long bookingId) {
        Booking b = bookingRepo.findById(bookingId).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));

        if ("CANCELLED".equals(b.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Already cancelled");
        }

        Seat seat = seatRepo.findById(b.getSeatId()).orElseThrow();
        seat.setStatus("AVAILABLE");
        seatRepo.save(seat);

        b.setStatus("CANCELLED");
        return bookingRepo.save(b);
    }
}