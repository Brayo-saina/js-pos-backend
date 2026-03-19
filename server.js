const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const SECRET = "js_distributors_secret";

// ---------------- DATABASE ----------------
const db = new sqlite3.Database("./pos.db");

db.serialize(() => {

  // USERS
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT
  )`);

  // PRODUCTS
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id TEXT UNIQUE,
    name TEXT,
    model TEXT,
    category TEXT,
    price REAL,
    cost REAL,
    stock INTEGER
  )`);

  // SALES
  db.run(`CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    total REAL,
    profit REAL,
    user TEXT,
    date TEXT
  )`);

  // AGENTS
  db.run(`CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    phone TEXT,
    id_number TEXT
  )`);

  // TRANSFERS
  db.run(`CREATE TABLE IF NOT EXISTS transfers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    date TEXT
  )`);

  // DEFAULT ADMIN
  db.get("SELECT * FROM users WHERE username='admin'", (err,row)=>{
    if(!row){
      db.run("INSERT INTO users (username,password,role) VALUES (?,?,?)",
        ["admin","1234","admin"]);
      console.log("Admin created: admin / 1234");
    }
  });
});

// ---------------- AUTH ----------------
app.post("/login", (req,res)=>{
  const {username,password} = req.body;
  db.get("SELECT * FROM users WHERE username=? AND password=?",
    [username,password], (err,user)=>{
    if(!user) return res.status(401).json({error:"Invalid login"});
    const token = jwt.sign(user, SECRET);
    res.json({token});
  });
});

function auth(req,res,next){
  const token = req.headers.authorization;
  if(!token) return res.status(403).json({error:"No token"});
  jwt.verify(token, SECRET, (err,user)=>{
    if(err) return res.status(403).json({error:"Invalid token"});
    req.user = user;
    next();
  });
}

// ---------------- PRODUCTS ----------------
app.get("/products", auth, (req,res)=>{
  db.all("SELECT * FROM products", (err,rows)=>res.json(rows));
});

app.post("/products", auth, (req,res)=>{
  const p = req.body;
  db.run(`INSERT INTO products(item_id,name,model,category,price,cost,stock)
    VALUES(?,?,?,?,?,?,?)`,
    [p.item_id,p.name,p.model,p.category,p.price,p.cost,p.stock],
    function(){ res.json({success:true}); });
});

// ---------------- ADD STOCK ----------------
app.post("/add-stock", auth, (req,res)=>{
  const {product_id,quantity} = req.body;
  db.run("UPDATE products SET stock=stock+? WHERE id=?",
    [quantity,product_id],
    ()=>res.json({success:true}));
});

// ---------------- SALES ----------------
app.post("/sale", auth, (req,res)=>{
  const {items,total,profit} = req.body;

  items.forEach(i=>{
    db.run("UPDATE products SET stock=stock-1 WHERE id=?", [i.id]);
  });

  db.run(`INSERT INTO sales(total,profit,user,date)
    VALUES(?,?,?,?)`,
    [total,profit,req.user.username,new Date().toISOString()],
    ()=>res.json({success:true}));
});

app.get("/sales", auth, (req,res)=>{
  db.all("SELECT * FROM sales", (err,rows)=>res.json(rows));
});

// ---------------- AGENTS ----------------
app.post("/agents", auth, (req,res)=>{
  const {name,phone,id_number} = req.body;
  db.run("INSERT INTO agents(name,phone,id_number) VALUES(?,?,?)",
    [name,phone,id_number],
    function(){ res.json({success:true}); });
});

app.get("/agents", auth, (req,res)=>{
  db.all("SELECT * FROM agents", (err,rows)=>res.json(rows));
});

// ---------------- TRANSFERS ----------------
app.post("/transfer", auth, (req,res)=>{
  const {agent_id,product_id,quantity} = req.body;

  db.get("SELECT * FROM products WHERE id=?",[product_id],(err,p)=>{
    if(!p) return res.json({error:"Product not found"});
    if(p.stock<quantity) return res.json({error:"Insufficient stock"});

    db.run("UPDATE products SET stock=stock-? WHERE id=?",
      [quantity,product_id]);

    db.run(`INSERT INTO transfers(agent_id,product_id,quantity,date)
      VALUES(?,?,?,?)`,
      [agent_id,product_id,quantity,new Date().toISOString()],
      ()=>res.json({success:true}));
  });
});

app.get("/transfers", auth, (req,res)=>{
  db.all(`
    SELECT t.*, a.name agent_name, a.phone, a.id_number,
           p.name product_name, p.item_id
    FROM transfers t
    JOIN agents a ON t.agent_id=a.id
    JOIN products p ON t.product_id=p.id
  `,(err,rows)=>res.json(rows));
});

// ---------------- M-PESA ----------------
app.post("/mpesa", auth, (req,res)=>{
  setTimeout(()=>res.json({success:true}),1500);
});

// ---------------- START ----------------
app.listen(3000,()=>console.log("Server running on 3000"));
