
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error

# Demonstration traffic data.
# Replace this with real historical metrics later.
def generate_training_data():
    rng = np.random.default_rng(42)
    traffic = []

    for step in range(600):
        cycle = step % 60

        baseline = 120 + 35 * np.sin(step / 8)

        if 15 <= cycle <= 30:
            baseline += 500

        if 31 <= cycle <= 40:
            baseline += 250

        traffic.append(
            max(0, baseline + rng.normal(0, 25))
        )

    return np.array(traffic, dtype=float)


def make_dataset(traffic, window=5, horizon=3):
    X = []
    y = []

    # Predict traffic 3 measurements ahead
    for i in range(window, len(traffic) - horizon + 1):
        X.append(traffic[i - window:i])
        y.append(traffic[i + horizon - 1])

    return np.array(X), np.array(y)


traffic_data = generate_training_data()

X, y = make_dataset(traffic_data)

# Chronological train/test split
split = int(len(X) * 0.8)

X_train, X_test = X[:split], X[split:]
y_train, y_test = y[:split], y[split:]

model = RandomForestRegressor(
    n_estimators=100,
    max_depth=12,
    random_state=42,
    n_jobs=-1
)

model.fit(X_train, y_train)

predictions = model.predict(X_test)

mae = mean_absolute_error(y_test, predictions)


def predict_traffic(recent_loads):
    if len(recent_loads) < 5:
        raise ValueError(
            "At least 5 traffic measurements are required"
        )

    latest = np.array(
        recent_loads[-5:],
        dtype=float
    ).reshape(1, -1)

    predicted = model.predict(latest)[0]

    return {
        "predictedTraffic": round(
            max(0, float(predicted)), 2
        ),
        "predictionHorizon": 3,
        "algorithm": "Random Forest Regression",
        "trainingData": "Synthetic demo traffic",
        "testMAE": round(float(mae), 2)
    }


if __name__ == "__main__":
    print("CloudScale AI - Random Forest Predictor")
    print("Test MAE:", round(float(mae), 2))

    result = predict_traffic(
        [150, 200, 300, 450, 600]
    )

    print("Prediction:", result)
