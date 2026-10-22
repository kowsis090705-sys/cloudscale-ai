
package com.cloudscale.ticket.controller;

import com.cloudscale.ticket.model.Booking;
import com.cloudscale.ticket.repository.BookingRepository;
import com.cloudscale.ticket.service.BookingService;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService service;
    private final BookingRepository bookingRepo;

    // Single seat booking request
    public record BookingRequest(
            Long userId,
            Long seatId
    ) {}

    // Multiple seat booking request
    public record MultipleBookingRequest(
            Long userId,
            List<Long> seatIds
    ) {}

    // Existing single seat booking
    @PostMapping
    public Booking book(@RequestBody BookingRequest req) {
        return service.book(req.userId(), req.seatId());
    }

    // New multiple seat booking
    @PostMapping("/multiple")
    public List<Booking> bookMultiple(
            @RequestBody MultipleBookingRequest req) {

        return service.bookMultiple(
                req.userId(),
                req.seatIds()
        );
    }

    // Get user bookings
    @GetMapping("/user/{userId}")
    public List<Booking> byUser(@PathVariable Long userId) {
        return bookingRepo.findByUserId(userId);
    }

    // Cancel booking
    @DeleteMapping("/{id}")
    public Booking cancel(@PathVariable Long id) {
        return service.cancel(id);
    }
}
