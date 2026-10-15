(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // reveal once
  const targets = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    targets.forEach((el) => io.observe(el));
    addEventListener('load', () => setTimeout(() => targets.forEach((el) => { const r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-in'); }), 2500));
  } else targets.forEach((el) => el.classList.add('is-in'));

  // story: one pinned screen, each line fades in and out as you scroll
  const story = document.querySelector('[data-story]');
  if (story && !reduce) {
    const beats = [...story.querySelectorAll('.beat')];
    const STEP = 0.75; // viewport heights of scroll per line
    story.classList.add('pinned');
    story.style.height = `calc(${beats.length * STEP * 100}svh + 100svh)`;
    let cur = -1, ticking = false;
    const set = () => {
      ticking = false;
      const r = story.getBoundingClientRect();
      const p = Math.max(0, -r.top) / (innerHeight * STEP);
      const i = Math.min(beats.length - 1, Math.floor(p));
      if (i !== cur) { beats.forEach((b, n) => { b.classList.toggle('on', n === i); b.classList.toggle('past', n < i); }); cur = i; }
      story.classList.toggle('started', p > 0.15);
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(set); } }, { passive: true });
    addEventListener('resize', set);
    set();
  }

  // signature: the room's light shifts (timed crossfade in the first stage)
  const cyc = document.querySelector('[data-cycle]');
  if (cyc && !reduce) {
    const imgs = [...cyc.querySelectorAll('img')]; let k = 0, t;
    const tick = () => { imgs[k].classList.remove('on'); k = (k + 1) % imgs.length; imgs[k].classList.add('on'); };
    const start = () => { clearInterval(t); t = setInterval(tick, 6500); };
    document.addEventListener('visibilitychange', () => document.hidden ? clearInterval(t) : start());
    start();
  }

  // second stage follows the section in view
  const fol = document.querySelector('[data-follow]');
  if (fol && 'IntersectionObserver' in window) {
    const map = {}; fol.querySelectorAll('img[data-for]').forEach((im) => map[im.dataset.for] = im);
    const io2 = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting && map[e.target.id]) { Object.values(map).forEach((m) => m.classList.remove('on')); map[e.target.id].classList.add('on'); } }, { rootMargin: '-45% 0px -45% 0px' });
    Object.keys(map).forEach((id) => { const s = document.getElementById(id); if (s) io2.observe(s); });
  }

  // ---------- the live thing: next real sessions, Bogotá time (UTC-5, no DST) ----------
  const OFF = -5 * 3600e3;
  const D = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const M = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const now = Date.now();
  const local = new Date(now + OFF);
  const START = Date.UTC(2026, 9, 25, 17, 0) - OFF; // primera sesión: domingo 25 de octubre de 2026, 5:00 PM
  const sessions = [];
  for (let i = 0; i < 400 && sessions.length < 6; i++) {
    const d = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + i, 17, 0) - OFF);
    const ld = new Date(d.getTime() + OFF);
    const wd = ld.getUTCDay();
    if ((wd === 6 || wd === 0) && d.getTime() > now && d.getTime() >= START) sessions.push({ t: d.getTime(), wd, day: ld.getUTCDate(), mon: ld.getUTCMonth(), i });
  }
  const label = (s) => `${D[s.wd]} ${s.day} de ${M[s.mon]}`;
  const cap = (x) => x[0].toUpperCase() + x.slice(1);

  const datesEl = document.getElementById('dates');
  if (sessions.length) {
    datesEl.innerHTML = sessions.map((s, n) => `<label class="choice"><input type="radio" name="dia" value="${n}"${n ? '' : ' checked'}><span>${cap(D[s.wd]).slice(0, 3)} ${s.day} ${M[s.mon].slice(0, 3)}<small>5:00 PM</small></span></label>`).join('');
  }

  const countEl = document.getElementById('count'), nextEl = document.getElementById('next');
  const nm = document.getElementById('nombre'), msgT = document.getElementById('msg-text'), tf = document.getElementById('text-field');
  const form = document.getElementById('form'), legend = document.getElementById('dates-legend');

  const countdown = (s) => {
    const ms = s.t - Date.now(), h = Math.floor(ms / 3600e3);
    const today = new Date(Date.now() + OFF), sd = new Date(s.t + OFF);
    const sameDay = today.getUTCDate() === sd.getUTCDate() && today.getUTCMonth() === sd.getUTCMonth();
    if (ms < 3600e3) return `Empieza en ${Math.max(1, Math.round(ms / 60e3))} minutos`;
    if (sameDay) return `Hoy, en ${h} ${h === 1 ? 'hora' : 'horas'}`;
    if (s.i === 1) return 'Mañana a las 5';
    const days = Math.ceil(ms / 86400e3);
    return `Faltan ${days} días`;
  };

  const update = () => {
    const pkg = form.pkg.value;
    const idx = form.dia ? form.dia.value : '0';
    const s = sessions[+idx];
    legend.textContent = pkg === '4' ? 'Primer encuentro' : 'Día';
    if (s) {
      countEl.textContent = countdown(s);
      nextEl.textContent = `para tu sesión del ${label(s)}, 5:00 PM.`;
    }
    const who = nm.value.trim() ? ` Soy ${nm.value.trim()}.` : '';
    const when = s ? ` para el ${label(s)} a las 5:00 PM` : '';
    const what = pkg === '4' ? 'el paquete de 4 clases (160.000 COP) de Yoga Nidra con baño de sonido, empezando' : '1 clase (45.000 COP) de Yoga Nidra con baño de sonido';
    const text = `Hola Mariana,${who} quiero reservar ${what}${when}. ¿Hay cupo?`;
    msgT.textContent = text; tf.value = text;
  };
  form.addEventListener('change', update);
  nm.addEventListener('input', update);
  form.addEventListener('submit', (e) => { e.preventDefault(); update(); window.open('https://wa.me/573507574553?text=' + encodeURIComponent(tf.value), '_blank', 'noopener'); });
  document.querySelectorAll('[data-pkg]').forEach((a) => a.addEventListener('click', () => { const r = form.querySelector(`input[name=pkg][value="${a.dataset.pkg}"]`); if (r) { r.checked = true; update(); } }));
  update();
  setInterval(update, 60e3);
})();
