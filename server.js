const path = require('node:path');
const express = require('express');

const app = express();
app.use(express.json({ limit: '6mb' })); // photos travel as base64 JSON, a bit above the 4MB cap we enforce

const DIR = __dirname;
const file = (name) => path.join(DIR, name);

// ---------- API routes (each file is: module.exports = async (req, res) => {...},
// which is also valid Express middleware). ----------
app.all('/api/login', require('./login'));
app.all('/api/logout', require('./logout'));
app.all('/api/session', require('./session'));
app.all('/api/products', require('./products'));
app.all('/api/toggle-stock', require('./toggle-stock'));
app.all('/api/set-promo', require('./set-promo'));
app.all('/api/delete-product', require('./delete-product'));

// ---------- Pages (every project file is flat in this folder, so each public page
// is served explicitly by name — this also keeps server-side files like server.js,
// package.json, and the api handlers from ever being served as downloadable static files). ----------
app.get('/', (req, res) => res.sendFile(file('home.html')));
app.get('/shop/:category', (req, res) => res.sendFile(file('shop.html')));
app.get('/admin', (req, res) => res.sendFile(file('admin.html')));
app.get('/admin/login', (req, res) => res.sendFile(file('admin-login.html')));

// ---------- Static assets the pages load (css/js only — nothing else in this folder
// is reachable over the web). ----------
const STATIC_FILES = ['styles.css', 'shop.js', 'admin.js', 'admin-login.js'];
for (const name of STATIC_FILES) {
  app.get('/' + name, (req, res) => res.sendFile(file(name)));
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('THE N9 & BTZ listening on port ' + PORT));
