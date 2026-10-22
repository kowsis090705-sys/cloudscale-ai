package com.cloudscale.ticket.service;

import com.cloudscale.ticket.model.Booking;
import com.cloudscale.ticket.model.Seat;
import com.cloudscale.ticket.repository.BookingRepository;
import com.cloudscale.ticket.repository.SeatRepository;
import java.util.List;
import java.util.HashSet;
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
public List<Booking> bookMultiple(Long userId, List<Long> seatIds) {

    if (userId == null || userId <= 0) {
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Invalid user ID");
    }

    if (seatIds == null || seatIds.isEmpty()) {
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Select at least one seat");
    }

    if (seatIds.stream().anyMatch(
            id -> id == null || id <= 0)) {
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Invalid seat ID");
    }

    if (new HashSet<>(seatIds).size() != seatIds.size()) {
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Duplicate seat IDs");
    }

    List<Seat> seats = seatIds.stream()
            .map(id -> seatRepo.findById(id)
                    .orElseThrow(() ->
                            new ResponseStatusException(
                                    HttpStatus.NOT_FOUND,
                                    "Seat not found: " + id)))
            .toList();

    Long eventId = seats.get(0).getEventId();

    for (Seat seat : seats) {
        if (!eventId.equals(seat.getEventId())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "All seats must belong to the same event");
        }

        if (!"AVAILABLE".equals(seat.getStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Seat already booked: " + seat.getId());
        }
    }

    // Reserve seats with optimistic locking.
    for (Seat seat : seats) {
        seat.setStatus("BOOKED");
    }
    seatRepo.saveAllAndFlush(seats);

    List<Booking> bookings = seats.stream().map(seat -> {
        Booking booking = new Booking();
        booking.setUserId(userId);
        booking.setEventId(eventId);
        booking.setSeatId(seat.getId());
        return booking;
    }).toList();

    return bookingRepo.saveAll(bookings);
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