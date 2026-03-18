// ---------------- ADD STOCK ----------------
app.post("/add-stock", auth, (req, res) => {
  const { product_id, quantity } = req.body;
  db.get("SELECT * FROM products WHERE id=?", [product_id], (err, product) => {
    if (err || !product) return res.status(404).json({ error: "Product not found" });
    db.run("UPDATE products SET stock=stock+? WHERE id=?", [quantity, product_id], function () {
      res.json({ success: true, newStock: product.stock + quantity });
    });
  });
});

// ---------------- UPDATE SALE TO DEDUCT STOCK ----------------
app.post("/sale", auth, (req, res) => {
  const { items, total, profit } = req.body;
  // Deduct stock
  items.forEach(item => {
    db.run("UPDATE products SET stock=stock-? WHERE id=?", [1, item.id]); // Deduct 1 per item
  });
  // Record sale
  db.run(
    "INSERT INTO sales(total,profit,user,date) VALUES(?,?,?,?)",
    [total, profit, req.user.username, new Date().toISOString()],
    function () {
      res.json({ success: true, id: this.lastID });
    }
  );
});
