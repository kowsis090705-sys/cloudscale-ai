package com.cloudscale.ticket.service;

import com.cloudscale.ticket.model.Event;
import com.cloudscale.ticket.model.Seat;
import com.cloudscale.ticket.model.Payment;

import com.cloudscale.ticket.repository.EventRepository;
import com.cloudscale.ticket.repository.SeatRepository;
import com.cloudscale.ticket.repository.PaymentRepository;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;

import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;

@Service
public class PaymentService {

    private final RazorpayClient razorpayClient;

    private final String keyId;
    private final String keySecret;

    private final SeatRepository seatRepo;
    private final EventRepository eventRepo;
    private final PaymentRepository paymentRepo;

    // CONSTRUCTOR
    public PaymentService(
            @Value("${razorpay.key.id}") String keyId,
            @Value("${razorpay.key.secret}") String keySecret,
            SeatRepository seatRepo,
            EventRepository eventRepo,
            PaymentRepository paymentRepo
    ) throws RazorpayException {

        this.keyId = keyId;
        this.keySecret = keySecret;

        this.seatRepo = seatRepo;
        this.eventRepo = eventRepo;
        this.paymentRepo = paymentRepo;

        this.razorpayClient =
                new RazorpayClient(keyId, keySecret);
    }

    // ORDER RESPONSE
    public record OrderDetails(
            String orderId,
            String keyId,
            long amount,
            String currency
    ) {}

    // CREATE RAZORPAY TEST ORDER
    public OrderDetails createOrder(
            Long userId,
            List<Long> seatIds
    ) throws RazorpayException {

        // Validate user ID
        if (userId == null || userId <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid user ID"
            );
        }

        // Validate selected seats
        if (seatIds == null || seatIds.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Please select at least one seat"
            );
        }

        if (seatIds.stream().anyMatch(
                id -> id == null || id <= 0
        )) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid seat ID"
            );
        }

        // Prevent duplicate seat selection
        if (new HashSet<>(seatIds).size()
                != seatIds.size()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Duplicate seats selected"
            );
        }

        // Fetch seats from MySQL
        List<Seat> seats = seatIds.stream()
                .map(id -> seatRepo.findById(id)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Seat not found: " + id
                                )
                        ))
                .toList();

        Long eventId = seats.get(0).getEventId();

        // Validate seat availability
        for (Seat seat : seats) {

            if (!eventId.equals(seat.getEventId())) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Seats must belong to the same event"
                );
            }

            if (!"AVAILABLE".equals(seat.getStatus())) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Seat already booked: " + seat.getId()
                );
            }
        }

        // Fetch event from MySQL
        Event event = eventRepo.findById(eventId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Event not found"
                        )
                );

        BigDecimal price = event.getPrice();

        if (price == null ||
                price.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid ticket price"
            );
        }

        // Calculate total amount in rupees
        BigDecimal totalAmount =
                price.multiply(
                        BigDecimal.valueOf(seatIds.size())
                );

        // Convert rupees to paise
        long amountPaise;

        try {
            amountPaise = totalAmount
                    .movePointRight(2)
                    .longValueExact();

        } catch (ArithmeticException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid payment amount"
            );
        }

        // Prepare Razorpay order request
        JSONObject request = new JSONObject();

        request.put("amount", amountPaise);
        request.put("currency", "INR");

        request.put(
                "receipt",
                "ticket_" + UUID.randomUUID()
                        .toString().substring(0, 12)
        );

        // STEP 1: Create Razorpay order
        System.out.println(
                "RAZORPAY: Starting order creation"
        );
Order order;

try {
    order = razorpayClient.orders.create(request);

} catch (RazorpayException e) {
    System.err.println(
        "RAZORPAY ORDER ERROR: " + e.getMessage()
    );
    throw e;
}


        System.out.println(
                "RAZORPAY: Order created successfully"
        );

        String razorpayOrderId = order.get("id");

        // STEP 2: Prepare payment record
        Payment payment = new Payment();

        payment.setUserId(userId);
        payment.setEventId(eventId);

        payment.setRazorpayOrderId(
                razorpayOrderId
        );

        payment.setAmount(totalAmount);
        payment.setCurrency("INR");

        payment.setStatus("CREATED");
        payment.setRefundedAmount(BigDecimal.ZERO);

        // STEP 3: Save payment in MySQL
        System.out.println(
                "PAYMENT: Saving to MySQL"
        );

        paymentRepo.saveAndFlush(payment);

        System.out.println(
                "PAYMENT: Saved successfully"
        );

        // Return order information
        return new OrderDetails(
                razorpayOrderId,
                keyId,
                amountPaise,
                "INR"
        );
    }

    // VERIFY RAZORPAY PAYMENT SIGNATURE
    public boolean verifyPaymentSignature(
            String orderId,
            String paymentId,
            String signature
    ) throws RazorpayException {

        if (orderId == null || orderId.isBlank()
                || paymentId == null || paymentId.isBlank()
                || signature == null || signature.isBlank()) {
            return false;
        }

        JSONObject attributes = new JSONObject();

        attributes.put(
                "razorpay_order_id",
                orderId
        );

        attributes.put(
                "razorpay_payment_id",
                paymentId
        );

        attributes.put(
                "razorpay_signature",
                signature
        );

        return Utils.verifyPaymentSignature(
                attributes,
                keySecret
        );
    }
}
