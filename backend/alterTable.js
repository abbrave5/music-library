const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./scores.db');

db.run(`ALTER TABLE scores ADD COLUMN a_cappella INTEGER DEFAULT 0`, (err) => {
  if (err) {
    console.error("Failed to alter table:", err.message);
  } else {
    console.log("✅ Column 'a_cappella' added successfully.");
  }
  db.close();
});
