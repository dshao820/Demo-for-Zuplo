const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ---------------------------------------------------------------------------
// In-memory 資料（重啟後重置，純展示用）
// ---------------------------------------------------------------------------

let products = [
  { id: 1, name: 'Starter Plan', price: 0, currency: 'USD' },
  { id: 2, name: 'Pro Plan', price: 49, currency: 'USD' },
  { id: 3, name: 'Enterprise Plan', price: 299, currency: 'USD' },
];

let nextId = 4;

// ---------------------------------------------------------------------------
// 共用工具
// ---------------------------------------------------------------------------

/**
 * 統一錯誤格式。message 必須具體到讓呼叫端（含 AI agent）
 * 讀完就知道該怎麼修正請求，不要只回 "Bad Request"。
 */
function sendError(res, status, error, message) {
  return res.status(status).json({ error, message });
}

function notFound(res, id) {
  return sendError(res, 404, 'NOT_FOUND', `Product with id ${id} does not exist`);
}

/** 解析路徑上的 id，非正整數一律視為不合法 */
function parseId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) return null;
  return id;
}

/** 驗證 name / price / currency，回傳錯誤訊息字串或 null */
function validateField(field, value) {
  if (field === 'name') {
    if (typeof value !== 'string') {
      return `name must be a string, received ${typeof value}`;
    }
    if (value.trim() === '') {
      return 'name must not be an empty string';
    }
  }
  if (field === 'price') {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return `price must be a number, received ${typeof value}`;
    }
    if (value < 0) {
      return `price must be greater than or equal to 0, received ${value}`;
    }
  }
  if (field === 'currency') {
    if (typeof value !== 'string') {
      return `currency must be a string, received ${typeof value}`;
    }
    if (!/^[A-Z]{3}$/.test(value)) {
      return `currency must be a 3-letter ISO 4217 code in uppercase, received "${value}"`;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// System
// ---------------------------------------------------------------------------

// GET /health
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Number(process.uptime().toFixed(2)),
  });
});

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

// GET /products
app.get('/products', (req, res) => {
  const data = [...products].sort((a, b) => a.id - b.id);
  res.json({ data, count: data.length });
});

// POST /products
app.post('/products', (req, res) => {
  const body = req.body || {};
  const { name, price, currency } = body;

  if (name === undefined) {
    return sendError(res, 400, 'INVALID_INPUT', 'name is required');
  }
  if (price === undefined) {
    return sendError(
      res,
      400,
      'INVALID_INPUT',
      'price is required. Use 0 for free plans instead of omitting it'
    );
  }

  for (const [field, value] of Object.entries({ name, price })) {
    const err = validateField(field, value);
    if (err) return sendError(res, 400, 'INVALID_INPUT', err);
  }
  if (currency !== undefined) {
    const err = validateField('currency', currency);
    if (err) return sendError(res, 400, 'INVALID_INPUT', err);
  }

  const product = {
    id: nextId++,
    name: name.trim(),
    price,
    currency: currency ?? 'USD',
  };
  products.push(product);

  res.status(201).json(product);
});

// GET /products/:id
app.get('/products/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return sendError(
      res,
      400,
      'INVALID_INPUT',
      `id must be a positive integer, received "${req.params.id}"`
    );
  }

  const product = products.find((p) => p.id === id);
  if (!product) return notFound(res, id);

  res.json(product);
});

// PATCH /products/:id — 部分更新，未提供的欄位維持原值
app.patch('/products/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return sendError(
      res,
      400,
      'INVALID_INPUT',
      `id must be a positive integer, received "${req.params.id}"`
    );
  }

  const product = products.find((p) => p.id === id);
  if (!product) return notFound(res, id);

  const body = req.body || {};
  const { name, price, currency } = body;

  if (name === undefined && price === undefined && currency === undefined) {
    return sendError(
      res,
      400,
      'INVALID_INPUT',
      'At least one of name, price, currency must be provided'
    );
  }

  for (const [field, value] of Object.entries({ name, price, currency })) {
    if (value === undefined) continue;
    const err = validateField(field, value);
    if (err) return sendError(res, 400, 'INVALID_INPUT', err);
  }

  if (name !== undefined) product.name = name.trim();
  if (price !== undefined) product.price = price;
  if (currency !== undefined) product.currency = currency;

  res.json(product);
});

// PUT /products/:id — 全量覆寫，未提供的選填欄位會回到預設值
app.put('/products/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return sendError(
      res,
      400,
      'INVALID_INPUT',
      `id must be a positive integer, received "${req.params.id}"`
    );
  }

  const index = products.findIndex((p) => p.id === id);
  if (index === -1) return notFound(res, id);

  const body = req.body || {};
  const { name, price, currency } = body;

  if (name === undefined) {
    return sendError(
      res,
      400,
      'INVALID_INPUT',
      'name is required for a full replacement. Use PATCH if you only want to update some fields'
    );
  }
  if (price === undefined) {
    return sendError(
      res,
      400,
      'INVALID_INPUT',
      'price is required for a full replacement. Use PATCH if you only want to update some fields'
    );
  }

  for (const [field, value] of Object.entries({ name, price })) {
    const err = validateField(field, value);
    if (err) return sendError(res, 400, 'INVALID_INPUT', err);
  }
  if (currency !== undefined) {
    const err = validateField('currency', currency);
    if (err) return sendError(res, 400, 'INVALID_INPUT', err);
  }

  const replaced = {
    id,
    name: name.trim(),
    price,
    currency: currency ?? 'USD',
  };
  products[index] = replaced;

  res.json(replaced);
});

// DELETE /products/:id
app.delete('/products/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return sendError(
      res,
      400,
      'INVALID_INPUT',
      `id must be a positive integer, received "${req.params.id}"`
    );
  }

  const index = products.findIndex((p) => p.id === id);
  if (index === -1) return notFound(res, id);

  products.splice(index, 1);
  res.json({ deleted: true, id });
});

// ---------------------------------------------------------------------------
// 全域錯誤處理
// ---------------------------------------------------------------------------

// 未定義的路由
app.use((req, res) => {
  sendError(
    res,
    404,
    'NOT_FOUND',
    `No route matches ${req.method} ${req.path}`
  );
});

// JSON 解析失敗等錯誤，維持與其他回應一致的格式
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return sendError(
      res,
      400,
      'INVALID_INPUT',
      'Request body is not valid JSON'
    );
  }
  console.error(err);
  sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
});

app.listen(PORT, () => {
  console.log(`Demo backend listening on http://localhost:${PORT}`);
});
