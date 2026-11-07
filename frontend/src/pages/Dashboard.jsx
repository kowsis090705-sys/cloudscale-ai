
import { useState, useEffect, useRef } from "react";
import {
  fetchRealMetrics,
  fetchAIAnalysis,
  fetchMLPrediction,
} from "../api/metrics";

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

// Demo configuration
const CAPACITY = 300;
const MIN_SERVERS = 2;
const MAX_SERVERS = 8;

// Synthetic traffic for ML demonstration
function loadAt(step) {
  if (step === null || step < 0) return 100;
  if (step <= 5) return 100 + (step + 1) * 150;
  if (step <= 13) return 1000;
  if (step <= 19) return 1000 - (step - 13) * 150;
  return 100;
}

const noise = (n) =>
  Math.round((Math.random() - 0.5) * n);

const logColors = {
  "Scale out": "#64b5f6",
  "Scale in": "#ce93d8",
  Fault: "#ff7070",
  Healing: "#ffb74d",
  Recovered: "#81c784",
  Info: "#b0bec5",
};

// Dashboard metric card
function Card({
  title,
  value,
  unit = "",
  warn = false,
}) {
  return (
    <div
      style={{
        border: "1px solid #354563",
        borderRadius: "10px",
        padding: "14px 18px",
        minWidth: "140px",
        background: warn ? "#44202d" : "#18243d",
        color: "#f8faff",
      }}
    >
      <small style={{ color: "#b9c5e2" }}>
        {title}
      </small>

      <h2 style={{ margin: "8px 0 0" }}>
        {value}
        <small style={{ fontSize: "14px" }}>
          {" "}{unit}
        </small>
      </h2>
    </div>
  );
}

