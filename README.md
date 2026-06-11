# Demo Backend API for Zuplo

範例後端 API,作為 [Zuplo](https://zuplo.com) API Gateway 後方的 **origin (backend)**。
Zuplo 負責 API key、authentication、rate limiting 等閘道功能,驗證通過後將請求轉發到本服務。

```
Client ──▶ Zuplo Gateway ──▶ 本 Demo Backend (origin)
           (auth / rate limit)   (商業邏輯 / 資料)
```

## 技術

- Node.js + Express
- In-memory 資料 (重啟後重置,純展示用)

## 本機啟動

```bash
npm install
npm start
# 服務啟動於 http://localhost:3000
```

## Endpoints

| Method | Path             | 說明              |
| ------ | ---------------- | ----------------- |
| GET    | `/health`        | Health check      |
| GET    | `/products`      | 取得所有 product  |
| GET    | `/products/{id}` | 取得單一 product  |
| POST   | `/products`      | 新增 product      |
| PUT    | `/products/{id}` | 更新 product      |
| DELETE | `/products/{id}` | 刪除 product      |

### 範例

```bash
curl http://localhost:3000/products

curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Team Plan","price":99,"currency":"USD"}'
```

## 與 Zuplo 介接

1. 將本服務部署到可公開存取的網址 (例如 Render、Railway、Fly.io、Cloud Run 等),取得 origin URL,例如 `https://your-backend.example.com`。
2. 在 Zuplo 專案中,可直接 **import `openapi.json`** 自動產生對應路由。
3. 在 Zuplo 的 route handler 設定 **URL Rewrite / Proxy**,將 origin 指向上述後端網址。
4. 在 Zuplo 端加上 policies (API Key Auth、Rate Limiting 等)。

> 本機開發時,可用 Zuplo 的 tunnel 或 ngrok 把 `localhost:3000` 暴露給 Zuplo 測試。

## License

MIT
