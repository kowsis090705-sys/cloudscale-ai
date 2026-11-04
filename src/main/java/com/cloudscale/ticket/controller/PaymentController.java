
package com.cloudscale.ticket.controller;

import com.cloudscale.ticket.service.PaymentService;
import com.razorpay.RazorpayException;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    // Request to create a Razorpay order
    public record CreateOrderRequest(
            Long userId,
            List<Long> seatIds
    ) {}

    // Request to verify a successful Razorpay payment
    public record VerifyPaymentRequest(
            String razorpay_order_id,
            String razorpay_payment_id,
            String razorpay_signature
    ) {}

    // =====================================
    // 1. CREATE RAZORPAY TEST ORDER
    // =====================================

    @PostMapping("/create-order")
    public PaymentService.OrderDetails createOrder(
            @RequestBody CreateOrderRequest request
    ) {
        try {
            return paymentService.createOrder(
                    request.userId(),
                    request.seatIds()
            );

        } catch (RazorpayException e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Unable to create Razorpay order",
                    e
            );
        }
    }

    // =====================================
    // 2. VERIFY PAYMENT AND CONFIRM TICKETS
    // =====================================

    @PostMapping("/verify")
    public PaymentService.PaymentConfirmation verifyPayment(
            @RequestBody VerifyPaymentRequest request
    ) {
        try {
            return paymentService.confirmPayment(
                    request.razorpay_order_id(),
                    request.razorpay_payment_id(),
                    request.razorpay_signature()
            );

        } catch (RazorpayException e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Unable to verify Razorpay payment",
                    e
            );
        }
    }

    // =====================================
    // 3. RECONCILE EXISTING RAZORPAY REFUND
    // =====================================

    @PostMapping("/refunds/{bookingId}/reconcile")
    public PaymentService.RefundResult reconcileRefund(
            @PathVariable Long bookingId
    ) {
        try {
            return paymentService.reconcileRefund(bookingId);

        } catch (RazorpayException e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Unable to check Razorpay refund status",
                    e
            );
        }
    }
}
