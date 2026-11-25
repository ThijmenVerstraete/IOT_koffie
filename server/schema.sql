-- Every "brew coffee" request from the web page
CREATE TABLE IF NOT EXISTS coffee_requests (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    requested_at TEXT    NOT NULL DEFAULT (datetime('now')),   -- UTC
    cups         INTEGER NOT NULL CHECK (cups BETWEEN 1 AND 6),
    strength     INTEGER NOT NULL CHECK (strength BETWEEN 1 AND 3),  -- 1 mild, 2 medium, 3 strong
    water_used   INTEGER NOT NULL                              -- % of the tank
);

-- Readings from the machine / PSoC board
CREATE TABLE IF NOT EXISTS sensor_data (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    recorded_at TEXT    NOT NULL DEFAULT (datetime('now')),    -- UTC
    temperature REAL,                                          -- degrees Celsius
    water_level REAL,                                          -- % of the tank
    slider      INTEGER                                        -- CapSense slider 0-100
);

CREATE INDEX IF NOT EXISTS idx_coffee_requests_time ON coffee_requests (requested_at);
CREATE INDEX IF NOT EXISTS idx_sensor_data_time     ON sensor_data (recorded_at);
