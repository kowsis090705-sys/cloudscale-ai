package com.cloudscale.ticket.controller;
import com.cloudscale.ticket.model.*;
import com.cloudscale.ticket.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.List;
import java.util.stream.IntStream;
@RestController @RequestMapping("/api") @CrossOrigin(origins="*") @RequiredArgsConstructor
public class EventController {
 private final EventRepository eventRepo;
 private final SeatRepository seatRepo;
 private final BookingRepository bookingRepo;
 public record EventView(Long id,String title,String type,String venue,java.time.LocalDateTime showTime,Integer totalSeats,java.math.BigDecimal price,long seatsLeft) {}
 private EventView view(Event e){return new EventView(e.getId(),e.getTitle(),e.getType(),e.getVenue(),e.getShowTime(),e.getTotalSeats(),e.getPrice(),seatRepo.countByEventIdAndStatus(e.getId(),"AVAILABLE"));}
 @GetMapping("/events") public List<EventView> events(){return eventRepo.findAll().stream().map(this::view).toList();}
 @GetMapping("/events/{id}/seats") public List<Seat> seats(@PathVariable Long id){return seatRepo.findByEventId(id);}
 @PostMapping("/admin/events") @Transactional
 public EventView addEvent(@RequestBody Event event){
  if(event.getTotalSeats()==null||event.getTotalSeats()<1||event.getTotalSeats()>200)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"totalSeats must be 1-200");
  event.setId(null);
  Event saved=eventRepo.save(event);
  seatRepo.saveAll(IntStream.rangeClosed(1,saved.getTotalSeats()).mapToObj(i->{Seat s=new Seat();s.setEventId(saved.getId());s.setSeatNo("S"+i);return s;}).toList());
  return view(saved);
 }
 @DeleteMapping("/admin/events/{id}") @Transactional
 public void delete(@PathVariable Long id){
  Event event=eventRepo.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Event not found"));
  if(bookingRepo.existsByEventId(id))throw new ResponseStatusException(HttpStatus.CONFLICT,"Cannot delete event with bookings");
  seatRepo.deleteAll(seatRepo.findByEventId(id));
  eventRepo.delete(event);
 }
}