// Dashboard chart container
function ChartBox({ title, children }) {
  return (
    <div
      style={{
        border: "1px solid #354563",
        borderRadius: "10px",
        padding: "14px",
        background: "#18243d",
        color: "#f8faff",
        flex: "1 1 420px",
        minWidth: "280px",
      }}
    >
      <h3 style={{ margin: "0 0 12px" }}>
        {title}
      </h3>

      <div style={{ width: "100%", height: 250 }}>
        <ResponsiveContainer>
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function Dashboard() {
  // Real Spring Boot monitoring
  const [realMetrics, setRealMetrics] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [metricsError, setMetricsError] = useState("");

  // ML simulation dashboard
  const [history, setHistory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [latest, setLatest] = useState(null);

  const [mlStatus, setMlStatus] = useState(
    "Collecting 5 traffic samples..."
  );

  // Store last five traffic measurements
  const recentLoads = useRef([]);

  // Simulated infrastructure state
  const sim = useRef({
    step: null,
    servers: MIN_SERVERS,
    cool: 0,
    crash: 0,
  });

  // Fetch real Java metrics every 5 seconds
  useEffect(() => {
    let active = true;

    const loadMetrics = async () => {
      try {
        const [metrics, analysis] =
          await Promise.all([
            fetchRealMetrics(),
            fetchAIAnalysis(),
          ]);

        if (active) {
          setRealMetrics(metrics);
          setAiAnalysis(analysis);
          setMetricsError("");
        }
      } catch (error) {
        if (active) {
          setMetricsError(
            "Unable to load live data. Check Java and Python servers."
          );
        }
      }
    };

    loadMetrics();

    const interval = setInterval(
      loadMetrics,
      5000
    );

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Add scaling and healing activity
  const addLog = (type, msg) => {
    const time = new Date().toLocaleTimeString();

    setLogs((prev) =>
      [{ time, type, msg }, ...prev].slice(0, 12)
    );
  };

  // ML prediction, autoscaling and healing demo
  useEffect(() => {
    let active = true;
    let busy = false;

    const tick = async () => {
      if (!active || busy) return;

      busy = true;

      try {
        const s = sim.current;

        // Current simulated traffic
        const actual = Math.max(
          50,
          loadAt(s.step) + noise(40)
        );

        // Keep latest five traffic readings
        recentLoads.current = [
          ...recentLoads.current,
          actual,
        ].slice(-5);

        let predicted = null;

        // Call real Random Forest model
        if (recentLoads.current.length === 5) {
          try {
            const result = await fetchMLPrediction(
              recentLoads.current
            );

            if (!active) return;

            const value = Number(
              result.predictedTraffic
            );

            if (
              !Number.isFinite(value) ||
              value < 0
            ) {
              throw new Error(
                "Invalid ML prediction"
              );
            }

            predicted = Math.round(value);

            setMlStatus(
              "Random Forest ML active | Synthetic-trained | 3 samples ahead"
            );
          } catch (error) {
            if (!active) return;

            setMlStatus(
              "ML service unavailable. Predictive scaling paused."
            );
          }
        } else {
          setMlStatus(
            `Collecting samples (${recentLoads.current.length}/5)...`
          );
        }

        // Predictive autoscaling simulation
        if (predicted !== null) {
          const needed = Math.min(
            MAX_SERVERS,
            Math.max(
              MIN_SERVERS,
              Math.ceil(
                (predicted * 1.1) / CAPACITY
              )
            )
          );

          // Scale out
          if (needed > s.servers) {
            addLog(
              "Scale out",
              `ML forecast ${predicted} req/s. Simulated servers ${s.servers} -> ${needed}`
            );

            s.servers = needed;
            s.cool = 0;
          }

          // Scale in with cooldown
          else if (needed < s.servers) {
            s.cool += 1;

            if (s.cool >= 4) {
              addLog(
                "Scale in",
                `ML forecast ${predicted} req/s. Simulated servers ${s.servers} -> ${s.servers - 1}`
              );

              s.servers -= 1;
              s.cool = 0;
            }
          } else {
            s.cool = 0;
          }
        }

        // Self-healing simulation
        const down =
          s.crash === 1 || s.crash === 2
            ? 1
            : 0;

        if (s.crash === 1) {
          addLog(
            "Fault",
            "Demo instance unhealthy. Removed from simulated load balancer"
          );

          s.crash = 2;
        } else if (s.crash === 2) {
          addLog(
            "Healing",
            "Launching a simulated replacement instance"
          );

          s.crash = 3;
        } else if (s.crash === 3) {
          addLog(
            "Recovered",
            "Simulated replacement healthy. Traffic balanced again"
          );

          s.crash = 0;
        }

        // Calculated demo infrastructure metrics
        const healthy = Math.max(
          1,
          s.servers - down
        );

        const capacity = healthy * CAPACITY;

        const cpu = Math.min(
          99,
          Math.max(
            5,
            Math.round(
              (actual / capacity) * 65
            ) + noise(6)
          )
        );

        const memory = Math.round(
          35 + cpu * 0.35
        );

        const latency = Math.round(
          90 +
            (cpu > 60 ? (cpu - 60) * 8 : 0) +
            noise(20)
        );

        const errorRate =
          actual > capacity
            ? Math.round(
                ((actual - capacity) / actual) *
                  100
              )
            : 0;

        const point = {
          time: new Date().toLocaleTimeString(),
          actual,
          predicted,
          cpu,
          memory,
          latency,
        };

        if (!active) return;

        setHistory((prev) =>
          [...prev, point].slice(-25)
        );

        setLatest({
          ...point,
          servers: s.servers,
          healthy,
          errorRate,
        });

        // Advance simulated traffic burst
        if (s.step !== null) {
          s.step += 1;

          if (s.step > 22) {
            s.step = null;

            addLog(
              "Info",
              "Traffic burst finished"
            );
          }
        }
      } catch (error) {
        if (active) {
          setMlStatus(
            "Dashboard simulation error. Check the browser console."
          );
        }
      } finally {
        busy = false;
      }
    };

    tick();

    const timer = setInterval(
      tick,
      2000
    );

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  // Start traffic burst
  const startBurst = () => {
    if (sim.current.step !== null) return;

    sim.current.step = 0;

    addLog(
      "Info",
      "Traffic burst started (ticket sale opened)"
    );
  };

  // Inject simulated server fault
  const crashServer = () => {
    if (sim.current.crash !== 0) return;

    sim.current.crash = 1;

    addLog(
      "Info",
      "Fault injected: one demo server stopped"
    );
  };

  const btn = {
    padding: "10px 16px",
    marginRight: "10px",
    marginBottom: "10px",
    cursor: "pointer",
    border: "1px solid #52658b",
    borderRadius: "8px",
    background: "#25365c",
    color: "#ffffff",
  };

  return (
    <div
      style={{
        padding: "20px",
        color: "#f8faff",
      }}
    >
      {/* LIVE SPRING BOOT METRICS */}

      <h2>
        Real-Time CloudScale AI Metrics
      </h2>

      <p style={{ color: "#b9c5e2" }}>
        Live Java Spring Boot metrics through
        Python FastAPI. Refreshes every 5 seconds.
      </p>

      {metricsError && (
        <p style={{ color: "#ff7070" }}>
          {metricsError}
        </p>
      )}

      {realMetrics ? (
        <div
          style={{
            display: "flex",
            gap: "15px",
            flexWrap: "wrap",
            marginBottom: "25px",
          }}
        >
          <Card
            title="Real CPU Usage"
            value={Number(
              realMetrics.cpuUsagePercent ?? 0
            ).toFixed(2)}
            unit="%"
          />

          <Card
            title="Real Memory Usage"
            value={Number(
              realMetrics.memoryUsageMB ?? 0
            ).toFixed(2)}
            unit="MB"
          />

          <Card
            title="Total HTTP Requests"
            value={realMetrics.requestCount ?? 0}
          />

          <Card
            title="Average Response Time"
            value={Number(
              realMetrics.averageLatencyMs ?? 0
            ).toFixed(2)}
            unit="ms"
          />

          <Card
            title="Server Errors"
            value={realMetrics.serverErrorCount ?? 0}
            warn={
              (realMetrics.serverErrorCount ?? 0) > 0
            }
          />
        </div>
      ) : (
        <p>Waiting for real metrics...</p>
      )}

      {/* EXISTING ANALYSIS */}

      <h3>AI Monitoring Analysis</h3>

      {aiAnalysis ? (
        <pre
          style={{
            background: "#151d35",
            color: "#e6ebff",
            padding: "16px",
            borderRadius: "10px",
            border: "1px solid #354563",
            overflowX: "auto",
            marginBottom: "25px",
          }}
        >
          {JSON.stringify(aiAnalysis, null, 2)}
        </pre>
      ) : (
        <p>Waiting for analysis data...</p>
      )}

      <hr
        style={{
          borderColor: "#303b5c",
          margin: "24px 0",
        }}
      />

      {/* ML DEMO DASHBOARD */}

      <h2>
        ML Predictive Autoscaling Dashboard
      </h2>

      <p style={{ color: "#b9c5e2" }}>
        Random Forest ML predictions with
        simulated autoscaling and self-healing.
        Updates every 2 seconds.
      </p>

      <p style={{ color: "#81c784" }}>
        ML Status: {mlStatus}
      </p>

      <div style={{ marginBottom: "16px" }}>
        <button
          style={btn}
          onClick={startBurst}
        >
          Start traffic burst
        </button>

        <button
          style={btn}
          onClick={crashServer}
        >
          Crash a server
        </button>
      </div>

      {/* SIMULATED METRICS */}

      {latest && (
        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "16px",
          }}
        >
          <Card
            title="Servers (healthy / total)"
            value={`${latest.healthy} / ${latest.servers}`}
            warn={
              latest.healthy < latest.servers
            }
          />

          <Card
            title="Requests"
            value={latest.actual}
            unit="req/s"
          />

          <Card
            title="ML Forecast"
            value={
              latest.predicted ?? "Waiting..."
            }
            unit="req/s"
          />

          <Card
            title="CPU"
            value={latest.cpu}
            unit="%"
            warn={latest.cpu > 80}
          />

          <Card
            title="Memory"
            value={latest.memory}
            unit="%"
          />

          <Card
            title="Latency"
            value={latest.latency}
            unit="ms"
            warn={latest.latency > 250}
          />

          <Card
            title="Error Rate"
            value={latest.errorRate}
            unit="%"
            warn={latest.errorRate > 0}
          />
        </div>
      )}

      {/* CHARTS */}

      <div
        style={{
          display: "flex",
          gap: "16px",
          flexWrap: "wrap",
          marginBottom: "16px",
        }}
      >
        {/* Traffic prediction chart */}

        <ChartBox title="ML Predicted vs Actual Load (req/s)">
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" hide />
            <YAxis />
            <Tooltip />
            <Legend />

            <Line
              type="monotone"
              dataKey="actual"
              name="Actual"
              stroke="#64b5f6"
              dot={false}
              isAnimationActive={false}
            />

            <Line
              type="monotone"
              dataKey="predicted"
              name="ML Forecast"
              stroke="#ffb74d"
              strokeDasharray="5 5"
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ChartBox>

        {/* CPU and memory chart */}

        <ChartBox title="CPU and Memory (%)">
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" hide />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Legend />

            <Line
              type="monotone"
              dataKey="cpu"
              name="CPU"
              stroke="#ff7070"
              dot={false}
              isAnimationActive={false}
            />

            <Line
              type="monotone"
              dataKey="memory"
              name="Memory"
              stroke="#81c784"
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ChartBox>

        {/* Latency chart */}

        <ChartBox title="Response Time (ms)">
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" hide />
            <YAxis />
            <Tooltip />
            <Legend />

            <Line
              type="monotone"
              dataKey="latency"
              name="Latency"
              stroke="#ce93d8"
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ChartBox>
      </div>

      {/* SCALING AND HEALING LOG */}

      <h3>Scaling and Healing Log</h3>

      {logs.length === 0 && (
        <p>No events yet.</p>
      )}

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            maxWidth: "900px",
          }}
        >
          <tbody>
            {logs.map((log, index) => (
              <tr
                key={index}
                style={{
                  borderBottom:
                    "1px solid #354563",
                }}
              >
                <td
                  style={{
                    padding: "8px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {log.time}
                </td>

                <td
                  style={{
                    padding: "8px",
                    fontWeight: "bold",
                    color:
                      logColors[log.type],
                  }}
                >
                  {log.type}
                </td>

                <td style={{ padding: "8px" }}>
                  {log.msg}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
