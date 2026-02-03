var API_ENDPOINTS = {
  randomuser: 'https://randomuser.me/api/',
  dog: 'https://dog.ceo/api/breeds/image/random',
  quotable: 'https://api.quotable.io/random',
  countries: 'https://restcountries.com/v3.1/name/sierra',
  github: function (username) {
    return 'https://api.github.com/users/' + encodeURIComponent(username) + '/repos';
  }
};

function getResponseBox(apiId) {
  return document.querySelector('[data-response="' + apiId + '"]');
}

function setLoading(apiId, loading) {
  var box = getResponseBox(apiId);
  if (!box) return;
  box.classList.toggle('loading', loading);
  if (loading) {
    box.innerHTML = '<div class="response-placeholder">Loading…</div>';
  }
}

function setError(apiId, message) {
  var box = getResponseBox(apiId);
  if (!box) return;
  box.classList.remove('loading');
  box.classList.add('error');
  box.innerHTML = '<div class="response-content">' + escapeHtml(message) + '</div>';
}

function setContent(apiId, html) {
  var box = getResponseBox(apiId);
  if (!box) return;
  box.classList.remove('loading', 'error');
  box.innerHTML = '<div class="response-content">' + html + '</div>';
}

function escapeHtml(text) {
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function fetchJson(url, options) {
  options = options || {};
  options.headers = options.headers || {};
  options.headers.Accept = 'application/json';
  return fetch(url, options).then(function (res) {
    if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + res.statusText);
    return res.json();
  });
}

function fetchText(url) {
  return fetch(url).then(function (res) {
    if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + res.statusText);
    return res.text();
  });
}

function tryRandomUser(apiId) {
  setLoading(apiId, true);
  fetchJson(API_ENDPOINTS.randomuser)
    .then(function (data) {
      var u = data.results[0];
      var name = u.name.first + ' ' + u.name.last;
      var html = '<img src="' + escapeHtml(u.picture.large) + '" alt="' + escapeHtml(name) + '" width="128" />' +
        '<p><strong>' + escapeHtml(name) + '</strong></p><p>' + escapeHtml(u.email) + '</p>' +
        '<p>' + escapeHtml(u.location.city + ', ' + u.location.country) + '</p>' +
        '<details><summary>Raw JSON</summary><pre>' + escapeHtml(JSON.stringify(data, null, 2)) + '</pre></details>';
      setContent(apiId, html);
    })
    .catch(function (err) { setError(apiId, err.message); });
}

function tryDog(apiId) {
  setLoading(apiId, true);
  fetchJson(API_ENDPOINTS.dog)
    .then(function (data) {
      var url = data.message;
      setContent(apiId, '<img src="' + escapeHtml(url) + '" alt="Random dog" /><p>URL: <a href="' + escapeHtml(url) + '" target="_blank" rel="noopener">' + escapeHtml(url) + '</a></p>');
    })
    .catch(function (err) { setError(apiId, err.message); });
}

function tryQuotable(apiId) {
  setLoading(apiId, true);
  fetchJson(API_ENDPOINTS.quotable)
    .then(function (data) {
      var html = '<div class="quote-block"><p>"' + escapeHtml(data.content) + '"</p><p>— ' + escapeHtml(data.author) + '</p></div>' +
        '<details><summary>Raw JSON</summary><pre>' + escapeHtml(JSON.stringify(data, null, 2)) + '</pre></details>';
      setContent(apiId, html);
    })
    .catch(function (err) { setError(apiId, err.message); });
}

function tryCountries(apiId) {
  setLoading(apiId, true);
  fetchJson(API_ENDPOINTS.countries)
    .then(function (data) {
      if (!Array.isArray(data) || data.length === 0) {
        setContent(apiId, '<p>No countries found.</p>');
        return;
      }
      var list = data.slice(0, 5).map(function (c) {
        return '<div class="repo-item">' + escapeHtml(c.name.common) + ' — ' + escapeHtml(c.region || '') + '</div>';
      }).join('');
      setContent(apiId, list + '<details><summary>Raw JSON (first)</summary><pre>' + escapeHtml(JSON.stringify(data[0], null, 2)) + '</pre></details>');
    })
    .catch(function (err) { setError(apiId, err.message); });
}

function tryGithub(apiId) {
  var input = document.getElementById('github-username');
  var username = (input && input.value ? input.value.trim() : 'octocat') || 'octocat';
  setLoading(apiId, true);
  fetch(API_ENDPOINTS.github(username), { headers: { Accept: 'application/vnd.github.v3+json' } })
    .then(function (res) {
      if (!res.ok) return res.json().then(function (err) { throw new Error(err.message || 'HTTP ' + res.status); });
      return res.json();
    })
    .then(function (repos) {
      var list = (repos.slice(0, 8) || []).map(function (r) {
        return '<div class="repo-item"><a href="' + escapeHtml(r.html_url) + '" target="_blank" rel="noopener">' + escapeHtml(r.name) + '</a> — ' + escapeHtml(r.description || 'No description') + '</div>';
      }).join('');
      setContent(apiId, '<p><strong>Repos for ' + escapeHtml(username) + '</strong></p>' + list);
    })
    .catch(function (err) { setError(apiId, err.message); });
}

function tryCustom(apiId) {
  var input = document.getElementById('custom-url');
  var url = (input && input.value ? input.value.trim() : '') || '';
  if (!url) {
    setError(apiId, 'Please enter a URL.');
    return;
  }
  setLoading(apiId, true);
  fetchText(url)
    .then(function (text) {
      try {
        var parsed = JSON.parse(text);
        setContent(apiId, '<pre>' + escapeHtml(JSON.stringify(parsed, null, 2)) + '</pre>');
      } catch (e) {
        setContent(apiId, '<pre>' + escapeHtml(text) + '</pre>');
      }
    })
    .catch(function (err) { setError(apiId, err.message + ' (CORS or network error?)'); });
}

var handlers = {
  randomuser: tryRandomUser,
  dog: tryDog,
  quotable: tryQuotable,
  countries: tryCountries,
  github: tryGithub,
  custom: tryCustom
};

document.querySelector('.app').addEventListener('click', function (e) {
  var btn = e.target.closest('[data-try]');
  if (!btn) return;
  var apiId = btn.getAttribute('data-try');
  var fn = handlers[apiId];
  if (fn) fn(apiId);
});
