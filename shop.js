(function () {
  var CATEGORY_LABELS = {
    hoodies: 'Hoodies & Tops',
    joggers: 'Joggers & Sweatpants',
    shorts: 'Shorts',
    caps: 'Caps',
    accessories: 'Accessories',
  };

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fmtPrice(dt) {
    return dt + ' DT';
  }

  function itemHtml(p, categoryLabel) {
    var thumb = p.photo_url
      ? '<img src="' + escapeHtml(p.photo_url) + '" alt="' + escapeHtml(p.name) + '">'
      : '<span class="shop-product-placeholder" aria-hidden="true">N9</span>';
    var price =
      p.promo_price != null
        ? '<s class="item-price-was">' + fmtPrice(p.price) + '</s><b class="item-price-promo">' + fmtPrice(p.promo_price) + '</b>'
        : fmtPrice(p.price);
    var badge =
      p.promo_price != null
        ? '<span class="shop-product-badge">Promo</span>'
        : !p.in_stock
        ? '<span class="shop-product-badge out">Out of stock</span>'
        : '';
    var genderLabel = p.gender === 'women' ? 'Women' : 'Men';

    return (
      '<div class="shop-product-card' + (p.in_stock ? '' : ' is-out') + '">' +
      '<div class="shop-product-photo">' + thumb + badge + '</div>' +
      '<div class="shop-product-info">' +
      '<span class="shop-product-meta">' + escapeHtml(categoryLabel) + ' · ' + genderLabel + '</span>' +
      '<h3 class="shop-product-name">' + escapeHtml(p.name) + '</h3>' +
      '<div class="shop-product-price">' + price + '</div>' +
      '</div>' +
      '</div>'
    );
  }

  function init() {
    var category = window.location.pathname.split('/').filter(Boolean).pop();
    var label = CATEGORY_LABELS[category];

    document.getElementById('category-title').textContent = label || 'Shop';
    document.title = (label || 'Shop') + ' — THE N9 & BTZ';

    if (!label) {
      document.getElementById('category-title').textContent = 'Category not found';
      return;
    }

    fetch('/api/products?category=' + encodeURIComponent(category))
      .then(function (res) {
        if (!res.ok) throw new Error('request failed');
        return res.json();
      })
      .then(function (data) {
        var products = data.products || [];
        var men = products.filter(function (p) { return p.gender === 'men'; });
        var women = products.filter(function (p) { return p.gender === 'women'; });

        var menList = document.getElementById('men-list');
        var womenList = document.getElementById('women-list');

        menList.innerHTML = men.map(function (p) { return itemHtml(p, label); }).join('');
        womenList.innerHTML = women.map(function (p) { return itemHtml(p, label); }).join('');

        document.getElementById('men-empty').style.display = men.length ? 'none' : 'flex';
        document.getElementById('women-empty').style.display = women.length ? 'none' : 'flex';
      })
      .catch(function () {
        document.getElementById('db-error').style.display = 'block';
        document.getElementById('men-empty').style.display = 'flex';
        document.getElementById('women-empty').style.display = 'flex';
      });
  }

  init();
})();
