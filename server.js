const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(bodyParser.json());
app.use(cors());

// 🔹 In-memory database (replace with real DB later)
let sales = [];
let products = [];

// ✅ Health check
app.get("/", (req, res) => {
  res.send("JS DISTRIBUTORS POS API RUNNING");
});

// ✅ Save sale
app.post("/sale", (req, res) => {
  const sale = req.body;
  sales.push(sale);
  res.json({ success: true });
});

// ✅ Get all sales
app.get("/sales", (req, res) => {
  res.json(sales);
});

// ✅ Save products
app.post("/products", (req, res) => {
  products = req.body;
  res.json({ success: true });
});

// ✅ Get products
app.get("/products", (req, res) => {
  res.json(products);
});

// ✅ Simulated M-Pesa (SAFE TEST)
app.post("/mpesa", (req, res) => {
  const { phone, amount } = req.body;

  console.log("M-Pesa request:", phone, amount);

  setTimeout(() => {
    res.json({ success: true });
  }, 2000);
});

const PORT = 3000;
app.listen(PORT, () => console.log("✅ Server running on port " + PORT));
