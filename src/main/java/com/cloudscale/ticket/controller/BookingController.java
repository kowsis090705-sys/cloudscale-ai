package com.cloudscale.ticket.controller;
import com.cloudscale.ticket.model.*;
import com.cloudscale.ticket.repository.*;
import com.cloudscale.ticket.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
@RestController @RequestMapping("/api/bookings") @CrossOrigin(origins="*") @RequiredArgsConstructor
public class BookingController {
 public record BookingRequest(Long userId, Long seatId) {}
 public record BookingView(Long id,Long userId,Long eventId,Long seatId,String status,LocalDateTime createdAt,String eventName,String seatNo,BigDecimal total) {}
 private final BookingService service;
 private final BookingRepository bookingRepo;
 private final EventRepository eventRepo;
 private final SeatRepository seatRepo;
 private BookingView view(Booking b){
  Event e=eventRepo.findById(b.getEventId()).orElse(null);
  Seat s=seatRepo.findById(b.getSeatId()).orElse(null);
  return new BookingView(b.getId(),b.getUserId(),b.getEventId(),b.getSeatId(),b.getStatus(),b.getCreatedAt(),e==null?"Event #"+b.getEventId():e.getTitle(),s==null?String.valueOf(b.getSeatId()):s.getSeatNo(),e==null||e.getPrice()==null?BigDecimal.ZERO:e.getPrice());
 }
 @PostMapping public BookingView book(@RequestBody BookingRequest req){return view(service.book(req.userId(),req.seatId()));}
 @GetMapping("/user/{userId}") public List<BookingView> byUser(@PathVariable Long userId){return bookingRepo.findByUserId(userId).stream().map(this::view).toList();}
 @GetMapping("/{id}") public BookingView get(@PathVariable Long id){return view(bookingRepo.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Booking not found")));}
 @DeleteMapping("/{id}") public BookingView cancel(@PathVariable Long id){return view(service.cancel(id));}
}