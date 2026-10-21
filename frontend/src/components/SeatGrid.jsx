export default function SeatGrid({ seats, selected, onToggle }) {
  const rows = [...new Set(seats.map((s) => s.row))];

  return (
    <div>
      {rows.map((row) => (
        <div key={row} style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
          <b style={{ width: "20px" }}>{row}</b>
          {seats
            .filter((s) => s.row === row)
            .map((s) => {
              const isSelected = selected.includes(s.id);
              let bg = "#e0e0e0";
              if (s.booked) bg = "#888";
              if (isSelected) bg = "#4caf50";
              return (
                <button
                  key={s.id}
                  disabled={s.booked}
                  onClick={() => onToggle(s.id)}
                  style={{
                    width: "40px",
                    height: "40px",
                    background: bg,
                    color: s.booked || isSelected ? "white" : "black",
                    border: "none",
                    borderRadius: "6px",
                    cursor: s.booked ? "not-allowed" : "pointer",
                  }}
                >
                  {s.number}
                </button>
              );
            })}
        </div>
      ))}
    </div>
  );
}