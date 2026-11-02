
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

    public record CreateOrderRequest(
            Long userId,
            List<Long> seatIds
    ) {}

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
}
