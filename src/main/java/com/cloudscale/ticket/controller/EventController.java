package com.cloudscale.ticket.controller;

import com.cloudscale.ticket.model.Event;
import com.cloudscale.ticket.model.Seat;
import com.cloudscale.ticket.repository.EventRepository;
import com.cloudscale.ticket.repository.SeatRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.stream.IntStream;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")   // allows the React app; tighten later
@RequiredArgsConstructor
public class EventController {

    private final EventRepository eventRepo;
    private final SeatRepository seatRepo;

    @GetMapping("/events")
    public List<Event> events() {
        return eventRepo.findAll();
    }

    @GetMapping("/events/{id}/seats")
    public List<Seat> seats(@PathVariable Long id) {
        return seatRepo.findByEventId(id);
    }

    // Admin: add an event and create its seats
    @PostMapping("/admin/events")
    @Transactional
    public Event addEvent(@RequestBody Event event) {
        Event saved = eventRepo.save(event);
        List<Seat> seats = IntStream.rangeClosed(1, saved.getTotalSeats()).mapToObj(i -> {
            Seat s = new Seat();
            s.setEventId(saved.getId());
            s.setSeatNo("S" + i);
            return s;
        }).toList();
        seatRepo.saveAll(seats);
        return saved;
    }
}
