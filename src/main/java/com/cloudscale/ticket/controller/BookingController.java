
package com.cloudscale.ticket.controller;

import com.cloudscale.ticket.model.Booking;
import com.cloudscale.ticket.model.Event;
import com.cloudscale.ticket.model.Seat;

import com.cloudscale.ticket.repository.BookingRepository;
import com.cloudscale.ticket.repository.EventRepository;
import com.cloudscale.ticket.repository.SeatRepository;

import com.cloudscale.ticket.service.BookingService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/bookings")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService service;
    private final BookingRepository bookingRepo;
    private final EventRepository eventRepo;
    private final SeatRepository seatRepo;

    // Existing single-seat request
    public record BookingRequest(
            Long userId,
            Long seatId
    ) {}

    // New multiple-seat request
    public record MultipleBookingRequest(
            Long userId,
            List<Long> seatIds
    ) {}

    // Response with booking and event information
    public record BookingView(
            Long id,
            Long userId,
            Long eventId,
            Long seatId,
            String status,
            LocalDateTime createdAt,
            String eventName,
            String seatNo,
            BigDecimal total
    ) {}

    // Convert booking entity into frontend response
    private BookingView view(Booking booking) {

        Event event = eventRepo
                .findById(booking.getEventId())
                .orElse(null);

        Seat seat = seatRepo
                .findById(booking.getSeatId())
                .orElse(null);

        String eventName =
                event == null
                        ? "Event #" + booking.getEventId()
                        : event.getTitle();

        String seatNumber =
                seat == null
                        ? String.valueOf(booking.getSeatId())
                        : seat.getSeatNo();

        BigDecimal price =
                event == null || event.getPrice() == null
                        ? BigDecimal.ZERO
                        : event.getPrice();

        return new BookingView(
                booking.getId(),
                booking.getUserId(),
                booking.getEventId(),
                booking.getSeatId(),
                booking.getStatus(),
                booking.getCreatedAt(),
                eventName,
                seatNumber,
                price
        );
    }

    // Existing single-seat booking
    @PostMapping
    public BookingView book(
            @RequestBody BookingRequest request) {

        Booking booking = service.book(
                request.userId(),
                request.seatId()
        );

        return view(booking);
    }

    // NEW: Book multiple seats together
    @PostMapping("/multiple")
    public List<BookingView> bookMultiple(
            @RequestBody MultipleBookingRequest request) {

        List<Booking> bookings = service.bookMultiple(
                request.userId(),
                request.seatIds()
        );

        return bookings.stream()
                .map(this::view)
                .toList();
    }

    // View all bookings of a user
    @GetMapping("/user/{userId}")
    public List<BookingView> byUser(
            @PathVariable Long userId) {

        return bookingRepo.findByUserId(userId)
                .stream()
                .map(this::view)
                .toList();
    }

    // Get individual booking confirmation
    @GetMapping("/{id}")
    public BookingView get(
            @PathVariable Long id) {

        Booking booking = bookingRepo.findById(id)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Booking not found"
                        )
                );

        return view(booking);
    }

    // Cancel an existing booking
    @DeleteMapping("/{id}")
    public BookingView cancel(
            @PathVariable Long id) {

        Booking booking = service.cancel(id);

        return view(booking);
    }
}
