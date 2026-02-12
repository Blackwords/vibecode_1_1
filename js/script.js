document.addEventListener('DOMContentLoaded', function () {
  console.log('Project 0 активовано');
  var input = document.getElementById('statusInput');
  var btn = document.getElementById('updateBtn');
  var text = document.getElementById('statusText');
  var btcPriceDisplay = document.getElementById('btcPriceDisplay');
  var btcAmountInput = document.getElementById('btcAmount');
  var calcBtcBtn = document.getElementById('calcBtcBtn');
  var refreshBtcBtn = document.getElementById('refreshBtcPriceBtn');
  var btcResult = document.getElementById('btcResult');
  var btcErrorBtn = document.getElementById('btcErrorBtn');
  var btcTrendIcon = document.getElementById('btcTrendIcon');
  var btcTrendTime = document.getElementById('btcTrendTime');
  var btcPriceUAH = null;
  var prevBtcPriceUAH = null;
  var trendDirection = null;
  var trendStartTime = null;
  var trendTimerId = null;

  var STATUS_KEY = 'project0_status_text';
  var BTC_PRICE_KEY = 'project0_btc_last_price';
  var BTC_TREND_KEY = 'project0_btc_trend_dir';
  var BTC_TREND_START_KEY = 'project0_btc_trend_start';
  var LOADING_TEXT = 'оновлення..';

  // Load BTC trend from localStorage
  try {
    var lastPrice = localStorage.getItem(BTC_PRICE_KEY);
    var lastTrend = localStorage.getItem(BTC_TREND_KEY);
    var lastStart = localStorage.getItem(BTC_TREND_START_KEY);
    if (lastPrice) {
       btcPriceUAH = parseFloat(lastPrice);
       prevBtcPriceUAH = btcPriceUAH;
     }
    if (lastTrend) trendDirection = lastTrend;
    if (lastStart) trendStartTime = parseInt(lastStart, 10);
  } catch (e) {}

  if (btn) {
    btn.addEventListener('click', function () {
      var value = input ? input.value.trim() : '';
      if (!value) {
        alert('Будь ласка, введіть щось!');
        return;
      }
      if (text) {
        text.textContent = value;
      }
      try {
        localStorage.setItem(STATUS_KEY, value);
      } catch (e) {}
    });
  }
  try {
    var stored = localStorage.getItem(STATUS_KEY);
    if (stored) {
      if (text) text.textContent = stored;
      if (input) input.value = stored;
    }
  } catch (e) {}
  function formatUAH(n) {
    try {
      return new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH' }).format(n);
    } catch (e) {
      return n + ' ₴';
    }
  }
  function fetchBTCPrice() {
    if (btcPriceDisplay) btcPriceDisplay.textContent = LOADING_TEXT;
    if (btcErrorBtn) btcErrorBtn.classList.add('hidden');
    var url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=uah';
    return fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var price = data && data.bitcoin && data.bitcoin.uah;
        if (typeof price === 'number') {
          prevBtcPriceUAH = btcPriceUAH;
          btcPriceUAH = price;
          if (btcPriceDisplay) btcPriceDisplay.textContent = formatUAH(price);
          if (btcPriceDisplay) {
            btcPriceDisplay.classList.add('bg-green-100','rounded','px-1');
            setTimeout(function(){
              btcPriceDisplay.classList.remove('bg-green-100','rounded','px-1');
            }, 700);
          }
          if (btcPriceDisplay) {
            btcPriceDisplay.classList.remove('text-green-600','text-red-600');
          }
          if (prevBtcPriceUAH != null) {
            if (price > prevBtcPriceUAH) {
              if (btcPriceDisplay) btcPriceDisplay.classList.add('text-green-600');
              setTrend('up');
            } else if (price < prevBtcPriceUAH) {
              if (btcPriceDisplay) btcPriceDisplay.classList.add('text-red-600');
              setTrend('down');
            } else {
              setTrend('flat');
            }
          } else {
            setTrend('flat');
          }
          // Save for persistence
          try {
            localStorage.setItem(BTC_PRICE_KEY, String(price));
          } catch (e) {}
          return price;
        } else {
          btcPriceUAH = null;
          if (btcPriceDisplay) btcPriceDisplay.textContent = 'Курс недоступний';
          if (btcErrorBtn) {
            btcErrorBtn.textContent = 'Помилка мережі. Спробуйте ще раз';
            btcErrorBtn.classList.remove('hidden');
          }
          throw new Error('no price');
        }
      })
      .catch(function () {
        btcPriceUAH = null;
        if (btcPriceDisplay) btcPriceDisplay.textContent = 'Курс недоступний';
        if (btcErrorBtn) {
          btcErrorBtn.textContent = 'Помилка мережі. Спробуйте ще раз';
          btcErrorBtn.classList.remove('hidden');
        }
      });
  }
  function setTrend(dir) {
    if (dir !== trendDirection) {
      trendDirection = dir;
      trendStartTime = Date.now();
      try {
        localStorage.setItem(BTC_TREND_KEY, dir);
        localStorage.setItem(BTC_TREND_START_KEY, String(trendStartTime));
      } catch (e) {}
      
      if (trendTimerId) {
        clearInterval(trendTimerId);
        trendTimerId = null;
      }
      if (dir === 'up' || dir === 'down') {
        trendTimerId = setInterval(updateTrendTime, 1000);
      } else {
        if (btcTrendTime) btcTrendTime.textContent = '';
      }
    } else if ((dir === 'up' || dir === 'down') && !trendTimerId) {
      // Restore timer if it was running
      trendTimerId = setInterval(updateTrendTime, 1000);
    }

    if (btcTrendIcon) {
      btcTrendIcon.classList.remove('text-green-600', 'text-red-600', 'text-gray-500');
      if (dir === 'up') {
        btcTrendIcon.textContent = '▲';
        btcTrendIcon.classList.add('text-green-600');
      } else if (dir === 'down') {
        btcTrendIcon.textContent = '▼';
        btcTrendIcon.classList.add('text-red-600');
      } else {
        btcTrendIcon.textContent = '—';
        btcTrendIcon.classList.add('text-gray-500');
      }
    }
    updateTrendTime();
  }
  function updateTrendTime() {
    if (!btcTrendTime) return;
    if (!trendStartTime || !(trendDirection === 'up' || trendDirection === 'down')) {
      btcTrendTime.textContent = '';
      return;
    }
    var diff = Math.floor((Date.now() - trendStartTime) / 1000);
    var h = Math.floor(diff / 3600);
    var m = Math.floor((diff % 3600) / 60);
    var s = diff % 60;
    var parts = [];
    if (h > 0) parts.push(h + ' год');
    if (m > 0 || h > 0) parts.push(m + ' хв');
    parts.push(s + ' с');
    btcTrendTime.textContent = 'тенденція: ' + (trendDirection === 'up' ? 'зростання ' : 'падіння ') + parts.join(' ');
  }
  if (refreshBtcBtn) {
    refreshBtcBtn.addEventListener('click', function () {
      fetchBTCPrice();
    });
  }
  if (btcErrorBtn) {
    btcErrorBtn.addEventListener('click', function(){
      fetchBTCPrice();
    });
  }
  if (calcBtcBtn) {
    calcBtcBtn.addEventListener('click', function () {
      var amount = btcAmountInput ? parseFloat(btcAmountInput.value) : NaN;
      if (!btcAmountInput || isNaN(amount) || amount <= 0) {
        alert('Будь ласка, введіть щось!');
        return;
      }
      if (!btcPriceUAH) {
        alert('Курс недоступний. Оновіть курс.');
        return;
      }
      var total = amount * btcPriceUAH;
      if (btcResult) {
        btcResult.textContent = '≈ ' + formatUAH(total);
      }
    });
  }
  fetchBTCPrice();
  setInterval(fetchBTCPrice, 60000);
  var todoInput = document.getElementById('todoInput');
  var todoAddBtn = document.getElementById('todoAddBtn');
  var todoList = document.getElementById('todoList');
  var TODOS_KEY = 'project0_learning_plan';
  var todos = [];
  function loadTodos() {
    try {
      var raw = localStorage.getItem(TODOS_KEY);
      todos = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(todos)) todos = [];
    } catch (e) {
      todos = [];
    }
  }
  function saveTodos() {
    try {
      localStorage.setItem(TODOS_KEY, JSON.stringify(todos));
    } catch (e) {}
  }
  function renderTodos() {
    if (!todoList) return;
    todoList.innerHTML = '';
    var ordered = todos.slice().sort(function(a, b){ return (a.done === b.done) ? 0 : (a.done ? 1 : -1); });
    for (var i = 0; i < ordered.length; i++) {
      var item = ordered[i];
      var li = document.createElement('li');
      li.className = 'flex items-center justify-between border border-gray-200 rounded-md px-3 py-2 mb-2 shadow-sm bg-white';
      if (item.done) {
        li.className += ' opacity-60 bg-gray-100';
      }
      var textEl = document.createElement('span');
      textEl.textContent = item.text;
      textEl.className = item.done ? 'line-through text-gray-400' : 'text-gray-800';
      var actions = document.createElement('div');
      actions.className = 'flex items-center gap-2';
      var toggleBtn = document.createElement('button');
      toggleBtn.textContent = item.done ? 'Зняти' : 'Виконано';
      toggleBtn.setAttribute('data-id', String(item.id));
      toggleBtn.setAttribute('data-action', 'toggle');
      toggleBtn.className = 'rounded-md bg-green-600 text-white px-3 py-1 shadow hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500';
      var delBtn = document.createElement('button');
      delBtn.textContent = 'Видалити';
      delBtn.setAttribute('data-id', String(item.id));
      delBtn.setAttribute('data-action', 'delete');
      delBtn.className = 'rounded-md bg-red-600 text-white px-3 py-1 shadow hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500';
      actions.appendChild(toggleBtn);
      actions.appendChild(delBtn);
      li.appendChild(textEl);
      li.appendChild(actions);
      todoList.appendChild(li);
    }
  }
  function addTodo(text) {
    todos.push({ id: Date.now(), text: text, done: false });
    saveTodos();
    renderTodos();
  }
  if (todoAddBtn) {
    todoAddBtn.addEventListener('click', function () {
      var value = todoInput ? todoInput.value.trim() : '';
      if (!value) {
        alert('Будь ласка, введіть щось!');
        return;
      }
      addTodo(value);
      if (todoInput) todoInput.value = '';
    });
  }
  if (todoInput) {
    todoInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var value = todoInput.value.trim();
        if (!value) {
          alert('Будь ласка, введіть щось!');
          return;
        }
        addTodo(value);
        todoInput.value = '';
      }
    });
  }
  if (todoList) {
    todoList.addEventListener('click', function (e) {
      var btnEl = e.target.closest('button');
      if (!btnEl) return;
      var id = parseInt(btnEl.getAttribute('data-id'), 10);
      var action = btnEl.getAttribute('data-action');
      for (var i = 0; i < todos.length; i++) {
        if (todos[i].id === id) {
          if (action === 'toggle') {
            todos[i].done = !todos[i].done;
          } else if (action === 'delete') {
            todos.splice(i, 1);
          }
          break;
        }
      }
      saveTodos();
      renderTodos();
    });
  }
  loadTodos();
  renderTodos();
  var themeToggleBtn = document.getElementById('themeToggleBtn');
  var themeIcon = document.getElementById('themeIcon');
  var THEME_KEY = 'project0_theme';
  var theme = 'light';
  function applyTheme(t) {
    theme = t;
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
    var body = document.body;
    var header = document.querySelector('header');
    var cards = document.querySelectorAll('[data-card]');
    if (body) {
      body.classList.remove('bg-gray-50','text-gray-900','bg-gray-900','text-gray-100');
    }
    if (header) {
      header.classList.remove('bg-white','bg-gray-800');
      header.classList.remove('border-b','border-gray-700');
      header.classList.add('border-b');
    }
    if (t === 'light') {
      if (body) body.classList.add('bg-gray-50','text-gray-900');
      if (header) header.classList.add('bg-white');
      if (themeIcon) themeIcon.textContent = '☀️';
      cards.forEach(function(el){
        el.classList.remove('bg-gray-800');
        el.classList.add('bg-white');
      });
    } else if (t === 'dark') {
      if (body) body.classList.add('bg-gray-900','text-gray-100');
      if (header) header.classList.add('bg-gray-800');
      if (themeIcon) themeIcon.textContent = '🌙';
      cards.forEach(function(el){
        el.classList.remove('bg-white');
        el.classList.add('bg-gray-800');
      });
    }
  }
  function loadTheme() {
    try {
      var t = localStorage.getItem(THEME_KEY);
      if (t === 'deep') applyTheme('light');
      else if (t) applyTheme(t);
      else applyTheme('light');
    } catch (e) {
      applyTheme('light');
    }
  }
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', function () {
      var next = theme === 'light' ? 'dark' : 'light';
      applyTheme(next);
    });
  }
  loadTheme();

  // Initial trend render from persistence
  if (trendDirection) {
    setTrend(trendDirection);
  }
});
