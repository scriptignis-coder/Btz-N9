(function () {
  var CATEGORIES = [
    { id: 'hoodies', label: 'Hoodies & Tops' },
    { id: 'joggers', label: 'Joggers & Sweatpants' },
    { id: 'shorts', label: 'Shorts' },
    { id: 'caps', label: 'Caps' },
    { id: 'accessories', label: 'Accessories' },
  ];

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fmtPrice(dt) {
    return dt + ' DT';
  }

  function categoryLabel(id) {
    var c = CATEGORIES.find(function (c) { return c.id === id; });
    return c ? c.label : id;
  }

  function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        // reader.result looks like "data:image/png;base64,AAAA..."
        var base64 = String(reader.result).split(',')[1] || '';
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function productRowHtml(p) {
    var thumb = p.photo_url
      ? '<img src="' + escapeHtml(p.photo_url) + '" alt="' + escapeHtml(p.name) + '">'
      : '<span aria-hidden="true">N9</span>';
    var priceHtml =
      p.promo_price != null
        ? '<s>' + fmtPrice(p.price) + '</s> <b class="promo">' + fmtPrice(p.promo_price) + '</b>'
        : fmtPrice(p.price);

    return (
      '<li class="admin-product-row" data-id="' + p.id + '">' +
      '<div class="admin-product-thumb">' + thumb + '</div>' +
      '<div class="admin-product-info">' +
      '<strong>' + escapeHtml(p.name) + '</strong>' +
      '<span class="admin-product-meta">' + (p.gender === 'men' ? 'Men' : 'Women') + ' · ' + categoryLabel(p.category) + '</span>' +
      '<span class="admin-product-price">' + priceHtml + '</span>' +
      '</div>' +
      '<button type="button" class="' + (p.in_stock ? 'tag' : 'tag out') + '" data-action="toggle-stock" data-instock="' + p.in_stock + '">' +
      (p.in_stock ? 'In stock' : 'Out of stock') +
      '</button>' +
      '<form class="admin-inline-form admin-promo-form" data-action="set-promo">' +
      '<input type="number" min="0" step="1" placeholder="Promo DT" value="' + (p.promo_price != null ? p.promo_price : '') + '">' +
      '<button type="submit" class="btn-ghost">Set</button>' +
      '</form>' +
      '<button type="button" class="btn-ghost danger" data-action="delete">Delete</button>' +
      '</li>'
    );
  }

  function renderCategories(products) {
    var container = document.getElementById('category-sections');
    container.innerHTML = CATEGORIES.map(function (cat) {
      var items = products.filter(function (p) { return p.category === cat.id; });
      var body = items.length
        ? '<ul class="admin-product-list">' + items.map(productRowHtml).join('') + '</ul>'
        : '<p class="admin-empty">No items yet.</p>';
      return '<section class="admin-card"><h2>' + cat.label + '</h2>' + body + '</section>';
    }).join('');

    container.querySelectorAll('[data-action="toggle-stock"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var row = btn.closest('.admin-product-row');
        var id = row.getAttribute('data-id');
        var nextInStock = btn.getAttribute('data-instock') !== 'true';
        btn.disabled = true;
        fetch('/api/toggle-stock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: id, inStock: nextInStock }),
        })
          .then(function (res) {
            if (!res.ok) throw new Error('failed');
            return loadProducts();
          })
          .catch(function () {
            btn.disabled = false;
            alert('Could not update stock. Try again.');
          });
      });
    });

    container.querySelectorAll('[data-action="set-promo"]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var row = form.closest('.admin-product-row');
        var id = row.getAttribute('data-id');
        var input = form.querySelector('input');
        var value = input.value.trim();
        fetch('/api/set-promo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: id, promoPrice: value === '' ? null : value }),
        })
          .then(function (res) {
            if (!res.ok) throw new Error('failed');
            return loadProducts();
          })
          .catch(function () {
            alert('Could not update the promo price. Try again.');
          });
      });
    });

    container.querySelectorAll('[data-action="delete"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var row = btn.closest('.admin-product-row');
        var id = row.getAttribute('data-id');
        if (!confirm('Delete this product?')) return;
        btn.disabled = true;
        fetch('/api/delete-product', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: id }),
        })
          .then(function (res) {
            if (!res.ok) throw new Error('failed');
            return loadProducts();
          })
          .catch(function () {
            btn.disabled = false;
            alert('Could not delete this product. Try again.');
          });
      });
    });
  }

  function loadProducts() {
    return fetch('/api/products')
      .then(function (res) {
        if (!res.ok) throw new Error('request failed');
        return res.json();
      })
      .then(function (data) {
        document.getElementById('db-error').style.display = 'none';
        renderCategories(data.products || []);
      })
      .catch(function () {
        document.getElementById('db-error').textContent =
          'Database not reachable yet — attach a Postgres database and run scripts/schema.sql. See the README.';
        document.getElementById('db-error').style.display = 'block';
        renderCategories([]);
      });
  }

  function wireAddForm() {
    var form = document.getElementById('add-form');
    var status = document.getElementById('add-status');
    var submitBtn = document.getElementById('add-submit');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      status.style.display = 'none';
      submitBtn.disabled = true;

      var photoFile = document.getElementById('f-photo').files[0];
      var payload = {
        category: document.getElementById('f-category').value,
        gender: document.getElementById('f-gender').value,
        name: document.getElementById('f-name').value,
        price: document.getElementById('f-price').value,
        promoPrice: document.getElementById('f-promo').value,
        inStock: document.getElementById('f-instock').checked,
      };

      var withPhoto = photoFile
        ? fileToBase64(photoFile).then(function (base64) {
            payload.photoBase64 = base64;
            payload.photoName = photoFile.name;
            payload.photoContentType = photoFile.type;
          })
        : Promise.resolve();

      withPhoto
        .then(function () {
          return fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        })
        .then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok) throw new Error(data.message || data.error || 'Something went wrong.');
            status.textContent = 'Product added.';
            status.className = 'form-status ok';
            status.style.display = 'block';
            form.reset();
            return loadProducts();
          });
        })
        .catch(function (err) {
          status.textContent = err.message || 'Something went wrong.';
          status.className = 'form-status error';
          status.style.display = 'block';
        })
        .finally(function () {
          submitBtn.disabled = false;
        });
    });
  }

  function wireLogout() {
    document.getElementById('logout-btn').addEventListener('click', function () {
      fetch('/api/logout', { method: 'POST' }).finally(function () {
        window.location.href = '/admin/login';
      });
    });
  }

  function init() {
    fetch('/api/session')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data.authenticated) {
          window.location.href = '/admin/login';
          return;
        }
        document.getElementById('admin-shell').style.display = 'flex';
        wireAddForm();
        wireLogout();
        loadProducts();
      })
      .catch(function () {
        window.location.href = '/admin/login';
      });
  }

  init();
})();
