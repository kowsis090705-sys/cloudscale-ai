def analyze_metrics(metrics):
    cpu = metrics.get("cpuUsagePercent", 0)
    memory = metrics.get("memoryUsageMB", 0)
    errors = metrics.get("serverErrorCount", 0)
    latency = metrics.get("averageLatencyMs", 0)

    if cpu > 80:
        return {
            "status": "WARNING",
            "message": "High CPU usage detected!",
            "cpuUsagePercent": cpu,
            "memoryUsageMB": memory,
            "serverErrorCount": errors,
            "averageLatencyMs": latency
        }

    if memory > 500:
        return {
            "status": "WARNING",
            "message": "High memory usage detected!",
            "cpuUsagePercent": cpu,
            "memoryUsageMB": memory,
            "serverErrorCount": errors,
            "averageLatencyMs": latency
        }

    if errors > 0:
        return {
            "status": "WARNING",
            "message": "Server errors detected!",
            "cpuUsagePercent": cpu,
            "memoryUsageMB": memory,
            "serverErrorCount": errors,
            "averageLatencyMs": latency
        }

    if latency > 2000:
        return {
            "status": "WARNING",
            "message": "High response latency detected!",
            "cpuUsagePercent": cpu,
            "memoryUsageMB": memory,
            "serverErrorCount": errors,
            "averageLatencyMs": latency
        }

    return {
        "status": "NORMAL",
        "message": "All server metrics are normal",
        "cpuUsagePercent": cpu,
        "memoryUsageMB": memory,
        "serverErrorCount": errors,
        "averageLatencyMs": latency
    }
    


