export function getSeats(eventId, totalSeats = 60) {
  const seats = [];
  const rowCount = Math.ceil(totalSeats / 10);

  for (let r = 0; r < rowCount; r++) {
    const row = String.fromCharCode(65 + r);
    for (let n = 1; n <= 10; n++) {
      if (r * 10 + n > totalSeats) break;
      seats.push({
        id: `${row}${n}`,
        row,
        number: n,
        booked: (r * 10 + n + Number(eventId) * 7) % 5 === 0,
      });
    }
  }
  return seats;
}