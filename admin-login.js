(function () {
  var form = document.getElementById('login-form');
  var errorEl = document.getElementById('login-error');
  var submitBtn = document.getElementById('login-submit');

  var MESSAGES = {
    invalid: 'Wrong username or password.',
    config: 'Admin login is not configured yet — set ADMIN_USERNAME and ADMIN_PASSWORD.',
  };

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errorEl.style.display = 'none';
    submitBtn.disabled = true;

    var username = document.getElementById('username').value;
    var password = document.getElementById('password').value;

    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, password: password }),
    })
      .then(function (res) {
        if (res.ok) {
          window.location.href = '/admin';
          return;
        }
        return res.json().then(function (data) {
          errorEl.textContent = MESSAGES[data.error] || 'Something went wrong. Try again.';
          errorEl.style.display = 'block';
          submitBtn.disabled = false;
        });
      })
      .catch(function () {
        errorEl.textContent = 'Could not reach the server. Try again.';
        errorEl.style.display = 'block';
        submitBtn.disabled = false;
      });
  });
})();
