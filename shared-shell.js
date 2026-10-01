/*
  數位教具共用版面外殼 - JS 輔助（依「數位教具網站.fig」套版）
  1. 載入時自動補齊設計稿的版面結構（各工具 HTML 不需要改）：
     - 頁首：泰宇出版 logo（桌機只顯示圖示，平板／手機顯示完整 logo）
     - 平板／手機的「教具標題＋說明」區與模式徽章
     - 手機的「開啟設定」入口卡與底部「設定抽屜」（左欄會搬進抽屜）
     - 右欄拆成「詳細資訊」與「公式或學理介紹」等白色卡片
  2. 模式徽章：顯示工具目前選到的模式（.mode-row 的 .on 按鈕，或 select[data-tts-mode]）；
     沒有模式選單的工具不顯示徽章。
  3. 既有 API（initAccordion / observeContainer / frac / isMobile）維持不變。
  請把這個 <script> 放在各工具自己的 <script> 之前，確保 window.TTS 先存在。
*/
(function (global) {
  'use strict';

  var doc = global.document;
  var MOBILE_MAX = 1023;   // 各工具沿用的「非桌機」判斷（平板＋手機）
  var PHONE_MAX = 767;     // 設定抽屜只在手機寬度啟用

  function isMobile() {
    return global.matchMedia('(max-width:' + MOBILE_MAX + 'px)').matches;
  }

  var ICONS = {
    book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    chevronUp: '<path d="m18 15-6-6-6 6"/>',
    close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>'
  };
  function icon(name) {
    return '<svg class="tts-icon" viewBox="0 0 24 24" aria-hidden="true">' + ICONS[name] + '</svg>';
  }
  function el(tag, cls, html) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  // 手風琴收合開關：點擊 toggleEl 時，切換 panelEl 的 .is-open class，箭頭跟著旋轉
  function initAccordion(toggleEl, panelEl) {
    if (!toggleEl || !panelEl) return;
    var caret = toggleEl.querySelector('.tts-caret');
    if (caret) caret.innerHTML = icon('chevronDown');
    toggleEl.setAttribute('aria-expanded', 'false');
    function setState(open) {
      panelEl.classList.toggle('is-open', open);
      toggleEl.classList.toggle('is-open', open);
      toggleEl.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    setState(panelEl.classList.contains('is-open'));
    toggleEl.addEventListener('click', function () {
      setState(!panelEl.classList.contains('is-open'));
    });
  }

  // 量測 el 自己的容器大小（取代直接讀 window.innerWidth/innerHeight 的做法）。
  // 註冊時會先呼叫一次 callback（延到 setTimeout 0，避免呼叫端後段宣告的 const 仍在 TDZ），
  // 之後每次容器尺寸改變都會再呼叫。callback 收到 { width, height }。
  function observeContainer(el, callback) {
    if (!el || typeof callback !== 'function') return function () {};

    // 寬高變化小於 0.5px 視為沒變，避免 callback 間接撐大容器造成無限迴圈
    var lastW = null, lastH = null;
    function fire() {
      var rect = el.getBoundingClientRect();
      if (lastW !== null && Math.abs(rect.width - lastW) < 0.5 && Math.abs(rect.height - lastH) < 0.5) {
        return;
      }
      lastW = rect.width; lastH = rect.height;
      callback({ width: rect.width, height: rect.height });
    }

    if (typeof global.ResizeObserver === 'function') {
      var ro = new global.ResizeObserver(function () { fire(); });
      ro.observe(el);
      global.setTimeout(fire, 0);
      return function () { ro.disconnect(); };
    }

    global.addEventListener('resize', fire);
    global.setTimeout(fire, 0);
    return function () { global.removeEventListener('resize', fire); };
  }

  // 產生上下堆疊的分數 HTML（分子在上、底線、分母在下），取代文字內的 "a/b"。
  function frac(num, den) {
    return '<span class="tts-frac"><span class="tts-frac__num">' + num + '</span><span class="tts-frac__den">' + den + '</span></span>';
  }

  /* ---------------- 版面結構補齊 ---------------- */

  function enhanceHeader(app) {
    var logo = app.querySelector('.tts-header__logo');
    if (logo && !logo.querySelector('.tts-brand-full')) {
      logo.innerHTML =
        '<img class="tts-brand-mark" src="./brand-mark.svg" alt="泰宇出版">' +
        '<img class="tts-brand-full" src="./brand-logo.svg" alt="泰宇出版">';
    }
  }

  // 「📖 操作說明」→ 書本線條圖示＋文字
  function enhanceDescToggle(app) {
    var t = app.querySelector('.tts-left__desc-toggle');
    if (!t) return;
    var label = t.querySelector('span');
    if (label && !label.querySelector('.tts-icon')) {
      label.innerHTML = icon('book') + '<span>' + label.textContent.replace(/^\s*📖\s*/, '') + '</span>';
    }
    var caret = t.querySelector('.tts-caret');
    if (caret && !caret.querySelector('.tts-icon')) caret.innerHTML = icon('chevronDown');
  }

  // 中欄：白色外框卡＋內層淺色繪圖區（.tts-main__card 保持原本的元素，工具的量測不受影響）
  function enhanceMain(main) {
    var card = main.querySelector('.tts-main__card');
    if (!card || card.parentNode.classList.contains('tts-main__frame')) return null;
    var frame = el('div', 'tts-main__frame');
    card.parentNode.insertBefore(frame, card);
    frame.appendChild(card);
    var head = el('div', 'tts-main__head', '<h2>主要操作畫布</h2>');
    main.insertBefore(head, frame);
    return head;
  }

  // 右欄：區段標題之前的內容 →「詳細資訊」卡；每個區段標題各自成一張卡
  function enhanceRight(right) {
    var inner = right.querySelector('.tts-right__inner') || right;
    if (inner.querySelector('.tts-right__col')) return null;
    var kids = Array.prototype.slice.call(inner.children);
    var colA = el('div', 'tts-right__col tts-right__col--a');
    var colB = el('div', 'tts-right__col tts-right__col--b');
    var details = null, current = null;
    kids.forEach(function (k) {
      if (k.classList.contains('tts-right__section-title')) {
        current = el('section', 'tts-card');
        colB.appendChild(current);
        current.appendChild(k);
        return;
      }
      if (!current) {
        if (!details) {
          details = el('section', 'tts-card tts-card--details', '<h2 class="tts-card__title">詳細資訊</h2>');
          colA.appendChild(details);
        }
        details.appendChild(k);
      } else {
        current.appendChild(k);
      }
    });
    inner.appendChild(colA);
    inner.appendChild(colB);
    return details;
  }

  /* ---------------- 模式徽章 ---------------- */

  var MODE_GROUPS = '[data-tts-mode], .mode-row, .modeRow, .mode-chips, .mode-group';
  var MODE_ACTIVE = '.on, .active, [aria-pressed="true"], [aria-selected="true"], input:checked';

  function readModes(scope) {
    var labels = [];
    Array.prototype.forEach.call(scope.querySelectorAll(MODE_GROUPS), function (g) {
      // 巢狀群組只算最外層
      if (g.parentElement && g.parentElement.closest(MODE_GROUPS)) return;
      var text = '';
      if (g.tagName === 'SELECT') {
        var opt = g.options[g.selectedIndex];
        text = opt ? opt.textContent : '';
      } else {
        var act = g.querySelector(MODE_ACTIVE);
        if (act && act.tagName === 'INPUT') {
          var lab = act.closest('label') || (act.id && scope.querySelector('label[for="' + act.id + '"]'));
          text = lab ? lab.textContent : act.value;
        } else if (act) {
          text = act.textContent;
        }
      }
      text = (text || '').replace(/\s+/g, ' ').trim();
      if (text) labels.push(text);
    });
    return labels;
  }

  /* ---------------- 設定抽屜（手機） ---------------- */

  function buildDrawer(title) {
    var d = el('div', 'tts-drawer');
    d.setAttribute('aria-hidden', 'true');
    d.innerHTML =
      '<div class="tts-drawer__overlay" data-close></div>' +
      '<div class="tts-drawer__panel" role="dialog" aria-modal="true" aria-labelledby="ttsDrawerTitle">' +
        '<div class="tts-drawer__handle" data-close></div>' +
        '<div class="tts-drawer__header">' +
          '<div><h2 class="tts-drawer__title" id="ttsDrawerTitle">設定抽屜</h2>' +
          '<p class="tts-drawer__desc">調整「' + title + '」的參數與模式</p></div>' +
          '<button class="tts-iconbtn" type="button" aria-label="關閉設定" data-close>' + icon('close') + '</button>' +
        '</div>' +
        '<div class="tts-drawer__body">' +
          '<div class="tts-drawer__slot"></div>' +
          '<div class="tts-drawer__status" hidden><div class="tts-drawer__status-title">目前狀態</div><div class="tts-drawer__status-body"></div></div>' +
        '</div>' +
      '</div>';
    return d;
  }

  function enhance() {
    var app = doc.querySelector('.tts-app');
    if (!app || app.classList.contains('tts-enhanced')) return;
    app.classList.add('tts-enhanced');

    var body = app.querySelector('.tts-body');
    var left = app.querySelector('.tts-left');
    var main = app.querySelector('.tts-main');
    var right = app.querySelector('.tts-right');
    var h1 = app.querySelector('.tts-header__titles h1');
    var sub = app.querySelector('.tts-header__titles p');
    var title = h1 ? h1.textContent.trim() : '';
    var subtitle = sub ? sub.textContent.trim() : '';

    enhanceHeader(app);
    enhanceDescToggle(app);
    if (!body) return;

    // 平板／手機：教具標題＋說明＋模式徽章
    var intro = el('div', 'tts-intro');
    intro.innerHTML = '<div><h2 class="tts-intro__title"></h2><p class="tts-intro__desc"></p></div>';
    intro.querySelector('.tts-intro__title').textContent = title;
    intro.querySelector('.tts-intro__desc').textContent = subtitle;
    var badgeA = el('span', 'tts-badge');
    intro.appendChild(badgeA);
    body.insertBefore(intro, body.firstChild);

    // 手機：「開啟設定」入口卡
    var entry = el('button', 'tts-entry');
    entry.type = 'button';
    entry.setAttribute('aria-haspopup', 'dialog');
    entry.innerHTML =
      '<span class="tts-entry__head"><span class="tts-entry__title">' + icon('settings') + '開啟設定</span>' +
      '<span class="tts-caret">' + icon('chevronUp') + '</span></span>' +
      '<span class="tts-entry__status" style="display:block"></span>';
    body.insertBefore(entry, intro.nextSibling);
    var entryStatus = entry.querySelector('.tts-entry__status');

    var mainHead = main ? enhanceMain(main) : null;
    var badgeB = el('span', 'tts-badge');
    if (mainHead) mainHead.appendChild(badgeB);

    var details = right ? enhanceRight(right) : null;

    // 模式徽章與狀態文字
    function syncModes() {
      var modes = left ? readModes(left) : [];
      var first = modes[0] || '';
      [badgeA, badgeB].forEach(function (b) { b.textContent = first; b.hidden = !first; });
      entryStatus.textContent = modes.length
        ? '目前狀態：' + modes.join('・')
        : '點擊此處開啟設定抽屜，調整參數設定。';
    }
    syncModes();
    if (left) {
      left.addEventListener('change', syncModes);
      left.addEventListener('click', function () { global.setTimeout(syncModes, 0); });
      if (global.MutationObserver) {
        new global.MutationObserver(syncModes).observe(left, { subtree: true, attributes: true, attributeFilter: ['class', 'aria-pressed', 'aria-selected'] });
      }
    }

    // 設定抽屜：手機寬度時把左欄搬進抽屜，離開手機寬度時搬回原位
    if (!left) { entry.style.display = 'none'; return; }
    var drawer = buildDrawer(title);
    app.appendChild(drawer);   // 放在 .tts-app 內，工具與外殼的樣式才會套用到抽屜裡的控制元件
    var slot = drawer.querySelector('.tts-drawer__slot');
    var status = drawer.querySelector('.tts-drawer__status');
    var statusBody = drawer.querySelector('.tts-drawer__status-body');
    var home = doc.createComment('tts-left-home');
    left.parentNode.insertBefore(home, left);
    var mirrorObs = null;

    // 抽屜底部「目前狀態」：鏡像右欄詳細資訊（去掉 id，避免與原元素衝突）
    function mirrorDetails() {
      if (!details) return;
      var clone = details.cloneNode(true);
      var t = clone.querySelector('.tts-card__title');
      if (t) t.parentNode.removeChild(t);
      Array.prototype.forEach.call(clone.querySelectorAll('[id]'), function (n) { n.removeAttribute('id'); });
      statusBody.innerHTML = clone.innerHTML;
    }

    function open() {
      mirrorDetails();
      status.hidden = !details;
      if (details && global.MutationObserver) {
        mirrorObs = new global.MutationObserver(mirrorDetails);
        mirrorObs.observe(details, { subtree: true, childList: true, characterData: true, attributes: true });
      }
      drawer.classList.add('is-open');
      drawer.setAttribute('aria-hidden', 'false');
      entry.classList.add('is-open');
      doc.body.classList.add('tts-drawer-open');
      var btn = drawer.querySelector('.tts-iconbtn');
      if (btn) btn.focus({ preventScroll: true });
    }
    function close() {
      if (mirrorObs) { mirrorObs.disconnect(); mirrorObs = null; }
      drawer.classList.remove('is-open');
      drawer.setAttribute('aria-hidden', 'true');
      entry.classList.remove('is-open');
      doc.body.classList.remove('tts-drawer-open');
    }
    entry.addEventListener('click', open);
    drawer.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) close(); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawer.classList.contains('is-open')) close(); });

    var phoneMq = global.matchMedia('(max-width:' + PHONE_MAX + 'px)');
    function place() {
      if (phoneMq.matches) {
        if (left.parentNode !== slot) slot.appendChild(left);
      } else {
        close();
        if (left.parentNode !== home.parentNode) home.parentNode.insertBefore(left, home.nextSibling);
      }
    }
    place();
    if (phoneMq.addEventListener) phoneMq.addEventListener('change', place);
    else if (phoneMq.addListener) phoneMq.addListener(place);
  }

  enhance();

  global.TTS = {
    MOBILE_MAX: MOBILE_MAX,
    PHONE_MAX: PHONE_MAX,
    isMobile: isMobile,
    initAccordion: initAccordion,
    observeContainer: observeContainer,
    frac: frac,
    enhance: enhance
  };
})(window);
