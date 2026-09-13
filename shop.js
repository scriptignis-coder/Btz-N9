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

  function itemHtml(p) {
    var thumb = p.photo_url
      ? '<img src="' + escapeHtml(p.photo_url) + '" alt="' + escapeHtml(p.name) + '">'
      : '<span aria-hidden="true">N9</span>';
    var price =
      p.promo_price != null
        ? '<s class="item-price-was">' + fmtPrice(p.price) + '</s><b class="item-price-promo">' + fmtPrice(p.promo_price) + '</b>'
        : fmtPrice(p.price);
    var tag = p.in_stock ? 'In stock' : 'Out of stock';
    var tagClass = p.in_stock ? 'tag' : 'tag out';

    return (
      '<li class="item' + (p.in_stock ? '' : ' item-out') + '">' +
      '<div class="item-thumb">' + thumb + '</div>' +
      '<div class="item-info">' +
      '<span class="item-name">' + escapeHtml(p.name) + '</span>' +
      '<span class="item-price">' + price + '</span>' +
      '</div>' +
      '<span class="' + tagClass + '">' + tag + '</span>' +
      '</li>'
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

        menList.innerHTML = men.map(itemHtml).join('');
        womenList.innerHTML = women.map(itemHtml).join('');

        document.getElementById('men-empty').style.display = men.length ? 'none' : 'block';
        document.getElementById('women-empty').style.display = women.length ? 'none' : 'block';
      })
      .catch(function () {
        document.getElementById('db-error').style.display = 'block';
        document.getElementById('men-empty').style.display = 'block';
        document.getElementById('women-empty').style.display = 'block';
      });
  }

  init();
})();
