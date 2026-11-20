from flask import Flask, render_template, jsonify, request
import sqlite3

app = Flask(__name__)

machine = {"temperature": 20.0, "water": 80}
WATER_PER_CUP = 10

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/api/status")
def status():
    return jsonify(machine)

@app.route("/api/brew", methods=["POST"])
def brew():
    data = request.get_json(force=True)
    cups = int(data.get("cups", 1))
    strength = int(data.get("strength", 2))

    # temp
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO state (temperature, water, brewing)
        VALUES (?, ?, ?)
    """, (40, 30, True))

    conn.commit()
    conn.close()
    # end of temp

    if machine["water"] < cups * WATER_PER_CUP:
        return jsonify(error="Not enough water"), 400
 
    # TODO: send the command to your IoT device here
    machine["water"] -= cups * WATER_PER_CUP
    return jsonify(ok=True, cups=cups, strength=strength)
 
 
if __name__ == "__main__":
    app.run(debug=True)