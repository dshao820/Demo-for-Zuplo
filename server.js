// Demo backend API for Zuplo
// 這支服務作為 Zuplo API Gateway 後方的 origin (backend)。
// Zuplo 負責 auth / rate-limiting / API key 等,請求驗證通過後再轉發到這裡。

const express = require('express');

const app = express();
app.use(express.json());

// ---- 簡單的存取記錄 (方便在 Zuplo 介接時觀察流量) ----
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

// ---- 範例資料 (in-memory,重啟後重置) ----
let products = [
  { id: 1, name: 'Starter Plan', price: 0, currency: 'USD' },
  { id: 2, name: 'Pro Plan', price: 49, currency: 'USD' },
  { id: 3, name: 'Enterprise Plan', price: 299, currency: 'USD' },
];
let nextId = 4;

// ---- Health check (Zuplo / 監控用) ----
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// ---- List all products ----
app.get('/products', (req, res) => {
  res.json({ data: products, count: products.length });
});

// ---- Get a single product ----
app.get('/products/:id', (req, res) => {
  const product = products.find((p) => p.id === Number(req.params.id));
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

// ---- Create a product ----
app.post('/products', (req, res) => {
  const { name, price, currency } = req.body || {};
  if (!name || price === undefined) {
    return res.status(400).json({ error: 'name and price are required' });
  }
  const product = { id: nextId++, name, price, currency: currency || 'USD' };
  products.push(product);
  res.status(201).json(product);
});

// ---- Update a product ----
app.put('/products/:id', (req, res) => {
  const product = products.find((p) => p.id === Number(req.params.id));
  if (!product) return res.status(404).json({ error: 'Product not found' });
  const { name, price, currency } = req.body || {};
  if (name !== undefined) product.name = name;
  if (price !== undefined) product.price = price;
  if (currency !== undefined) product.currency = currency;
  res.json(product);
});

// ---- Delete a product ----
app.delete('/products/:id', (req, res) => {
  const index = products.findIndex((p) => p.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Product not found' });
  const [removed] = products.splice(index, 1);
  res.json({ deleted: removed });
});

// ---- 404 fallback ----
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Demo backend listening on http://localhost:${PORT}`);
});

module.exports = app;
