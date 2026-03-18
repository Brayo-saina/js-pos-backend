const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const SECRET = "js_distributors_secret";

// 🗄️ DATABASE
const db = new sqlite3.Database("./pos.db");

// CREATE TABLES
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT,
    password TEXT,
    role TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    name TEXT,
    price REAL,
    cost REAL,
    stock INTEGER
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY,
    total REAL,
    profit REAL,
    user TEXT,
    date TEXT
  )`);

  // default admin
  db.run(`INSERT OR IGNORE INTO users (id, username, password, role)
          VALUES (1, 'admin', '1234', 'admin')`);
});

// 🔐 LOGIN
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.get(
    "SELECT * FROM users WHERE username=? AND password=?",
    [username, password],
    (err, user) => {
      if (!user) return res.status(401).send("Invalid");

      const token = jwt.sign(user, SECRET);
      res.json({ token });
    }
  );
});

// 🔐 AUTH MIDDLEWARE
function auth(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.sendStatus(403);

  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// 📦 PRODUCTS
app.get("/products", auth, (req, res) => {
  db.all("SELECT * FROM products", (err, rows) => {
    res.json(rows);
  });
});

app.post("/products", auth, (req, res) => {
  const { name, price, cost, stock } = req.body;

  db.run(
    "INSERT INTO products(name,price,cost,stock) VALUES(?,?,?,?)",
    [name, price, cost, stock],
    () => res.json({ success: true })
  );
});

// 💰 SALES
app.post("/sale", auth, (req, res) => {
  const { total, profit } = req.body;

  db.run(
    "INSERT INTO sales(total,profit,user,date) VALUES(?,?,?,?)",
    [total, profit, req.user.username, new Date()],
    () => res.json({ success: true })
  );
});

app.get("/reports", auth, (req, res) => {
  db.all("SELECT * FROM sales", (err, rows) => {
    res.json(rows);
  });
});

// 🚀 START
app.listen(3000, () => console.log("🔥 FINAL POS RUNNING"));
