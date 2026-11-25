from flask import Flask, render_template, jsonify, request
import sqlite3
import os
from contextlib import contextmanager
from datetime import datetime, timedelta
from dotenv import load_dotenv
from functools import wraps
import hmac

load_dotenv()  # without this call the keys in .env are never read

app = Flask(__name__)

DB_PATH = os.environ.get("DATABASE", os.path.join(app.root_path, "database.db"))
SCHEMA_PATH = os.path.join(app.root_path, "schema.sql")

machine = {"temperature": 20.0, "water": 80, "slider": None}
WATER_PER_CUP = 10

# Keys staan in een .env
API_KEYS = {
    "admin": os.getenv("ADMIN_API_KEY"),
    "user": os.getenv("USER_API_KEY"),
}

ROLE_LEVEL = {"user": 1, "admin": 2}


# ---- Database ---------------------------------------------------------------
@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    """Create the tables if needed and restore the last known machine state."""
    with get_db() as conn:
        with open(SCHEMA_PATH) as f:
            conn.executescript(f.read())
        # Latest known value per column (a row may only contain some of them)
        for key, column in (("temperature", "temperature"), ("water", "water_level"), ("slider", "slider")):
            row = conn.execute(
                f"SELECT {column} FROM sensor_data WHERE {column} IS NOT NULL "
                "ORDER BY id DESC LIMIT 1"
            ).fetchone()
            if row:
                machine[key] = row[0]


def save_sensor_reading(conn, temperature=None, water=None, slider=None):
    conn.execute(
        "INSERT INTO sensor_data (temperature, water_level, slider) VALUES (?, ?, ?)",
        (temperature, water, slider),
    )


init_db()


# ---- API keys ---------------------------------------------------------------
def role_for_key(key):
    """Return the role belonging to this key, or None. Constant-time compare."""
    found = None
    for role, secret in API_KEYS.items():
        if not secret:
            continue
        if hmac.compare_digest(key.encode(), secret.encode()):
            found = role
    return found


def require_role(minimum):
    """Decorator: request needs a valid 'X-API-Key' header with at least this role."""
    def decorator(view):
        @wraps(view)
        def wrapper(*args, **kwargs):
            key = request.headers.get("X-API-Key", "")
            role = role_for_key(key) if key else None
            if role is None:
                return jsonify(error="Missing or invalid API key"), 401
            if ROLE_LEVEL[role] < ROLE_LEVEL[minimum]:
                return jsonify(error="Admin key required"), 403
            request.role = role
            return view(*args, **kwargs)
        return wrapper
    return decorator


# ---- Routes -----------------------------------------------------------------
@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/status")
def status():
    return jsonify(machine)


@app.route("/api/brew", methods=["POST"])
@require_role("user")
def brew():
    data = request.get_json(force=True)
    cups = int(data.get("cups", 1))
    strength = int(data.get("strength", 2))

    if not 1 <= cups <= 6 or not 1 <= strength <= 3:
        return jsonify(error="cups must be 1-6 and strength 1-3"), 400

    water_used = cups * WATER_PER_CUP
    if machine["water"] < water_used:
        return jsonify(error="Not enough water"), 400

    # TODO: send the command to your IoT device here
    machine["water"] -= water_used

    with get_db() as conn:
        conn.execute(
            "INSERT INTO coffee_requests (cups, strength, water_used) VALUES (?, ?, ?)",
            (cups, strength, water_used),
        )
        save_sensor_reading(conn, machine["temperature"], machine["water"], machine["slider"])

    return jsonify(ok=True, cups=cups, strength=strength)


@app.route("/api/sensor", methods=["POST"])
@require_role("user")  # the PSoC board uses the user key
def sensor():
    """PSoC 6 posts any of: {"temperature": 85.2, "water": 64, "slider": 40}"""
    data = request.get_json(silent=True) or {}
    try:
        temperature = float(data["temperature"]) if "temperature" in data else None
        water = float(data["water"]) if "water" in data else None
        slider = int(data["slider"]) if "slider" in data else None
    except (TypeError, ValueError):
        return jsonify(error="values must be numbers"), 400
    if temperature is None and water is None and slider is None:
        return jsonify(error="send temperature, water and/or slider"), 400

    if temperature is not None:
        machine["temperature"] = temperature
    if water is not None:
        machine["water"] = water
    if slider is not None:
        machine["slider"] = slider

    with get_db() as conn:
        save_sensor_reading(conn, temperature, water, slider)
    return jsonify(ok=True)


@app.route("/api/stats")
@require_role("user")
def stats():
    """Cups of coffee per hour (last 24 h) or per day (last 7 days), local time."""
    period = request.args.get("period", "day")
    now = datetime.now()
    if period == "hour":
        fmt, step, count, since = "%Y-%m-%d %H:00", timedelta(hours=1), 24, "-25 hours"
        first = now.replace(minute=0, second=0, microsecond=0) - step * (count - 1)
    elif period == "day":
        fmt, step, count, since = "%Y-%m-%d", timedelta(days=1), 7, "-8 days"
        first = now.replace(hour=0, minute=0, second=0, microsecond=0) - step * (count - 1)
    else:
        return jsonify(error="period must be 'hour' or 'day'"), 400

    with get_db() as conn:
        rows = conn.execute(
            "SELECT strftime(?, requested_at, 'localtime') AS bucket, SUM(cups) "
            "FROM coffee_requests WHERE requested_at >= datetime('now', ?) "
            "GROUP BY bucket",
            (fmt, since),
        ).fetchall()
    totals = dict(rows)

    labels = [(first + step * i).strftime(fmt) for i in range(count)]
    return jsonify(period=period, labels=labels, cups=[totals.get(b, 0) for b in labels])


if __name__ == "__main__":
    # app.run(debug=True)
    # eerst: openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
    app.run(ssl_context=("cert.pem", "key.pem"))
