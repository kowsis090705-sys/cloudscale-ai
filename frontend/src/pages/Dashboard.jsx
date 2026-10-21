import { useState, useEffect, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const CAPACITY = 300; // requests per second one server can handle
const MIN_SERVERS = 2;
const MAX_SERVERS = 8;

// Traffic pattern: normal -> ramp up -> burst -> recovery
function loadAt(step) {
  if (step === null || step < 0) return 100;
  if (step <= 5) return 100 + (step + 1) * 150;
  if (step <= 13) return 1000;
  if (step <= 19) return 1000 - (step - 13) * 150;
  return 100;
}

const noise = (n) => Math.round((Math.random() - 0.5) * n);

const logColors = {
  "Scale out": "#1565c0",
  "Scale in": "#6a1b9a",
  Fault: "#c62828",
  Healing: "#ef6c00",
  Recovered: "#2e7d32",
  Info: "#555",
};

function Card({ title, value, unit, warn }) {
  return (
    <div
      style={{
        border: "1px solid #ccc",
        borderRadius: "8px",
        padding: "12px 16px",
        minWidth: "130px",
        background: warn ? "#ffebee" : "white",
      }}
    >
      <small>{title}</small>
      <h2 style={{ margin: "4px 0" }}>
        {value}
        <small style={{ fontSize: "14px" }}> {unit}</small>
      </h2>
    </div>
  );
}

function ChartBox({ title, children }) {
  return (
    <div style={{ border: "1px solid #ccc", borderRadius: "8px", padding: "12px", flex: "1 1 420px", minWidth: "320px" }}>
      <h3 style={{ margin: "0 0 8px" }}>{title}</h3>
      <div style={{ width: "100%", height: 250 }}>
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [history, setHistory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [latest, setLatest] = useState(null);

  const sim = useRef({ step: null, servers: MIN_SERVERS, cool: 0, crash: 0 });

  const addLog = (type, msg) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [{ time, type, msg }, ...prev].slice(0, 12));
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const s = sim.current;

      const actual = Math.max(50, loadAt(s.step) + noise(40));
      const predicted = Math.max(
        50,
        loadAt(s.step === null ? null : s.step + 3) + noise(40)
      );

      // Decision engine: scale based on the forecast
      const needed = Math.min(
        MAX_SERVERS,
        Math.max(MIN_SERVERS, Math.ceil((predicted * 1.1) / CAPACITY))
      );
      if (needed > s.servers) {
        addLog("Scale out", `Forecast ${predicted} req/s. Servers ${s.servers} -> ${needed}`);
        s.servers = needed;
        s.cool = 0;
      } else if (needed < s.servers) {
        s.cool += 1;
        if (s.cool >= 4) {
          addLog("Scale in", `Load is low. Servers ${s.servers} -> ${s.servers - 1}`);
          s.servers -= 1;
          s.cool = 0;
        }
      } else {
        s.cool = 0;
      }

      // Self-healing steps
      const down = s.crash === 1 || s.crash === 2 ? 1 : 0;
      if (s.crash === 1) {
        addLog("Fault", "Instance unhealthy. Removed from load balancer");
        s.crash = 2;
      } else if (s.crash === 2) {
        addLog("Healing", "Launching a replacement instance");
        s.crash = 3;
      } else if (s.crash === 3) {
        addLog("Recovered", "Replacement is healthy. Traffic is balanced again");
        s.crash = 0;
      }

      // Calculate the metrics
      const healthy = Math.max(1, s.servers - down);
      const capacity = healthy * CAPACITY;
      const cpu = Math.min(99, Math.max(5, Math.round((actual / capacity) * 65) + noise(6)));
      const memory = Math.round(35 + cpu * 0.35);
      const latency = Math.round(90 + (cpu > 60 ? (cpu - 60) * 8 : 0) + noise(20));
      const errorRate = actual > capacity ? Math.round(((actual - capacity) / actual) * 100) : 0;

      const point = {
        time: new Date().toLocaleTimeString(),
        actual,
        predicted,
        cpu,
        memory,
        latency,
      };

      setHistory((prev) => [...prev, point].slice(-25));
      setLatest({ ...point, servers: s.servers, healthy, errorRate });

      if (s.step !== null) {
        s.step += 1;
        if (s.step > 22) {
          s.step = null;
          addLog("Info", "Traffic burst finished");
        }
      }
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  const startBurst = () => {
    if (sim.current.step !== null) return;
    sim.current.step = 0;
    addLog("Info", "Traffic burst started (ticket sale opened)");
  };

  const crashServer = () => {
    if (sim.current.crash !== 0) return;
    sim.current.crash = 1;
    addLog("Info", "Fault injected: one server stopped on purpose");
  };

  const btn = { padding: "8px 14px", marginRight: "10px", cursor: "pointer" };

  return (
    <div style={{ padding: "16px" }}>
      <h2>Live Monitoring Dashboard</h2>
      <p style={{ marginTop: 0 }}>Simulated data. It refreshes every 2 seconds.</p>

      <div style={{ marginBottom: "16px" }}>
        <button style={btn} onClick={startBurst}>Start traffic burst</button>
        <button style={btn} onClick={crashServer}>Crash a server</button>
      </div>

      {latest && (
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
          <Card title="Servers (healthy / total)" value={`${latest.healthy} / ${latest.servers}`} unit="" warn={latest.healthy < latest.servers} />
          <Card title="Requests" value={latest.actual} unit="req/s" />
          <Card title="Forecast" value={latest.predicted} unit="req/s" />
          <Card title="CPU" value={latest.cpu} unit="%" warn={latest.cpu > 80} />
          <Card title="Memory" value={latest.memory} unit="%" />
          <Card title="Latency" value={latest.latency} unit="ms" warn={latest.latency > 250} />
          <Card title="Error rate" value={latest.errorRate} unit="%" warn={latest.errorRate > 0} />
        </div>
      )}

      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "16px" }}>
        <ChartBox title="Predicted vs actual load (req/s)">
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" hide />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="actual" name="Actual" stroke="#1565c0" dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="predicted" name="Predicted" stroke="#ef6c00" strokeDasharray="5 5" dot={false} isAnimationActive={false} />
          </LineChart>
        </ChartBox>

        <ChartBox title="CPU and memory (%)">
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" hide />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="cpu" name="CPU" stroke="#c62828" dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="memory" name="Memory" stroke="#2e7d32" dot={false} isAnimationActive={false} />
          </LineChart>
        </ChartBox>

        <ChartBox title="Response time (ms)">
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" hide />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="latency" name="Latency" stroke="#6a1b9a" dot={false} isAnimationActive={false} />
          </LineChart>
        </ChartBox>
      </div>

      <h3>Scaling and healing log</h3>
      {logs.length === 0 && <p>No events yet.</p>}
      <table style={{ borderCollapse: "collapse", width: "100%", maxWidth: "800px" }}>
        <tbody>
          {logs.map((l, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #ddd" }}>
              <td style={{ padding: "6px", whiteSpace: "nowrap" }}>{l.time}</td>
              <td style={{ padding: "6px", fontWeight: "bold", color: logColors[l.type] }}>{l.type}</td>
              <td style={{ padding: "6px" }}>{l.msg}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}