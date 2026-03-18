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
    name TEXT,
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

  // TRANSFERS
  db.run(`CREATE TABLE IF NOT EXISTS transfers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    quantity INTEGER,
    from_location TEXT,
    to_location TEXT,
    date TEXT
  )`);

  // DEFAULT ADMIN
  db.get("SELECT * FROM users WHERE username='admin'", (err,row)=>{
    if(!row){
      db.run("INSERT INTO users (username,password,role) VALUES (?,?,?)", ["admin","1234","admin"]);
      console.log("Default admin user created: admin / 1234");
    }
  });
});

// ---------------- AUTH ----------------
app.post("/login", (req,res)=>{
  const {username,password} = req.body;
  db.get("SELECT * FROM users WHERE username=? AND password=?", [username,password], (err,user)=>{
    if(err || !user) return res.status(401).json({error:"Invalid credentials"});
    const token = jwt.sign({username:user.username, role:user.role}, SECRET);
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
  if(req.user.role!=="admin") return res.status(403).json({error:"Admin only"});
  const {name,price,cost,stock} = req.body;
  db.run("INSERT INTO products(name,price,cost,stock) VALUES(?,?,?,?)", [name,price,cost,stock], function(){
    res.json({success:true,id:this.lastID});
  });
});

// ---------------- SALES ----------------
app.post("/sale", auth, (req,res)=>{
  const {items,total,profit} = req.body;
  db.run("INSERT INTO sales(total,profit,user,date) VALUES(?,?,?,?)", [total,profit,req.user.username,new Date().toISOString()], function(){
    res.json({success:true,id:this.lastID});
  });
});

app.get("/sales", auth, (req,res)=>{
  db.all("SELECT * FROM sales", (err,rows)=>res.json(rows));
});

// ---------------- TRANSFERS ----------------
app.post("/transfer", auth, (req,res)=>{
  const {product_id, quantity, from_location, to_location} = req.body;
  db.get("SELECT * FROM products WHERE id=?", [product_id], (err,product)=>{
    if(err || !product) return res.status(404).json({error:"Product not found"});
    if(product.stock<quantity) return res.status(400).json({error:"Insufficient stock"});
    db.run("UPDATE products SET stock=stock-? WHERE id=?", [quantity,product_id]);
    db.run("INSERT INTO transfers(product_id,quantity,from_location,to_location,date) VALUES(?,?,?,?,?)",
      [product_id,quantity,from_location,to_location,new Date().toISOString()],
      function(){ res.json({success:true,transfer_id:this.lastID}); }
    );
  });
});

app.get("/transfers", auth, (req,res)=>{
  db.all(`SELECT t.id, p.name AS product, t.quantity, t.from_location, t.to_location, t.date 
          FROM transfers t JOIN products p ON t.product_id = p.id`, (err,rows)=>res.json(rows));
});

// ---------------- M-PESA SIMULATION ----------------
app.post("/mpesa", auth, (req,res)=>{
  const {phone, amount} = req.body;
  console.log(`M-Pesa payment simulated: ${phone} pays ${amount}`);
  setTimeout(()=>res.json({success:true}),2000);
});

// ---------------- START SERVER ----------------
const PORT = 3000;
app.listen(PORT,()=>console.log(`✅ Backend running on port ${PORT}`));
