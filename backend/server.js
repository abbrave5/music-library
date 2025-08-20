const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const app = express();
const PORT = 5000;

const allowedOrigins = [
  'http://localhost:3000',
  'https://aldongrove.100mountain.net'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());
app.use('/api/pdfs', express.static(path.join(__dirname, 'pdfs')));
//this code for debugginb
app.use((req, res, next) => {
  let size = 0;
  req.on('data', chunk => size += chunk.length);
  req.on('end', () => {
    console.log(`Request size: ${size} bytes`);
  });
  next();
});
//end snippet

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'pdfs'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ 
	storage,
	limits: {fileSize: 100 * 1024 * 1024 } //100MB
});

app.get('/api/scores', (req, res) => {
  const query = req.query.q;
  const aCappellaFilter = req.query.a_cappella;

  let sql = 'SELECT * FROM scores';
  const params = [];

  if (query) {
    sql += ` WHERE (title LIKE ? OR arranger LIKE ? OR style LIKE ? OR tempo LIKE ?)`;
    const param = `%${query}%`;
    params.push(param, param, param, param);

    if (aCappellaFilter !== undefined) {
      sql += ` AND a_cappella = ?`;
      params.push(Number(aCappellaFilter));
    }
  } else if (aCappellaFilter !== undefined) {
    sql += ` WHERE a_cappella = ?`;
    params.push(Number(aCappellaFilter));
  }

  sql += ` ORDER BY id DESC`;

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error("Error fetching scores:", err);
      return res.status(500).send(err);
    }
    res.json(rows);
  });
});




app.post('/api/upload', upload.single('pdf'), (req, res) => {
  const { title, arranger, style, tempo } = req.body;
  const filename = req.file.filename;
  
  const aCappellaRaw = req.body.a_cappella;
  const aCappella = aCappellaRaw === '1' || aCappellaRaw === 'true' ? 1 : 0;
  

  db.run(`INSERT INTO scores (title, arranger, style, tempo, filename, a_cappella) VALUES (?, ?, ?, ?, ?, ?)`,
    [title, arranger, style, tempo, filename, aCappella], function (err) {
      if (err) {
		  console.error("Upload failed:", err.message);
		  return res.status(500).send(err);
	  }
      res.json({ id: this.lastID });
    });
});

app.delete('/api/scores/:id', (req, res) => {
  const id = req.params.id;
  db.get(`SELECT filename FROM scores WHERE id = ?`, [id], (err, row) => {
    if (err || !row) return res.status(404).send('Score not found');
    fs.unlinkSync(`pdfs/${row.filename}`);
    db.run(`DELETE FROM scores WHERE id = ?`, [id], err => {
      if (err) return res.status(500).send(err);
      res.sendStatus(200);
    });
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});



