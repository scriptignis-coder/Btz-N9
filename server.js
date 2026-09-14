const path = require('node:path');
const express = require('express');

const app = express();
app.use(express.json({ limit: '6mb' })); // photos travel as base64 JSON, a bit above the 4MB cap we enforce

const PUBLIC_DIR = path.join(__dirname, 'public');

// ---------- API routes (each file is the same handler shape used by the Vercel version:
// module.exports = async (req, res) => {...}, which is also valid Express middleware). ----------
app.all('/api/login', require('./api/login'));
app.all('/api/logout', require('./api/logout'));
app.all('/api/session', require('./api/session'));
app.all('/api/products', require('./api/products'));
app.all('/api/toggle-stock', require('./api/toggle-stock'));
app.all('/api/set-promo', require('./api/set-promo'));
app.all('/api/delete-product', require('./api/delete-product'));

// ---------- Clean-URL page routes ----------
app.get('/admin', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'admin/index.html')));
app.get('/admin/login', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'admin/login/index.html')));
app.get('/shop/:category', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'shop.html')));

// ---------- Everything else: plain static files (index.html, styles.css, js/, ...) ----------
app.use(express.static(PUBLIC_DIR));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('THE N9 & BTZ listening on port ' + PORT));
