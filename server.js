const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const db = new sqlite3.Database("./pos.db");

// ---------------- DATABASE ----------------
db.serialize(() => {

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id TEXT,
    name TEXT,
    model TEXT,
    category TEXT,
    price REAL,
    cost REAL,
    stock INTEGER
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    phone TEXT,
    id_number TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS transfers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    date TEXT
  )`);

  // CREATE DEFAULT USER
  db.get("SELECT * FROM users WHERE username='admin'", (err,row)=>{
    if(!row){
      db.run("INSERT INTO users (username,password) VALUES (?,?)",
        ["admin","1234"]);
      console.log("✅ Default login: admin / 1234");
    }
  });
});

// ---------------- LOGIN ----------------
app.post("/login", (req,res)=>{
  const {username,password} = req.body;

  db.get("SELECT * FROM users WHERE username=? AND password=?",
    [username,password],
    (err,user)=>{
      if(err) return res.json({error:"DB error"});
      if(!user) return res.json({error:"Invalid login"});
      res.json({success:true});
    });
});

// ---------------- PRODUCTS ----------------
app.get("/products", (req,res)=>{
  db.all("SELECT * FROM products", (err,rows)=>res.json(rows));
});

app.post("/products", (req,res)=>{
  const p = req.body;
  db.run(`INSERT INTO products(item_id,name,model,category,price,cost,stock)
    VALUES(?,?,?,?,?,?,?)`,
    [p.item_id,p.name,p.model,p.category,p.price,p.cost,p.stock],
    ()=>res.json({success:true}));
});

// ---------------- STOCK ----------------
app.post("/add-stock", (req,res)=>{
  const {product_id,quantity} = req.body;
  db.run("UPDATE products SET stock=stock+? WHERE id=?",
    [quantity,product_id],
    ()=>res.json({success:true}));
});

// ---------------- AGENTS ----------------
app.post("/agents", (req,res)=>{
  const {name,phone,id_number} = req.body;
  db.run("INSERT INTO agents(name,phone,id_number) VALUES(?,?,?)",
    [name,phone,id_number],
    ()=>res.json({success:true}));
});

app.get("/agents", (req,res)=>{
  db.all("SELECT * FROM agents", (err,rows)=>res.json(rows));
});

// ---------------- TRANSFER ----------------
app.post("/transfer", (req,res)=>{
  const {agent_id,product_id,quantity} = req.body;

  db.get("SELECT * FROM products WHERE id=?",[product_id],(err,p)=>{
    if(!p) return res.json({error:"No product"});
    if(p.stock < quantity) return res.json({error:"Low stock"});

    db.run("UPDATE products SET stock=stock-? WHERE id=?",
      [quantity,product_id]);

    db.run(`INSERT INTO transfers(agent_id,product_id,quantity,date)
      VALUES(?,?,?,?)`,
      [agent_id,product_id,quantity,new Date().toISOString()],
      ()=>res.json({success:true}));
  });
});

app.get("/transfers", (req,res)=>{
  db.all(`
    SELECT t.*, a.name agent_name, p.name product_name
    FROM transfers t
    JOIN agents a ON t.agent_id=a.id
    JOIN products p ON t.product_id=p.id
  `,(err,rows)=>res.json(rows));
});

// ---------------- START ----------------
app.listen(3000, ()=>console.log("🚀 Server running on http://localhost:3000"));
