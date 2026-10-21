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

    public record BookingRequest(Long userId, Long seatId) {}

    private final BookingService service;
    private final BookingRepository bookingRepo;

    @PostMapping
    public Booking book(@RequestBody BookingRequest req) {
        return service.book(req.userId(), req.seatId());
    }

    @GetMapping("/user/{userId}")
    public List<Booking> byUser(@PathVariable Long userId) {
        return bookingRepo.findByUserId(userId);
    }

    @DeleteMapping("/{id}")
    public Booking cancel(@PathVariable Long id) {
        return service.cancel(id);
    }
}
