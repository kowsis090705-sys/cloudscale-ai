
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

import java.util.List;
import java.util.HashSet;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final SeatRepository seatRepo;
    private final BookingRepository bookingRepo;

    // SINGLE-SEAT BOOKING
    @Transactional
    public Booking book(Long userId, Long seatId) {

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

        Seat seat = seatRepo.findById(seatId)
            .orElseThrow(() ->
                new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Seat not found"
                )
            );

        if (!"AVAILABLE".equals(seat.getStatus())) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Seat already booked"
            );
        }

        seat.setStatus("BOOKED");
        seatRepo.saveAndFlush(seat);

        Booking booking = new Booking();
        booking.setUserId(userId);
        booking.setEventId(seat.getEventId());
        booking.setSeatId(seatId);

        return bookingRepo.save(booking);
    }

    // MULTIPLE-SEAT BOOKING
    @Transactional
    public List<Booking> bookMultiple(
            Long userId,
            List<Long> seatIds) {

        if (userId == null || userId <= 0) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Invalid user ID"
            );
        }

        if (seatIds == null || seatIds.isEmpty()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Select at least one seat"
            );
        }

        if (seatIds.stream().anyMatch(
                id -> id == null || id <= 0)) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Invalid seat ID"
            );
        }

        if (new HashSet<>(seatIds).size()
                != seatIds.size()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Duplicate seat IDs"
            );
        }

        List<Seat> seats = seatIds.stream()
            .map(id -> seatRepo.findById(id)
                .orElseThrow(() ->
                    new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Seat not found: " + id
                    )
                )
            )
            .toList();

        Long eventId = seats.get(0).getEventId();

        // Verify availability and event ID
        for (Seat seat : seats) {

            if (!eventId.equals(seat.getEventId())) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "All seats must belong to the same event"
                );
            }

            if (!"AVAILABLE".equals(seat.getStatus())) {
                throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Seat already booked: " + seat.getId()
                );
            }
        }

        // Reserve all selected seats
        for (Seat seat : seats) {
            seat.setStatus("BOOKED");
        }

        // Save seat updates with optimistic locking
        seatRepo.saveAllAndFlush(seats);

        // Create one booking record per seat
        List<Booking> bookings = seats.stream()
            .map(seat -> {
                Booking booking = new Booking();

                booking.setUserId(userId);
                booking.setEventId(eventId);
                booking.setSeatId(seat.getId());

                return booking;
            })
            .toList();

        return bookingRepo.saveAll(bookings);
    }

    // CANCEL BOOKING
    @Transactional
    public Booking cancel(Long bookingId) {

        Booking booking = bookingRepo.findById(bookingId)
            .orElseThrow(() ->
                new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Booking not found"
                )
            );

        if ("CANCELLED".equals(booking.getStatus())) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Already cancelled"
            );
        }

        Seat seat = seatRepo.findById(booking.getSeatId())
            .orElseThrow(() ->
                new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Seat not found"
                )
            );

        seat.setStatus("AVAILABLE");
        seatRepo.saveAndFlush(seat);

        booking.setStatus("CANCELLED");

        return bookingRepo.save(booking);
    }
}
