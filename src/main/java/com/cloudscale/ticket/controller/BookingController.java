
package com.cloudscale.ticket.controller;

import com.cloudscale.ticket.model.Booking;
import com.cloudscale.ticket.model.Event;
import com.cloudscale.ticket.model.Seat;

import com.cloudscale.ticket.repository.BookingRepository;
import com.cloudscale.ticket.repository.EventRepository;
import com.cloudscale.ticket.repository.SeatRepository;

import com.cloudscale.ticket.service.BookingService;
import com.cloudscale.ticket.service.PaymentService;

import com.razorpay.RazorpayException;

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
    private final PaymentService paymentService;

    private final BookingRepository bookingRepo;
    private final EventRepository eventRepo;
    private final SeatRepository seatRepo;

    // SINGLE-SEAT BOOKING REQUEST
    public record BookingRequest(
            Long userId,
            Long seatId
    ) {}

    // MULTIPLE-SEAT BOOKING REQUEST
    public record MultipleBookingRequest(
            Long userId,
            List<Long> seatIds
    ) {}

    // RESPONSE SENT TO REACT FRONTEND
    public record BookingView(
            Long id,
            Long userId,
            Long eventId,
            Long seatId,
            String status,
            LocalDateTime createdAt,
            String eventName,
            String seatNo,
            BigDecimal total,

            // Razorpay refund information
            String refundStatus,
            String razorpayRefundId,
            BigDecimal refundAmount
    ) {}

    // CONVERT BOOKING ENTITY TO FRONTEND RESPONSE
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
                price,

                // Refund fields
                booking.getRefundStatus(),
                booking.getRazorpayRefundId(),
                booking.getRefundAmount()
        );
    }

    // 1. SINGLE-SEAT BOOKING
    @PostMapping
    public BookingView book(
            @RequestBody BookingRequest request
    ) {
        Booking booking = service.book(
                request.userId(),
                request.seatId()
        );

        return view(booking);
    }

    // 2. MULTIPLE-SEAT BOOKING
    @PostMapping("/multiple")
    public List<BookingView> bookMultiple(
            @RequestBody MultipleBookingRequest request
    ) {
        List<Booking> bookings = service.bookMultiple(
                request.userId(),
                request.seatIds()
        );

        return bookings.stream()
                .map(this::view)
                .toList();
    }

    // 3. VIEW ALL BOOKINGS OF A USER
    @GetMapping("/user/{userId}")
    public List<BookingView> byUser(
            @PathVariable Long userId
    ) {
        return bookingRepo.findByUserId(userId)
                .stream()
                .map(this::view)
                .toList();
    }

    // 4. GET INDIVIDUAL BOOKING
    @GetMapping("/{id}")
    public BookingView get(
            @PathVariable Long id
    ) {
        Booking booking = bookingRepo.findById(id)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Booking not found"
                        )
                );

        return view(booking);
    }

    // 5. CANCEL TICKET AND REQUEST RAZORPAY REFUND
    @DeleteMapping("/{id}")
    public BookingView cancel(
            @PathVariable Long id
    ) {
        Booking booking = bookingRepo.findById(id)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Booking not found"
                        )
                );

        // Old demo bookings without Razorpay payment
        if (booking.getPayment() == null) {
            Booking cancelled = service.cancel(id);
            return view(cancelled);
        }

        // Razorpay-paid bookings
        try {
            paymentService.refundBooking(id);

            Booking updated = bookingRepo.findById(id)
                    .orElseThrow(() ->
                            new ResponseStatusException(
                                    HttpStatus.NOT_FOUND,
                                    "Booking not found"
                            )
                    );

            return view(updated);

        } catch (RazorpayException e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Razorpay refund failed or needs review",
                    e
            );
        }
    }
}
