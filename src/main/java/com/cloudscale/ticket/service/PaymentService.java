
package com.cloudscale.ticket.service;

import com.cloudscale.ticket.model.Booking;
import com.cloudscale.ticket.model.Event;
import com.cloudscale.ticket.model.Payment;
import com.cloudscale.ticket.model.Seat;

import com.cloudscale.ticket.repository.BookingRepository;
import com.cloudscale.ticket.repository.EventRepository;
import com.cloudscale.ticket.repository.PaymentRepository;
import com.cloudscale.ticket.repository.SeatRepository;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Refund;
import com.razorpay.Utils;

import org.json.JSONObject;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class PaymentService {

    private final RazorpayClient razorpayClient;
    private final String keyId;
    private final String keySecret;

    private final SeatRepository seatRepo;
    private final EventRepository eventRepo;
    private final PaymentRepository paymentRepo;
    private final BookingRepository bookingRepo;
    private final BookingService bookingService;

    private final TransactionTemplate transactionTemplate;

    public PaymentService(
            @Value("${razorpay.key.id}") String keyId,
            @Value("${razorpay.key.secret}") String keySecret,
            SeatRepository seatRepo,
            EventRepository eventRepo,
            PaymentRepository paymentRepo,
            BookingRepository bookingRepo,
            BookingService bookingService,
            PlatformTransactionManager transactionManager
    ) throws RazorpayException {

        this.keyId = keyId;
        this.keySecret = keySecret;
        this.seatRepo = seatRepo;
        this.eventRepo = eventRepo;
        this.paymentRepo = paymentRepo;
        this.bookingRepo = bookingRepo;
        this.bookingService = bookingService;

        this.razorpayClient =
                new RazorpayClient(keyId, keySecret);

        this.transactionTemplate =
                new TransactionTemplate(transactionManager);

        this.transactionTemplate.setPropagationBehavior(
                TransactionDefinition.PROPAGATION_REQUIRES_NEW
        );
    }

    // RESPONSE RECORDS

    public record OrderDetails(
            String orderId,
            String keyId,
            long amount,
            String currency
    ) {}

    public record PaymentConfirmation(
            String orderId,
            String paymentId,
            String status,
            List<Long> bookingIds
    ) {}

    public record RefundResult(
            Long bookingId,
            String refundId,
            String refundStatus,
            BigDecimal refundAmount,
            String bookingStatus
    ) {}

    private record RefundPreparation(
            String paymentId,
            long amountPaise,
            BigDecimal amountInr,
            String receipt
    ) {}

    // CREATE RAZORPAY ORDER

    public OrderDetails createOrder(
            Long userId,
            List<Long> seatIds
    ) throws RazorpayException {

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
                id -> id == null || id <= 0
        )) {
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
                        ))
                .toList();

        Long eventId = seats.get(0).getEventId();

        for (Seat seat : seats) {

            if (!eventId.equals(seat.getEventId())) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Seats must belong to same event"
                );
            }

            if (!"AVAILABLE".equals(seat.getStatus())) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Seat already booked: " + seat.getId()
                );
            }
        }

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

        BigDecimal totalAmount =
                price.multiply(
                        BigDecimal.valueOf(seatIds.size())
                );

        long amountPaise;

        try {
            amountPaise = totalAmount
                    .movePointRight(2)
                    .longValueExact();

        } catch (ArithmeticException e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid payment amount"
            );
        }

        JSONObject request = new JSONObject();

        request.put("amount", amountPaise);
        request.put("currency", "INR");

        request.put(
                "receipt",
                "ticket_" + UUID.randomUUID()
                        .toString().substring(0, 12)
        );

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

        String razorpayOrderId = order.get("id");

        Payment payment = new Payment();

        payment.setUserId(userId);
        payment.setEventId(eventId);

        payment.setSelectedSeatIds(
                seatIds.stream()
                        .map(String::valueOf)
                        .collect(Collectors.joining(","))
        );

        payment.setRazorpayOrderId(razorpayOrderId);
        payment.setAmount(totalAmount);
        payment.setCurrency("INR");
        payment.setStatus("CREATED");
        payment.setRefundedAmount(BigDecimal.ZERO);

        paymentRepo.saveAndFlush(payment);

        System.out.println(
                "PAYMENT: Saved successfully"
        );

        return new OrderDetails(
                razorpayOrderId,
                keyId,
                amountPaise,
                "INR"
        );
    }

    // VERIFY RAZORPAY SIGNATURE

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

        attributes.put("razorpay_order_id", orderId);
        attributes.put("razorpay_payment_id", paymentId);
        attributes.put("razorpay_signature", signature);

        return Utils.verifyPaymentSignature(
                attributes,
                keySecret
        );
    }

    // VERIFY PAYMENT AND CONFIRM TICKETS

    @Transactional
    public PaymentConfirmation confirmPayment(
            String orderId,
            String paymentId,
            String signature
    ) throws RazorpayException {

        if (!verifyPaymentSignature(
                orderId, paymentId, signature
        )) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid Razorpay payment signature"
            );
        }

        Payment payment = paymentRepo
                .findByOrderIdForUpdate(orderId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Payment order not found"
                        )
                );

        if ("CAPTURED".equals(payment.getStatus())
                || "PARTIALLY_REFUNDED".equals(
                        payment.getStatus()
                )
                || "REFUNDED".equals(payment.getStatus())) {

            if (!paymentId.equals(
                    payment.getRazorpayPaymentId()
            )) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Payment ID mismatch"
                );
            }

            return new PaymentConfirmation(
                    orderId,
                    paymentId,
                    payment.getStatus(),
                    bookingRepo
                            .findByPaymentId(payment.getId())
                            .stream()
                            .map(Booking::getId)
                            .toList()
            );
        }

        if (!"CREATED".equals(payment.getStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Payment cannot be confirmed"
            );
        }

        com.razorpay.Payment actualPayment =
                razorpayClient.payments.fetch(paymentId);

        String actualOrderId =
                actualPayment.get("order_id");

        String actualStatus =
                actualPayment.get("status");

        String actualCurrency =
                actualPayment.get("currency");

        Number actualAmount =
                actualPayment.get("amount");

        if (!orderId.equals(actualOrderId)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Order ID mismatch"
            );
        }

        if (!"captured".equals(actualStatus)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Payment not captured"
            );
        }

        if (!payment.getCurrency().equals(actualCurrency)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Currency mismatch"
            );
        }

        long expectedAmount = payment.getAmount()
                .movePointRight(2)
                .longValueExact();

        if (actualAmount == null ||
                actualAmount.longValue() != expectedAmount) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Payment amount mismatch"
            );
        }

        String storedSeatIds = payment.getSelectedSeatIds();

        if (storedSeatIds == null ||
                storedSeatIds.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Selected seats missing"
            );
        }

        List<Long> seatIds;

        try {
            seatIds = Arrays.stream(
                            storedSeatIds.split(",")
                    )
                    .map(String::trim)
                    .map(Long::parseLong)
                    .toList();

        } catch (NumberFormatException e) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Invalid stored seat IDs"
            );
        }

        List<Booking> bookings =
                bookingService.bookMultiple(
                        payment.getUserId(),
                        seatIds
                );

        for (Booking booking : bookings) {
            booking.setPayment(payment);
        }

        bookingRepo.saveAllAndFlush(bookings);

        payment.setRazorpayPaymentId(paymentId);
        payment.setPaymentMethod(
                actualPayment.get("method")
        );
        payment.setStatus("CAPTURED");
        payment.setPaidAt(LocalDateTime.now());

        paymentRepo.saveAndFlush(payment);

        System.out.println(
                "PAYMENT VERIFIED: " + paymentId
        );

        System.out.println(
                "TICKETS CONFIRMED: " + bookings.size()
        );

        return new PaymentConfirmation(
                orderId,
                paymentId,
                "CONFIRMED",
                bookings.stream()
                        .map(Booking::getId)
                        .toList()
        );
    }

    // PREPARE PARTIAL REFUND

    private RefundPreparation prepareRefund(
            Long bookingId
    ) {

        return transactionTemplate.execute(status -> {

            Booking initialBooking =
                    bookingRepo.findById(bookingId)
                            .orElseThrow(() ->
                                    new ResponseStatusException(
                                            HttpStatus.NOT_FOUND,
                                            "Booking not found"
                                    )
                            );

            if (initialBooking.getPayment() == null) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Booking has no linked Razorpay payment"
                );
            }

            String orderId = initialBooking
                    .getPayment()
                    .getRazorpayOrderId();

            Payment payment = paymentRepo
                    .findByOrderIdForUpdate(orderId)
                    .orElseThrow(() ->
                            new ResponseStatusException(
                                    HttpStatus.NOT_FOUND,
                                    "Payment not found"
                            )
                    );

            Booking booking =
                    bookingRepo.findById(bookingId)
                            .orElseThrow();

            if (!"CONFIRMED".equals(
                    booking.getStatus()
            )) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Booking already cancelled"
                );
            }

            if (booking.getRefundStatus() != null) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Refund already initiated or needs review"
                );
            }

            if (!"CAPTURED".equals(payment.getStatus())
                    && !"PARTIALLY_REFUNDED".equals(
                            payment.getStatus()
                    )) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Payment not eligible for refund"
                );
            }

            if (payment.getRazorpayPaymentId() == null) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Razorpay payment ID missing"
                );
            }

            List<Booking> relatedBookings =
                    bookingRepo.findByPaymentId(
                            payment.getId()
                    );

            boolean unresolved =
                    relatedBookings.stream().anyMatch(b ->
                            "REQUESTING".equals(b.getRefundStatus())
                            || "REVIEW_REQUIRED".equals(
                                    b.getRefundStatus()
                            )
                            || "PENDING".equals(b.getRefundStatus())
                            || "CREATED".equals(b.getRefundStatus())
                    );

            if (unresolved) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Another refund is pending or needs review"
                );
            }

            String savedSeats =
                    payment.getSelectedSeatIds();

            if (savedSeats == null ||
                    savedSeats.isBlank()) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Original ticket details missing"
                );
            }

            long ticketCount =
                    Arrays.stream(savedSeats.split(","))
                            .filter(s -> !s.isBlank())
                            .count();

            if (ticketCount <= 0) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Invalid ticket count"
                );
            }

            BigDecimal ticketAmount;

            try {
                ticketAmount = payment.getAmount().divide(
                        BigDecimal.valueOf(ticketCount)
                );
            } catch (ArithmeticException e) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Unable to calculate refund amount"
                );
            }

            long amountPaise;

            try {
                amountPaise = ticketAmount
                        .movePointRight(2)
                        .longValueExact();

            } catch (ArithmeticException e) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Invalid refund amount"
                );
            }

            BigDecimal alreadyRefunded =
                    payment.getRefundedAmount() == null
                            ? BigDecimal.ZERO
                            : payment.getRefundedAmount();

            if (ticketAmount.compareTo(
                    BigDecimal.ZERO
            ) <= 0 ||
                    alreadyRefunded.add(ticketAmount)
                            .compareTo(payment.getAmount()) > 0) {

                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Refund exceeds original payment"
                );
            }

            booking.setRefundStatus("REQUESTING");
            booking.setRefundAmount(ticketAmount);

            bookingRepo.saveAndFlush(booking);

            return new RefundPreparation(
                    payment.getRazorpayPaymentId(),
                    amountPaise,
                    ticketAmount,
                    "booking_" + bookingId
            );
        });
    }

    // HANDLE REFUND RESPONSE

    private RefundResult saveRefundResponse(
            Long bookingId,
            String refundId,
            String refundStatus,
            BigDecimal amountInr
    ) {

        return transactionTemplate.execute(status -> {

            Booking initialBooking =
                    bookingRepo.findById(bookingId)
                            .orElseThrow();

            Payment payment = paymentRepo
                    .findByOrderIdForUpdate(
                            initialBooking.getPayment()
                                    .getRazorpayOrderId()
                    )
                    .orElseThrow();

            Booking booking =
                    bookingRepo.findById(bookingId)
                            .orElseThrow();

            if (!"REQUESTING".equals(
                    booking.getRefundStatus()
            )) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Refund requires manual reconciliation"
                );
            }

            booking.setRazorpayRefundId(refundId);

            String normalizedStatus =
                    refundStatus == null
                            ? "REVIEW_REQUIRED"
                            : refundStatus.toUpperCase();

            if (!"PROCESSED".equals(normalizedStatus)
                    && !"PENDING".equals(normalizedStatus)
                    && !"CREATED".equals(normalizedStatus)) {

                booking.setRefundStatus("REVIEW_REQUIRED");
                bookingRepo.saveAndFlush(booking);

                return new RefundResult(
                        bookingId,
                        refundId,
                        "REVIEW_REQUIRED",
                        amountInr,
                        booking.getStatus()
                );
            }

            booking.setRefundStatus(normalizedStatus);

            if (!"PROCESSED".equals(normalizedStatus)) {

                bookingRepo.saveAndFlush(booking);

                return new RefundResult(
                        bookingId,
                        refundId,
                        normalizedStatus,
                        amountInr,
                        booking.getStatus()
                );
            }

            booking.setStatus("CANCELLED");

            Seat seat = seatRepo.findById(
                    booking.getSeatId()
            ).orElseThrow(() ->
                    new ResponseStatusException(
                            HttpStatus.NOT_FOUND,
                            "Seat not found"
                    )
            );

            seat.setStatus("AVAILABLE");

            seatRepo.saveAndFlush(seat);
            bookingRepo.saveAndFlush(booking);

            BigDecimal alreadyRefunded =
                    payment.getRefundedAmount() == null
                            ? BigDecimal.ZERO
                            : payment.getRefundedAmount();

            BigDecimal totalRefunded =
                    alreadyRefunded.add(amountInr);

            payment.setRefundedAmount(totalRefunded);
            payment.setRefundedAt(LocalDateTime.now());

            payment.setStatus(
                    totalRefunded.compareTo(payment.getAmount()) == 0
                            ? "REFUNDED"
                            : "PARTIALLY_REFUNDED"
            );

            paymentRepo.saveAndFlush(payment);

            System.out.println(
                    "REFUND PROCESSED: " + refundId
            );

            return new RefundResult(
                    bookingId,
                    refundId,
                    "PROCESSED",
                    amountInr,
                    "CANCELLED"
            );
        });
    }

    // START RAZORPAY TEST REFUND

    public RefundResult refundBooking(
            Long bookingId
    ) throws RazorpayException {

        if (!keyId.startsWith("rzp_test_")) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Test Mode required for refund demo"
            );
        }

        RefundPreparation prepared =
                prepareRefund(bookingId);

        JSONObject request = new JSONObject();

        request.put(
                "amount",
                prepared.amountPaise()
        );

        request.put(
                "receipt",
                prepared.receipt()
        );

        Refund refund;

        try {
            refund = razorpayClient.payments.refund(
                    prepared.paymentId(),
                    request
            );

        } catch (RazorpayException | RuntimeException e) {

            // Razorpay refund error diagnostics
            System.err.println(
                    "RAZORPAY REFUND ERROR: " + e.getMessage()
            );

            if (e instanceof RazorpayException razorpayError) {
                System.err.println(
                        "RAZORPAY HTTP STATUS: " +
                        razorpayError.getStatusCode()
                );

                System.err.println(
                        "RAZORPAY ERROR CODE: " +
                        razorpayError.getCode()
                );

                System.err.println(
                        "RAZORPAY DESCRIPTION: " +
                        razorpayError.getDescription()
                );

                System.err.println(
                        "RAZORPAY FIELD: " +
                        razorpayError.getField()
                );

                System.err.println(
                        "RAZORPAY REASON: " +
                        razorpayError.getReason()
                );
            }

            e.printStackTrace();

            System.err.println(
                    "Refund booking requiring review: " + bookingId
            );

            // Do not automatically retry an uncertain refund.
            transactionTemplate.execute(status -> {

                Booking booking =
                        bookingRepo.findById(bookingId)
                                .orElseThrow();

                booking.setRefundStatus("REVIEW_REQUIRED");

                bookingRepo.saveAndFlush(booking);

                return null;
            });

            throw e;
        }

        String refundId = refund.get("id");
        String refundStatus = refund.get("status");

        String returnedPaymentId =
                refund.get("payment_id");

        Number returnedAmount =
                refund.get("amount");

        if (refundId == null ||
                !prepared.paymentId().equals(
                        returnedPaymentId
                ) ||
                returnedAmount == null ||
                returnedAmount.longValue()
                        != prepared.amountPaise()) {

            System.err.println(
                    "RAZORPAY REFUND ERROR: Response mismatch"
            );

            transactionTemplate.execute(status -> {

                Booking booking =
                        bookingRepo.findById(bookingId)
                                .orElseThrow();

                if (refundId != null) {
                    booking.setRazorpayRefundId(refundId);
                }

                booking.setRefundStatus("REVIEW_REQUIRED");

                bookingRepo.saveAndFlush(booking);

                return null;
            });

            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Refund response needs manual review"
            );
        }

        return saveRefundResponse(
                bookingId,
                refundId,
                refundStatus,
                prepared.amountInr()
        );
    }

    // RECHECK AN EXISTING REFUND

    public RefundResult reconcileRefund(
            Long bookingId
    ) throws RazorpayException {

        if (!keyId.startsWith("rzp_test_")) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Test Mode required"
            );
        }

        Booking booking = bookingRepo.findById(bookingId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Booking not found"
                        )
                );

        String refundId = booking.getRazorpayRefundId();

        if (refundId == null || refundId.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Refund ID missing; manual review required"
            );
        }

        Refund refund = razorpayClient.refunds.fetch(refundId);

        String status = refund.get("status");
        String paymentId = refund.get("payment_id");
        Number amount = refund.get("amount");

        Payment payment = booking.getPayment();

        if (payment == null ||
                !payment.getRazorpayPaymentId()
                        .equals(paymentId) ||
                amount == null ||
                booking.getRefundAmount() == null ||
                amount.longValue() != booking.getRefundAmount()
                        .movePointRight(2)
                        .longValueExact()) {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Refund details mismatch; manual review required"
            );
        }

        String normalizedStatus =
                status == null
                        ? "REVIEW_REQUIRED"
                        : status.toUpperCase();

        if ("PROCESSED".equals(
                booking.getRefundStatus()
        )) {
            return new RefundResult(
                    bookingId,
                    refundId,
                    "PROCESSED",
                    booking.getRefundAmount(),
                    booking.getStatus()
            );
        }

        if ("PENDING".equals(normalizedStatus)
                || "CREATED".equals(normalizedStatus)) {

            return new RefundResult(
                    bookingId,
                    refundId,
                    normalizedStatus,
                    booking.getRefundAmount(),
                    booking.getStatus()
            );
        }

        if (!"PROCESSED".equals(normalizedStatus)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Refund needs manual review"
            );
        }

        return transactionTemplate.execute(tx -> {

            Payment lockedPayment =
                    paymentRepo.findByOrderIdForUpdate(
                            payment.getRazorpayOrderId()
                    ).orElseThrow();

            Booking current =
                    bookingRepo.findById(bookingId)
                            .orElseThrow();

            if ("PROCESSED".equals(current.getRefundStatus())) {
                return new RefundResult(
                        bookingId,
                        refundId,
                        "PROCESSED",
                        current.getRefundAmount(),
                        current.getStatus()
                );
            }

            if (!"PENDING".equals(current.getRefundStatus())
                    && !"CREATED".equals(
                            current.getRefundStatus()
                    )) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Manual reconciliation required"
                );
            }

            current.setRefundStatus("PROCESSED");
            current.setStatus("CANCELLED");

            Seat seat = seatRepo.findById(
                    current.getSeatId()
            ).orElseThrow();

            seat.setStatus("AVAILABLE");
            seatRepo.saveAndFlush(seat);

            bookingRepo.saveAndFlush(current);

            BigDecimal refunded =
                    lockedPayment.getRefundedAmount() == null
                            ? BigDecimal.ZERO
                            : lockedPayment.getRefundedAmount();

            BigDecimal total =
                    refunded.add(current.getRefundAmount());

            if (total.compareTo(
                    lockedPayment.getAmount()
            ) > 0) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Refund total exceeds payment"
                );
            }

            lockedPayment.setRefundedAmount(total);
            lockedPayment.setRefundedAt(LocalDateTime.now());

            lockedPayment.setStatus(
                    total.compareTo(lockedPayment.getAmount()) == 0
                            ? "REFUNDED"
                            : "PARTIALLY_REFUNDED"
            );

            paymentRepo.saveAndFlush(lockedPayment);

            return new RefundResult(
                    bookingId,
                    refundId,
                    "PROCESSED",
                    current.getRefundAmount(),
                    "CANCELLED"
            );
        });
    }
}
