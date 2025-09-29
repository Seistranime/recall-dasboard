# Recall Trading Dashboard

Dashboard sederhana untuk simulasi manual trade dengan Node.js + Express.

Integrasi optional dengan Recall (https://docs.recall.network) tersedia via proxy endpoints. Jika Anda memiliki API URL dan key dari Recall, set environment variables sebelum menjalankan.

## Persiapan

1. `npm install`
2. Copy `.env` template (atau buat `.env`) dan atur variabel berikut jika ingin integrasi Recall:

```
RECALL_API_URL=https://api.recall.network/
RECALL_API_KEY=your_recall_api_key_here
RECALL_TRADE_PATH=/api/trade/execute
RECALL_PORTFOLIO_PATH=/agent/portfolio
```

3. Jalankan server (dev):

PowerShell:

```
$env:PORT=4002; npm run dev
```

atau (langsung node):

```
$env:PORT=4002; node server.js
```

4. Buka `http://localhost:4002` (port dapat bergeser jika 4002 sudah dipakai)

## Fitur penting

- Simulasi trade lokal via form utama
- Optional: Toggle "Use Recall API" untuk mengirim trade dan fetch balance ke Recall (jika dikonfigurasi)
- Trade dan balance disimpan juga ke `data/trades.json` sebagai salinan lokal

## Token mapping

Anda dapat mengatur pemetaan token (ticker -> sandbox token identifier atau contract address) di `data/token-mapping.json`.
Contoh:

```
{
	"USDC": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
	"ARB": "0xcdE172dc5ffC46D228838446c57C1227e0B82049"
}
```

Server akan meng-resolve `fromToken`/`toToken` dari form menggunakan file ini saat membuat payload untuk Recall.

## Dry-run (debug mapping)

Untuk memverifikasi payload yang akan dikirim ke Recall tanpa benar-benar memanggil API, gunakan endpoint dry-run:

PowerShell:

```
$body='{"fromChain":"evm","fromSpecific":"eth","toChain":"evm","toSpecific":"arbitrum","action":"buy","fromToken":"USDC","toToken":"ARB","amount":2.25,"reason":"dry-run-test"}';
Invoke-RestMethod -Uri "http://localhost:4000/api/recall/trade?dry=true" -Method Post -Body $body -ContentType 'application/json'
```

Response akan berisi `mapped` object yang menunjukkan payload final.

## Live test against sandbox

Jika `RECALL_API_URL` dan `RECALL_API_KEY` sudah diisi di `.env`, Anda dapat melakukan live test (quote+execute). Jika Recall menolak trade karena token tidak dikenali atau tidak ada harga, perbarui `data/token-mapping.json` dengan identifier token yang valid.


