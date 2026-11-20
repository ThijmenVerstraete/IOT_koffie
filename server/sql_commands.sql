CREATE TABLE state (
    temperature INTEGER,
    water INTEGER,
    brewing BOOLEAN
);


INSERT INTO state (temperature, water, brewing)
VALUES
    (85, 400, 0),
    (90, 500, 1),
    (95, 600, 0);