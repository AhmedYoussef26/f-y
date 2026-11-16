/* F&Y Chartered Accountants — interactions and motion.
   Vanilla JS, no dependencies. Motion uses transform/opacity only and
   is disabled or reduced under prefers-reduced-motion. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const fmt = new Intl.NumberFormat('en-US');
  const DOHA_OFFSET_H = 3; // Qatar is UTC+3 all year

  // Interface strings for the two language versions (chosen from <html lang>).
  const T = document.documentElement.lang === 'ar' ? {
    menuOpen: 'افتح القائمة', menuClose: 'أغلق القائمة',
    fieldwork: 'العمل الميداني', review: 'المراجعة', signed: 'تم التوقيع',
    deadline: y => `30 أبريل ${y}`,
    windowOpens: y => `تبدأ مهلة الأشهر الأربعة في 1 يناير ${y}.`,
    windowUsed: p => `انقضى ${p}% من مهلة الأشهر الأربعة.`,
    open: 'مفتوح الآن', closed: 'مغلق الآن',
    errName: 'أدخل اسمك.', errEmail: 'أدخل بريداً إلكترونياً صحيحاً.', errMsg: 'أخبرنا بالمزيد، جملة واحدة على الأقل.',
    subject: 'طلب عرض سعر', lName: 'الاسم', lCompany: 'الشركة', lEmail: 'البريد الإلكتروني', lService: 'الخدمة'
  } : {
    menuOpen: 'Open menu', menuClose: 'Close menu',
    fieldwork: 'Fieldwork', review: 'Review', signed: 'Signed',
    deadline: y => `30 April ${y}`,
    windowOpens: y => `The four-month filing window opens on 1 January ${y}.`,
    windowUsed: p => `${p}% of the four-month filing window is already used.`,
    open: 'Open now', closed: 'Closed now',
    errName: 'Enter your name.', errEmail: 'Enter a valid email address.', errMsg: 'Tell us a little more, at least a sentence.',
    subject: 'Quote request', lName: 'Name', lCompany: 'Company', lEmail: 'Email', lService: 'Service'
  };

  const easeOut = t => 1 - Math.pow(1 - t, 4);
  function tween(ms, onStep, onDone) {
    if (reduced) { onStep(1); onDone && onDone(); return; }
    const t0 = performance.now();
    (function frame(now) {
      const t = Math.min(1, (now - t0) / ms);
      onStep(easeOut(t));
      if (t < 1) requestAnimationFrame(frame); else onDone && onDone();
    })(t0);
  }

  /* ---------- Nav: stuck state, active link, mobile menu ---------- */
  const nav = $('#nav');
  const sentinel = document.createElement('div');
  sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:80px;pointer-events:none';
  document.body.prepend(sentinel);
  new IntersectionObserver(([e]) => nav.classList.toggle('is-stuck', !e.isIntersecting)).observe(sentinel);

  const links = $$('.nav__links a');
  const spy = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach(s => spy.observe(s));

  const toggle = $('#navToggle');
  const menu = $('#mobileMenu');
  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? T.menuClose : T.menuOpen);
    document.body.classList.toggle('menu-open', open);
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add('is-open'));
    } else {
      menu.classList.remove('is-open');
      setTimeout(() => { if (toggle.getAttribute('aria-expanded') === 'false') menu.hidden = true; }, 320);
    }
  }
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- Scroll reveals with per-group stagger ---------- */
  const revealIO = new IntersectionObserver(entries => {
    const batch = entries.filter(e => e.isIntersecting);
    batch.forEach((e, i) => {
      e.target.style.setProperty('--d', i);
      e.target.classList.add('is-in');
      revealIO.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
  $$('.reveal').forEach(el => revealIO.observe(el));

  /* ---------- Statement: word-by-word reveal ---------- */
  $$('[data-words]').forEach(el => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', words.join(' '));
    el.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true" style="--wi:${i}">${w.replace(/&/g, '&amp;')}</span>`).join(' ');
    new IntersectionObserver(([e], io) => {
      if (e.isIntersecting) { el.classList.add('is-in'); io.disconnect(); }
    }, { threshold: 0.35 }).observe(el);
  });

  /* ---------- Count-up numbers ---------- */
  const countIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target, target = +el.dataset.count, plain = 'plain' in el.dataset;
      const from = plain ? target - 40 : 0;
      tween(1600, t => {
        const v = Math.round(from + (target - from) * t);
        el.textContent = plain ? v : fmt.format(v);
      });
      countIO.unobserve(el);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach(el => countIO.observe(el));

  /* ---------- Hero ledger: looping audit sequence ---------- */
  const ledger = $('#ledger');
  if (ledger) {
    const rows = $$('.ledger__rows li', ledger);
    const state = $('[data-state]', ledger);
    const max = Math.max(...rows.map(r => +$('.l-num', r).dataset.v));
    rows.forEach(r => r.style.setProperty('--w', (0.35 + 0.65 * (+$('.l-num', r).dataset.v / max)).toFixed(3)));
    let timers = [], visible = false, running = false;
    const wait = (fn, ms) => timers.push(setTimeout(fn, ms));

    function finalState() {
      rows.forEach(r => { r.classList.add('is-checked'); const n = $('.l-num', r); n.textContent = fmt.format(+n.dataset.v); });
      ledger.classList.add('is-signed');
      state.textContent = T.signed;
    }
    function reset() {
      rows.forEach(r => { r.classList.remove('is-checked'); $('.l-num', r).textContent = '0'; });
      ledger.classList.remove('is-signed', 'is-scanning');
      state.textContent = T.fieldwork;
    }
    function run() {
      if (!visible) { running = false; return; }
      running = true;
      reset();
      ledger.classList.remove('is-resetting');
      ledger.classList.add('is-scanning');
      rows.forEach((r, i) => wait(() => {
        ledger.style.setProperty('--row', i);
        r.classList.add('is-checked');
        const n = $('.l-num', r), v = +n.dataset.v;
        tween(900, t => { n.textContent = fmt.format(Math.round(v * t)); });
      }, 500 + i * 850));
      const end = 500 + rows.length * 850;
      wait(() => { ledger.classList.remove('is-scanning'); state.textContent = T.review; }, end + 200);
      wait(() => { ledger.classList.add('is-signed'); state.textContent = T.signed; }, end + 900);
      wait(() => ledger.classList.add('is-resetting'), end + 5200);
      wait(run, end + 5900);
    }
    if (reduced) finalState();
    else new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !running) { timers.forEach(clearTimeout); timers = []; run(); }
      if (!visible) { timers.forEach(clearTimeout); timers = []; running = false; }
    }, { threshold: 0.25 }).observe(ledger);
  }

  /* ---------- Services accordion + glyph ---------- */
  const glyph = $('.glyph');
  const items = $$('.acc__item');
  items.forEach(item => {
    $$('.tags li', item).forEach((li, n) => li.style.setProperty('--n', n));
    $('.acc__btn', item).addEventListener('click', () => {
      const open = item.classList.contains('is-open');
      items.forEach(it => { it.classList.remove('is-open'); $('.acc__btn', it).setAttribute('aria-expanded', 'false'); });
      if (!open) {
        item.classList.add('is-open');
        $('.acc__btn', item).setAttribute('aria-expanded', 'true');
        if (glyph) glyph.dataset.active = item.dataset.glyph;
      }
    });
    if (finePointer) item.addEventListener('pointerenter', () => { if (glyph) glyph.dataset.active = item.dataset.glyph; });
  });
  if (glyph) {
    new IntersectionObserver(([e], io) => {
      if (e.isIntersecting) { glyph.dataset.active = '0'; io.disconnect(); }
    }, { threshold: 0.5 }).observe(glyph);
  }

  /* ---------- Tax desk: deadline countdown ---------- */
  // Returns for years ending 31 December are due within four months: 30 April, Doha time.
  function nextDeadline(now) {
    const mk = y => Date.UTC(y, 3, 30, 23 - DOHA_OFFSET_H, 59, 59);
    const y = new Date(now + DOHA_OFFSET_H * 36e5).getUTCFullYear();
    return mk(y) > now ? { at: mk(y), year: y } : { at: mk(y + 1), year: y + 1 };
  }
  const cd = { d: $('[data-cd="d"]'), h: $('[data-cd="h"]'), m: $('[data-cd="m"]'), s: $('[data-cd="s"]') };
  const cdBar = $('[data-cd-bar]');
  const daysLeftEls = $$('[data-days-left]');
  const label = $('[data-deadline-label]');
  function setNum(el, txt) {
    if (!el || el.textContent === txt) return;
    el.textContent = txt;
    if (!reduced) { el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick'); }
  }
  function tickCountdown() {
    const now = Date.now();
    const { at, year } = nextDeadline(now);
    let rest = Math.max(0, Math.floor((at - now) / 1000));
    const d = Math.floor(rest / 86400); rest -= d * 86400;
    const h = Math.floor(rest / 3600); rest -= h * 3600;
    const m = Math.floor(rest / 60), s = rest - m * 60;
    setNum(cd.d, String(d).padStart(3, '0'));
    setNum(cd.h, String(h).padStart(2, '0'));
    setNum(cd.m, String(m).padStart(2, '0'));
    setNum(cd.s, String(s).padStart(2, '0'));
    daysLeftEls.forEach(el => { el.textContent = d; });
    if (label) label.textContent = T.deadline(year);
    if (cdBar) {
      const start = Date.UTC(year, 0, 1, -DOHA_OFFSET_H);
      const used = Math.min(1, Math.max(0, (now - start) / (at - start)));
      cdBar.dataset.used = used.toFixed(4);
      const note = cdBar.closest('.tcard').querySelector('.tcard__note');
      if (note) note.textContent = used === 0
        ? T.windowOpens(year)
        : T.windowUsed(Math.round(used * 100));
    }
  }
  if (cd.d) {
    tickCountdown();
    setInterval(tickCountdown, 1000);
    new IntersectionObserver(([e], io) => {
      if (e.isIntersecting) { cdBar.style.transform = `scaleX(${cdBar.dataset.used})`; io.disconnect(); }
    }, { threshold: 0.6 }).observe(cdBar);
  }

  /* ---------- Tax desk: late penalty calculator ---------- */
  const range = $('#penaltyDays');
  if (range) {
    const out = $('#penaltyOut'), daysOut = $('#penaltyDaysOut');
    const PER_DAY = 500, CAP = 180000;
    let shown = 15000, raf = 0;
    function update() {
      const days = +range.value, target = Math.min(days * PER_DAY, CAP);
      daysOut.textContent = days;
      range.style.setProperty('--p', (days / +range.max * 100) + '%');
      out.classList.toggle('is-max', target === CAP);
      cancelAnimationFrame(raf);
      if (reduced) { shown = target; out.textContent = fmt.format(target); return; }
      (function step() {
        shown += (target - shown) * 0.22;
        if (Math.abs(target - shown) < 1) shown = target;
        out.textContent = fmt.format(Math.round(shown / 10) * 10);
        if (shown !== target) raf = requestAnimationFrame(step); else out.textContent = fmt.format(target);
      })();
    }
    range.addEventListener('input', update);
    update();
  }

  /* ---------- Pointer effects: magnetic buttons, spotlight, tilt ---------- */
  if (finePointer && !reduced) {
    $$('.magnetic').forEach(btn => {
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        btn.style.setProperty('--tx', ((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1) + 'px');
        btn.style.setProperty('--ty', ((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1) + 'px');
      });
      btn.addEventListener('pointerleave', () => { btn.style.setProperty('--tx', '0px'); btn.style.setProperty('--ty', '0px'); });
    });
    $$('.spot').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
      card.addEventListener('pointerleave', () => { card.style.setProperty('--mx', '-400px'); card.style.setProperty('--my', '-400px'); });
    });
    $$('.tilt').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty('--ry', (px * 5).toFixed(2) + 'deg');
        card.style.setProperty('--rx', (-py * 5).toFixed(2) + 'deg');
      });
      card.addEventListener('pointerleave', () => { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
    });
  }

  /* ---------- Office hours indicator (Sun to Thu, 8:00 to 17:00 Doha) ---------- */
  const openEl = $('[data-open]');
  if (openEl) {
    const doha = new Date(Date.now() + DOHA_OFFSET_H * 36e5);
    const day = doha.getUTCDay(), hour = doha.getUTCHours();
    const isOpen = day <= 4 && hour >= 8 && hour < 17;
    openEl.textContent = isOpen ? T.open : T.closed;
    openEl.classList.toggle('is-open', isOpen);
  }

  /* ---------- Quote form: inline validation, then a prepared email ---------- */
  const form = $('#quoteForm');
  if (form) {
    const done = $('#formDone');
    const rules = {
      name: v => v.trim().length >= 2 ? '' : T.errName,
      email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : T.errEmail,
      message: v => v.trim().length >= 10 ? '' : T.errMsg
    };
    function check(name) {
      const input = form.elements[name], msg = rules[name](input.value);
      const field = input.closest('.field');
      field.classList.toggle('has-error', !!msg);
      $(`[data-err="${name}"]`, form).textContent = msg;
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      return !msg;
    }
    Object.keys(rules).forEach(name => {
      form.elements[name].addEventListener('blur', () => check(name));
      form.elements[name].addEventListener('input', () => { if (form.elements[name].closest('.field').classList.contains('has-error')) check(name); });
    });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const bad = Object.keys(rules).filter(n => !check(n));
      if (bad.length) { form.elements[bad[0]].focus(); return; }
      const f = form.elements;
      const subject = `${T.subject}: ${f.service.value}`;
      const body = [`${T.lName}: ${f.name.value.trim()}`, f.company.value.trim() && `${T.lCompany}: ${f.company.value.trim()}`, `${T.lEmail}: ${f.email.value.trim()}`, `${T.lService}: ${f.service.value}`, null, f.message.value.trim()].filter(l => l !== '').map(l => l === null ? '' : l).join('\n');
      window.location.href = `mailto:info@fy-auditorsqa.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      done.hidden = false;
      done.querySelector('button').focus();
    });
    $('#formReset').addEventListener('click', () => { form.reset(); done.hidden = true; form.elements.name.focus(); });
  }

  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
})();
