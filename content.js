// Proxmox Terminal Select
// - "Force select" mode: click-dragging in the terminal selects text
//   even when the app (Claude Code, htop, vim...) has enabled mouse tracking.
//   (Mouse events are re-sent to xterm.js with Shift simulated.)
// - Automatically copies the selection to the clipboard.
// - Alt+Shift+S: opens the whole terminal content (including scrollback) as plain text.
// - Alt+Shift+F: toggles force select mode (or click the badge).
(() => {
  if (window.__pxTermSelect) return;
  window.__pxTermSelect = true;

  // Only run on pages that look like an xterm.js console
  const looksLikeConsole = () =>
    document.querySelector('.xterm') || /xtermjs|console=/.test(location.href);

  let term = null;
  let started = false;
  let dragging = false;
  const STORE = 'pxTermSelect.force';
  let force = true;
  try { force = localStorage.getItem(STORE) !== '0'; } catch (_) {}

  const findTerm = () => {
    try {
      if (window.term && window.term.buffer && typeof window.term.getSelection === 'function') return window.term;
    } catch (_) {}
    for (const k of Object.keys(window)) {
      try {
        const v = window[k];
        if (v && typeof v === 'object' && v.buffer && v.buffer.active && typeof v.getSelection === 'function') return v;
      } catch (_) {}
    }
    return null;
  };

  // ---------- Clipboard ----------
  const copyText = async (txt) => {
    if (!txt) return false;
    try {
      await navigator.clipboard.writeText(txt);
      return true;
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = txt;
      ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (_) {}
      ta.remove();
      return ok;
    }
  };

  // ---------- UI : toast + badge ----------
  const css = `
  #pxts-badge{position:fixed;top:6px;right:8px;z-index:2147483646;font:12px/1.2 system-ui,sans-serif;
    padding:4px 8px;border-radius:12px;cursor:pointer;user-select:none;opacity:.55;transition:opacity .15s;
    background:#2b2b2b;color:#ddd;border:1px solid #555}
  #pxts-badge:hover{opacity:1}
  #pxts-badge.on{background:#1f4d2b;color:#bff5c8;border-color:#3a8a4f}
  #pxts-toast{position:fixed;bottom:14px;left:50%;transform:translateX(-50%);z-index:2147483647;
    font:13px system-ui,sans-serif;background:#222;color:#fff;padding:6px 12px;border-radius:6px;
    border:1px solid #555;pointer-events:none;opacity:0;transition:opacity .2s}
  #pxts-toast.show{opacity:.95}
  #pxts-overlay{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.75);display:flex;
    flex-direction:column;padding:16px;box-sizing:border-box;gap:8px}
  #pxts-overlay .bar{display:flex;gap:8px;align-items:center;color:#ccc;font:13px system-ui,sans-serif}
  #pxts-overlay .bar span{flex:1}
  #pxts-overlay button{font:13px system-ui,sans-serif;padding:5px 12px;border-radius:5px;border:1px solid #666;
    background:#333;color:#eee;cursor:pointer}
  #pxts-overlay button:hover{background:#444}
  #pxts-overlay textarea{flex:1;width:100%;box-sizing:border-box;resize:none;background:#111;color:#e6e6e6;
    border:1px solid #444;border-radius:6px;padding:10px;font:13px/1.35 ui-monospace,Consolas,"DejaVu Sans Mono",monospace;
    white-space:pre;overflow:auto;tab-size:8}
  `;

  let toastEl, badgeEl, toastTimer;
  const toast = (msg) => {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1200);
  };
  const renderBadge = () => {
    if (!badgeEl) return;
    badgeEl.classList.toggle('on', force);
    badgeEl.textContent = force ? '✂ Select: ON' : '✂ Select: OFF';
    badgeEl.title = 'Click or Alt+Shift+F to toggle · Alt+Shift+S: terminal plain text';
  };
  const setForce = (v) => {
    force = v;
    try { localStorage.setItem(STORE, v ? '1' : '0'); } catch (_) {}
    renderBadge();
    toast(v ? 'Force select enabled' : 'Force select disabled (mouse → app)');
  };

  // ---------- Buffer dump ----------
  const bufferText = () => {
    const t = term || findTerm();
    if (!t) {
      const rows = document.querySelector('.xterm-rows');
      return rows ? rows.innerText : '';
    }
    const buf = t.buffer.active;
    const lines = [];
    for (let i = 0; i < buf.length; i++) {
      const line = buf.getLine(i);
      if (!line) continue;
      // "Wrapped" lines continue the previous one
      if (line.isWrapped && lines.length) lines[lines.length - 1] += line.translateToString(true);
      else lines.push(line.translateToString(true));
    }
    while (lines.length && lines[lines.length - 1] === '') lines.pop();
    return lines.join('\n');
  };

  let overlay = null;
  const closeOverlay = () => {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    try { (term || findTerm())?.focus(); } catch (_) {}
  };
  const openOverlay = () => {
    if (overlay) return closeOverlay();
    overlay = document.createElement('div');
    overlay.id = 'pxts-overlay';
    overlay.innerHTML = `
      <div class="bar"><span>Terminal content — select freely, Ctrl+C to copy, Esc to close</span>
        <button data-a="sel">Copy selection</button>
        <button data-a="all">Copy all</button>
        <button data-a="close">Close</button></div>
      <textarea readonly spellcheck="false"></textarea>`;
    const ta = overlay.querySelector('textarea');
    ta.value = bufferText();
    overlay.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); closeOverlay(); }
    }, true);
    overlay.addEventListener('click', async (e) => {
      const a = e.target?.dataset?.a;
      if (a === 'close') closeOverlay();
      else if (a === 'all') { if (await copyText(ta.value)) toast('All copied ✓'); }
      else if (a === 'sel') {
        const s = ta.value.substring(ta.selectionStart, ta.selectionEnd);
        if (s && await copyText(s)) toast('Selection copied ✓'); else toast('Nothing selected');
      }
    });
    document.body.appendChild(overlay);
    ta.focus();
    ta.scrollTop = ta.scrollHeight;
  };

  // ---------- Force select (simulated Shift) ----------
  const inXterm = (el) => el && el.closest && el.closest('.xterm');

  const clone = (e) => new MouseEvent(e.type, {
    bubbles: true, cancelable: true, composed: true, view: window,
    detail: e.detail, screenX: e.screenX, screenY: e.screenY,
    clientX: e.clientX, clientY: e.clientY,
    ctrlKey: e.ctrlKey, altKey: e.altKey, metaKey: e.metaKey, shiftKey: true,
    button: e.button, buttons: e.buttons, relatedTarget: e.relatedTarget,
  });

  const afterSelect = () => {
    setTimeout(async () => {
      const t = term || findTerm();
      let s = '';
      try { s = t ? t.getSelection() : String(document.getSelection() || ''); } catch (_) {}
      if (s && s.trim() && await copyText(s)) toast('Copied ✓');
    }, 0);
  };

  const onMouse = (e) => {
    if (!e.isTrusted) return;            // let our own clones through
    const ours = e.target && e.target.closest && e.target.closest('#pxts-badge,#pxts-overlay,#pxts-toast');
    if (ours) return;

    if (e.type === 'mouseup' && dragging) {
      dragging = false;
      if (force && !e.shiftKey) { e.stopImmediatePropagation(); e.target.dispatchEvent(clone(e)); }
      afterSelect();
      return;
    }
    if (!force || e.shiftKey) {
      if (e.type === 'mousedown' && e.button === 0 && inXterm(e.target)) dragging = true;
      return;
    }
    if (e.type === 'mousedown') {
      if (e.button !== 0 || !inXterm(e.target)) return;
      dragging = true;
    } else if (e.type === 'mousemove') {
      if (!dragging) return;              // hover still goes to the app
    } else if (e.type === 'click' || e.type === 'dblclick') {
      if (!inXterm(e.target)) return;
    }
    e.stopImmediatePropagation();
    e.target.dispatchEvent(clone(e));
  };

  const onKey = (e) => {
    if (!e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey) return;
    const k = (e.key || '').toLowerCase();
    if (k === 's') { e.preventDefault(); e.stopImmediatePropagation(); openOverlay(); }
    else if (k === 'f') { e.preventDefault(); e.stopImmediatePropagation(); setForce(!force); }
  };

  const start = () => {
    if (started) return;
    started = true;
    term = findTerm();

    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    toastEl = document.createElement('div');
    toastEl.id = 'pxts-toast';
    badgeEl = document.createElement('div');
    badgeEl.id = 'pxts-badge';
    badgeEl.addEventListener('click', () => setForce(!force));
    document.body.append(toastEl, badgeEl);
    renderBadge();

    ['mousedown', 'mousemove', 'mouseup', 'click', 'dblclick']
      .forEach((t) => window.addEventListener(t, onMouse, true));
    window.addEventListener('keydown', onKey, true);
  };

  // Wait for the terminal to appear (max ~60s)
  let tries = 0;
  const poll = setInterval(() => {
    tries++;
    if (document.querySelector('.xterm')) {
      if (!term) term = findTerm();
      if (!started) start();
      if (term || tries > 20) clearInterval(poll);
    } else if (tries > 120 || (!looksLikeConsole() && tries > 10)) {
      clearInterval(poll);
    }
  }, 500);
})();
