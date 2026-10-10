/* ==========================================================================
   Workpaper kit, behaviour. Shared by the interactive tools; see
   docs/workpaper-kit.md. No dependencies, no build.

     Workpaper.init({ memo: fn, status: el })   wire #wp-copy, #wp-print, #wp-link
     Workpaper.hash.save({a:1,b:'x'})           write state to the URL hash
     Workpaper.hash.load()                      read it back (object, or null)
     Workpaper.money(v) / Workpaper.parseMoney(s)
     Workpaper.pin  { set(obj), clear(), get() }

   The model never lives here: this file only moves text and state around.
   ========================================================================== */
(function(){
  'use strict';

  var usd = new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits:0 });
  function money(v){ return usd.format(Math.round(v)).replace('-$', '−$'); }
  function parseMoney(s){
    var t = String(s == null ? '' : s).replace(/[^0-9.]/g, '');
    return t === '' ? null : +t;
  }

  var statusEl = null, timer = 0;
  function flash(msg){
    if (!statusEl) return;
    statusEl.textContent = msg;
    clearTimeout(timer);
    timer = setTimeout(function(){ statusEl.textContent = ''; }, 2200);
  }

  function copy(text, done){
    var fallback = function(){
      var ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); flash(done); } catch (e) { flash('Copy failed'); }
      document.body.removeChild(ta);
    };
    if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(function(){ flash(done); }, fallback);
    } else fallback();
  }

  var hash = {
    save: function(obj){
      try {
        var p = new URLSearchParams();
        Object.keys(obj).forEach(function(k){ if (obj[k] !== '' && obj[k] != null) p.set(k, String(obj[k])); });
        history.replaceState(null, '', '#' + p.toString());
      } catch (e) { /* file:// or a sandboxed frame: the link just will not carry state */ }
    },
    load: function(){
      try {
        var h = location.hash.replace(/^#/, '');
        if (!h) return null;
        var p = new URLSearchParams(h), out = {}, n = 0;
        p.forEach(function(v, k){ out[k] = v; n++; });
        return n ? out : null;
      } catch (e) { return null; }
    }
  };

  var baseline = null;
  var pin = {
    set: function(o){ baseline = o; },
    clear: function(){ baseline = null; },
    get: function(){ return baseline; }
  };

  /* "+$1,200 vs baseline" for a figure against the pinned one. */
  function delta(cur, base, fmt){
    if (base == null || cur == null) return '';
    var d = cur - base;
    if (Math.abs(d) < 0.5) return 'same as baseline';
    return (d > 0 ? '+' : '−') + (fmt || money)(Math.abs(d)).replace('−', '') + ' vs baseline';
  }

  function init(opts){
    statusEl = opts.status || document.getElementById('wp-status');
    var bind = function(id, fn){ var el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
    bind('wp-copy',  function(){ copy(opts.memo(), 'Workpaper copied'); });
    bind('wp-link',  function(){ copy(location.href, 'Link copied'); });
    bind('wp-print', function(){ window.print(); });
  }

  /* Fill a <ul class="wp-insights"> from [[kind, text], ...]; kind is ok|bad|warn|info. */
  function fillInsights(ul, items){
    ul.innerHTML = '';
    var glyph = { ok:'✓', bad:'✕', warn:'!', info:'i' };
    items.forEach(function(x){
      var li = document.createElement('li'); li.className = x[0];
      var i = document.createElement('i'); i.setAttribute('aria-hidden', 'true'); i.textContent = glyph[x[0]];
      var s = document.createElement('span'); s.textContent = x[1];
      li.appendChild(i); li.appendChild(s); ul.appendChild(li);
    });
  }

  /* Fill a <ul class="wp-msgs"> from { block:[...], warn:[...] }. */
  function fillMsgs(ul, v){
    ul.innerHTML = '';
    v.block.concat(v.warn).forEach(function(t, k){
      var li = document.createElement('li'); li.className = k < v.block.length ? 'err' : 'warn';
      li.textContent = t; ul.appendChild(li);
    });
  }

  window.Workpaper = {
    init: init, flash: flash, copy: copy, hash: hash, pin: pin, delta: delta,
    money: money, parseMoney: parseMoney, fillInsights: fillInsights, fillMsgs: fillMsgs
  };
})();
