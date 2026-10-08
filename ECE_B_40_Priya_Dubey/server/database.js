/**
 * database.js
 * Connects to SQLite, creates tables, and inserts sample rooms once.
 * Uses parameterized queries everywhere else in controllers.
 */
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dbPath = path.join(__dirname, "..", "hotel.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Could not connect to SQLite:", err.message);
  } else {
    console.log("Connected to SQLite database:", dbPath);
  }
});

// Foreign keys are off by default in SQLite. Turn them on.
db.run("PRAGMA foreign_keys = ON");

function initDatabase() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_number TEXT UNIQUE NOT NULL,
        room_type TEXT NOT NULL,
        price REAL NOT NULL,
        status TEXT DEFAULT 'Available'
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guest_name TEXT NOT NULL,
        guest_email TEXT NOT NULL,
        guest_phone TEXT NOT NULL,
        room_id INTEGER NOT NULL,
        check_in DATE NOT NULL,
        check_out DATE NOT NULL,
        status TEXT DEFAULT 'Confirmed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(room_id) REFERENCES rooms(id)
      )
    `);

    // Seed sample rooms only if the table is empty.
    db.get("SELECT COUNT(*) AS count FROM rooms", (err, row) => {
      if (err) {
        console.error("Failed to count rooms:", err.message);
        return;
      }

      if (row.count === 0) {
        const insert = db.prepare(
          "INSERT INTO rooms (room_number, room_type, price, status) VALUES (?, ?, ?, ?)"
        );

        const sampleRooms = [
          ["101", "Single", 1500, "Available"],
          ["102", "Double", 2200, "Available"],
          ["103", "Deluxe", 3000, "Available"],
          ["104", "Suite", 5000, "Available"],
          ["105", "Deluxe", 3200, "Available"],
          ["106", "Double", 2400, "Available"]
        ];

        sampleRooms.forEach((room) => insert.run(room));
        insert.finalize();
        console.log("Sample rooms inserted into hotel.db");
      }
    });
  });
}

/**
 * Promise wrappers so controllers stay readable (no nested callbacks).
 */
function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

module.exports = {
  db,
  initDatabase,
  dbAll,
  dbGet,
  dbRun
};
