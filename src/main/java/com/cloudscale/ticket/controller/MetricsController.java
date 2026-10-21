
package com.cloudscale.ticket.controller;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/metrics")
public class MetricsController {

    private final MeterRegistry registry;

    public MetricsController(MeterRegistry registry) {
        this.registry = registry;
    }

    @GetMapping
    public Map<String, Object> getMetrics() {
        Map<String, Object> metrics = new HashMap<>();

        Gauge cpu = registry.find("process.cpu.usage").gauge();
        Gauge memory = registry.find("jvm.memory.used")
                .tag("area", "heap").gauge();

        double cpuUsage = cpu != null ? cpu.value() * 100 : 0;
        double memoryMB = memory != null
                ? memory.value() / (1024 * 1024) : 0;

        double requestCount = 0;
        double totalTime = 0;
        double errorCount = 0;

        for (Timer timer : registry.find("http.server.requests").timers()) {
            long count = timer.count();
            requestCount += count;
            totalTime += timer.totalTime(
                    java.util.concurrent.TimeUnit.MILLISECONDS);

            String status = timer.getId().getTag("status");
            if (status != null && status.startsWith("5")) {
                errorCount += count;
            }
        }

        double avgLatency = requestCount > 0
                ? totalTime / requestCount : 0;

        metrics.put("cpuUsagePercent", cpuUsage);
        metrics.put("memoryUsageMB", memoryMB);
        metrics.put("requestCount", requestCount);
        metrics.put("averageLatencyMs", avgLatency);
        metrics.put("serverErrorCount", errorCount);

        return metrics;
    }
}
