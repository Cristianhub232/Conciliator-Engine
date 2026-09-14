/* ICHI — agente flotante. Web component aislado en Shadow DOM.
   Uso:  <script src="ichi-agent.js"></script>  +  <ichi-agent></ichi-agent>
   Docs: ICHI-Widget.md */
(function () {
  'use strict';

  var FONTS = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Chakra+Petch:wght@600;700&family=IBM+Plex+Mono:wght@400;500&display=swap';

  function ensureFonts() {
    if (document.getElementById('ichi-fonts')) return;
    var l = document.createElement('link');
    l.id = 'ichi-fonts';
    l.rel = 'stylesheet';
    l.href = FONTS;
    document.head.appendChild(l);
  }

  var K = '<rect x="0" y="0" width="7" height="18"></rect><rect x="0" y="30" width="7" height="18"></rect><polygon points="39,0 47,0 18,23.5 50,48 40,48 15,29 3,28 7,23.5 3,20 15,19"></polygon><polygon points="20,0 29,0 8,19 7,10"></polygon><polygon points="20,48 29,48 8,29 7,38"></polygon>';

  function avatar(size, ring) {
    return '<svg viewBox="0 0 88 88" style="width:' + size + 'px;height:' + size + 'px;display:block">' +
      '<circle cx="44" cy="44" r="' + (ring ? 39 : 42) + '" fill="#0A1733"></circle>' +
      (ring ? '<g class="ring"><path d="M44 5 A39 39 0 1 1 16.4 16.4" fill="none" stroke="#7FC8EE" stroke-width="3" stroke-linecap="round"></path><circle cx="44" cy="5" r="4.2" fill="#fff"></circle></g>' : '') +
      '<g transform="translate(' + (ring ? '27.5 28) scale(0.665' : '26 27) scale(0.7') + ')" fill="#7FC8EE">' + K + '</g></svg>';
  }

  /* Respuestas de demostración. Sustitúyelas conectando `resolver` (ver .md). */
  function fallbackResolver(q) {
    var t = String(q).toLowerCase();
    if (/pendient|planilla|lote|estado/.test(t)) return { text: 'En el lote 1 del expediente 1889 quedan 11 planillas pendientes de resolución por 4.156,70 Bs.', note: 'motor_app.planilla_recaudacion · banco 105' };
    if (/99044|forma|partida|imputa/.test(t)) return { text: 'La forma 99044 resuelve de manera directa a la partida 301033300. Concentra el 55 % del monto del lote.', note: 'Regla DIRECTA · 1 forma → 1 partida fija' };
    if (/prorrat|aduan|00086/.test(t)) return { text: 'Los tributos aduaneros de la forma 00086 se prorratean 52 % / 42 % / 6 % entre las tres partidas del grupo.', note: 'Simulador de imputación' };
    if (/revers|auditor|bit[aá]cora|traza/.test(t)) return { text: 'No hay reversiones en el período. Los 249 eventos de conciliación quedaron atómicos.', note: '1.343 eventos registrados' };
    return { text: 'Puedo consultar el estado del lote, explicar la regla de una forma tributaria o revisar la bitácora. ¿Por cuál seguimos?', note: null };
  }

  var CSS = [
    ':host{position:fixed;right:28px;bottom:28px;z-index:2147483000;font-family:"Space Grotesk","Manrope",system-ui,sans-serif}',
    ':host([hidden]){display:none}',
    '*{box-sizing:border-box}',
    'button{font-family:inherit}',
    '@keyframes ichiHalo{0%{transform:scale(1);opacity:.5}70%,100%{transform:scale(1.75);opacity:0}}',
    '@keyframes ichiPanelIn{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:none}}',
    '@keyframes ichiMsgIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}',
    '@keyframes ichiBlink{0%,60%,100%{opacity:.25;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}',
    '@keyframes ichiBob{0%,62%,100%{transform:translateY(0) rotate(0)}70%{transform:translateY(-4px) rotate(-8deg)}78%{transform:translateY(-1px) rotate(6deg)}86%{transform:translateY(-3px) rotate(-5deg)}94%{transform:translateY(0) rotate(2deg)}}',
    '@keyframes ichiOrbit{to{transform:rotate(360deg)}}',

    '.dock{display:flex;align-items:center;gap:12px}',
    '.tip{display:none;align-items:center;gap:9px;padding:9px 14px;border-radius:999px;background:#0A1733;box-shadow:0 10px 24px -10px rgba(10,23,51,.6);white-space:nowrap;animation:ichiMsgIn 160ms ease-out both}',
    '.fab:hover+.tip,.dock:hover .tip{display:flex}',
    '.tip b{font-size:13px;font-weight:700;color:#fff}',
    '.tip i{font-family:"Chakra Petch",sans-serif;font-style:normal;font-size:13px;font-weight:700;letter-spacing:.18em;text-indent:.18em;color:#7FC8EE}',

    '.fab{position:relative;display:flex;align-items:center;justify-content:center;width:76px;height:76px;padding:0;border:0;border-radius:50%;cursor:pointer;background:radial-gradient(120% 120% at 30% 20%,#143063 0,#0A1733 62%);box-shadow:0 12px 26px -12px rgba(10,23,51,.55);transition:transform 240ms cubic-bezier(.2,.9,.25,1.1),box-shadow 240ms ease}',
    '.fab:hover{transform:scale(1.08) translateY(-2px);box-shadow:0 18px 38px -12px rgba(10,23,51,.6),0 0 0 6px rgba(127,200,238,.22)}',
    '.fab svg{position:relative;width:58px;height:58px}',
    '.fab .ring{transform-origin:44px 44px;opacity:.72;transition:transform 620ms cubic-bezier(.2,.8,.25,1),opacity 240ms}',
    '.fab:hover .ring{transform:rotate(300deg);opacity:1}',
    '.halo{position:absolute;inset:-1px;border-radius:50%;border:2px solid #7FC8EE;animation:ichiHalo 2.9s ease-out infinite;pointer-events:none}',
    '.fab:hover .halo,:host([data-open]) .halo{display:none}',
    '.badge{position:absolute;top:4px;right:4px;display:flex;align-items:center;justify-content:center;width:19px;height:19px;border-radius:50%;background:#8CC63F;border:2px solid #F6F8FA;font-family:"IBM Plex Mono",monospace;font-size:9px;font-weight:600;color:#14263C}',

    '.panel{position:absolute;right:0;bottom:84px;display:none;flex-direction:column;width:468px;max-width:calc(100vw - 56px);height:min(684px,calc(100vh - 132px));background:#fff;border:1px solid #DCE3EC;border-radius:16px;box-shadow:0 28px 60px -18px rgba(10,23,51,.42),0 4px 14px rgba(10,23,51,.1);overflow:hidden;animation:ichiPanelIn 200ms cubic-bezier(.2,.8,.3,1) both}',
    ':host([data-open]) .panel{display:flex}',

    '.hd{display:flex;align-items:center;gap:11px;padding:14px 14px 14px 16px;background-image:linear-gradient(107deg,rgba(127,200,238,.1) 0 2px,transparent 2px 26px),linear-gradient(160deg,#0C1E44 0,#0A1733 100%)}',
    '.hd .av{flex:none;width:42px;height:42px}',
    '.hd .av .ring{transform-origin:44px 44px}',
    ':host([data-waiting]) .hd .av{animation:ichiBob 4.6s ease-in-out infinite}',
    ':host([data-waiting]) .hd .av .ring{animation:ichiOrbit 11s linear infinite}',
    '.wordmark{font-family:"Chakra Petch",sans-serif;font-size:16px;font-weight:700;letter-spacing:.22em;text-indent:.22em;line-height:1.1;color:#fff}',
    '.wordmark span{color:#7FC8EE}',
    '.status{display:flex;align-items:center;gap:6px;margin-top:3px;font-family:"Chakra Petch",sans-serif;font-size:8.5px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;color:#A9CDEA}',
    '.status i{width:5px;height:5px;border-radius:50%;background:#8CC63F;flex:none}',
    '.hbtn{display:flex;align-items:center;justify-content:center;width:30px;height:30px;flex:none;border:1px solid rgba(169,205,234,.28);border-radius:8px;background:transparent;cursor:pointer;color:#A9CDEA}',
    '.hbtn:hover{border-color:#7FC8EE;color:#fff}',

    '.llm{display:flex;align-items:center;gap:8px;padding:8px 16px;background:#F4F9FD;border-bottom:1px solid #E3EDF6;font-family:"IBM Plex Mono",monospace;font-size:10.5px;color:#1E5C99}',
    '.llm span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',

    '.thread{flex:1 1 auto;min-height:190px;overflow-y:auto;overflow-x:hidden;padding:16px;background:#F6F8FA;display:flex;flex-direction:column;gap:12px}',
    '.row{display:flex;gap:9px;animation:ichiMsgIn 180ms ease-out both}',
    '.row.user{justify-content:flex-end}',
    '.bub{max-width:390px;padding:12px 15px;border:1px solid #E1E7EE;border-radius:12px 12px 12px 3px;background:#fff}',
    '.row.user .bub{border-color:#0E2452;border-radius:12px 12px 3px 12px;background:#0E2452}',
    '.bub p{margin:0;font-size:13.5px;line-height:1.55;letter-spacing:-.005em;color:#26364E;white-space:pre-wrap;word-break:break-word;font-variant-numeric:tabular-nums}',
    '.row.user .bub p{color:#fff}',
    '.bub .note{margin-top:9px;padding-top:8px;border-top:1px solid #E1E7EE;font-family:"IBM Plex Mono",monospace;font-size:10px;line-height:1.5;color:#8797A8}',
    '.dots{display:flex;align-items:center;gap:5px;padding:12px 14px;border:1px solid #E1E7EE;border-radius:12px 12px 12px 3px;background:#fff}',
    '.dots i{width:6px;height:6px;border-radius:50%;background:#1E5C99;animation:ichiBlink 1.1s ease-in-out infinite}',
    '.dots i:nth-child(2){animation-delay:.16s}.dots i:nth-child(3){animation-delay:.32s}',

    '.chips{display:flex;flex:none;gap:6px;padding:12px 16px 0;background:#F6F8FA;overflow-x:auto;scrollbar-width:none}',
    '.chips::-webkit-scrollbar{display:none}',
    '.chips button{flex:none;white-space:nowrap;padding:8px 13px;border:1px solid #D3E2F0;border-radius:999px;background:#fff;font-size:12.5px;font-weight:500;color:#1E5C99;cursor:pointer;transition:border-color 130ms,background 130ms}',
    '.chips button:hover{border-color:#1E5C99;background:#F4F9FD}',

    '.composer{display:flex;align-items:flex-end;gap:8px;padding:12px 14px 14px;background:#F6F8FA}',
    '.field{flex:1;min-width:0;display:flex;background:#fff;border:1px solid #DCE3EC;border-radius:11px;transition:border-color 130ms}',
    '.field:focus-within{border-color:#1E5C99}',
    '.field input{width:100%;height:48px;padding:0 15px;font-family:inherit;font-size:14px;color:#14263C;background:transparent;border:0;outline:none}',
    '.field input::placeholder{color:#9CA9B8}',
    '.send{display:flex;align-items:center;justify-content:center;width:48px;height:48px;flex:none;border:0;border-radius:12px;background:#0E2452;color:#fff;cursor:pointer;transition:filter 130ms}',
    '.send:hover{filter:brightness(1.35)}.send:active{transform:translateY(1px)}',
    '.thread::-webkit-scrollbar{width:10px}',
    '.thread::-webkit-scrollbar-thumb{background:#D5DDE6;border-radius:8px;border:3px solid #F6F8FA}'
  ].join('');

  var ICO_BOLT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" style="width:13px;height:13px;flex:none"><path d="M13 3L5 14h5l-1 7 8-11h-5l1-7z"></path></svg>';
  var ICO_RESET = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" style="width:15px;height:15px"><path d="M20 12a8 8 0 11-2.4-5.7"></path><path d="M20 4v4h-4"></path></svg>';
  var ICO_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><path d="M6 6l12 12M18 6L6 18"></path></svg>';
  var ICO_SEND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" style="width:17px;height:17px"><path d="M4.5 12h14M12.5 5.5L19 12l-6.5 6.5"></path></svg>';

  var IchiAgent = function () {
    return Reflect.construct(HTMLElement, [], IchiAgent);
  };
  IchiAgent.prototype = Object.create(HTMLElement.prototype);
  IchiAgent.prototype.constructor = IchiAgent;
  Object.setPrototypeOf(IchiAgent, HTMLElement);

  IchiAgent.observedAttributes = ['context', 'model', 'greeting'];

  IchiAgent.prototype.connectedCallback = function () {
    if (this._built) return;
    this._built = true;
    if (this.getAttribute('fonts') !== 'off') ensureFonts();

    var root = this.attachShadow({ mode: 'open' });
    root.innerHTML =
      '<style>' + CSS + '</style>' +
      '<div class="panel" role="dialog" aria-label="Agente ICHI">' +
        '<div class="hd">' +
          '<div class="av">' + avatar(42, true) + '</div>' +
          '<div style="flex:1;min-width:0">' +
            '<div class="wordmark"><span>I</span>CHI</div>' +
            '<div class="status"><i></i><b data-status>Agente activo</b></div>' +
          '</div>' +
          '<button class="hbtn" data-reset aria-label="Nueva conversación">' + ICO_RESET + '</button>' +
          '<button class="hbtn" data-close aria-label="Cerrar">' + ICO_X + '</button>' +
        '</div>' +
        '<div class="llm">' + ICO_BOLT + '<span data-model></span></div>' +
        '<div class="thread" data-thread></div>' +
        '<div class="chips" data-chips></div>' +
        '<div class="composer">' +
          '<div class="field"><input type="text" data-input placeholder="Pregúntale a ICHI…" /></div>' +
          '<button class="send" data-send aria-label="Enviar">' + ICO_SEND + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="dock">' +
        '<div class="tip"><b>Pregúntale a</b><i>ICHI</i></div>' +
        '<button class="fab" data-fab aria-label="Abrir agente ICHI">' +
          '<span class="halo"></span>' + avatar(58, true) +
          '<span class="badge" data-badge>1</span>' +
        '</button>' +
      '</div>';

    var $ = root.querySelector.bind(root);
    this._thread = $('[data-thread]');
    this._input = $('[data-input]');
    this._chips = $('[data-chips]');
    this._statusEl = $('[data-status]');

    $('[data-fab]').addEventListener('click', this.toggle.bind(this));
    $('[data-close]').addEventListener('click', this.close.bind(this));
    $('[data-reset]').addEventListener('click', this.reset.bind(this));
    $('[data-send]').addEventListener('click', this._sendDraft.bind(this));
    this._input.addEventListener('input', this._sync.bind(this));
    this._input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); this._sendDraft(); }
    }.bind(this));

    this.suggestions = this.suggestions || ['¿Cuántas planillas quedan pendientes?', '¿Cómo imputa la forma 99044?', 'Explícame el prorrateo de aduanas'];
    this._renderChips();
    this._renderModel();
    this.push('agent', this.getAttribute('greeting') || 'Tengo el contexto de esta pantalla cargado. ¿Qué necesitas revisar?');
    this._sync();
    if (this.hasAttribute('open')) this.open();
  };

  IchiAgent.prototype.attributeChangedCallback = function () {
    if (this._built) this._renderModel();
  };

  IchiAgent.prototype._renderModel = function () {
    var el = this.shadowRoot.querySelector('[data-model]');
    var model = this.getAttribute('model') || 'Claude Sonnet 4.5 · Anthropic';
    var ctx = this.getAttribute('context');
    el.textContent = 'Impulsado por ' + model + (ctx ? ' · ' + ctx : '');
  };

  IchiAgent.prototype._renderChips = function () {
    var self = this;
    this._chips.innerHTML = '';
    (this.suggestions || []).forEach(function (label) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.addEventListener('click', function () { self.ask(label); });
      self._chips.appendChild(b);
    });
  };

  IchiAgent.prototype._sync = function () {
    var waiting = this.hasAttribute('data-open') && !this._busy && !this._input.value.trim();
    this.toggleAttribute('data-waiting', waiting);
    this._statusEl.textContent = this._busy ? 'Consultando…' : (waiting ? 'Esperando tu pregunta…' : 'Agente activo');
    this._chips.style.display = this._thread.childElementCount <= 3 && !this._busy ? 'flex' : 'none';
  };

  IchiAgent.prototype.push = function (role, text, note) {
    var row = document.createElement('div');
    row.className = 'row ' + (role === 'agent' ? 'agent' : 'user');
    row.innerHTML =
      (role === 'agent' ? '<div style="flex:none;margin-top:2px">' + avatar(26, false) + '</div>' : '') +
      '<div class="bub"><p></p>' + (note ? '<div class="note"></div>' : '') + '</div>';
    row.querySelector('p').textContent = text;
    if (note) row.querySelector('.note').textContent = note;
    this._thread.appendChild(row);
    this._thread.scrollTop = this._thread.scrollHeight;
    this._sync();
    return row;
  };

  IchiAgent.prototype.ask = function (question) {
    var q = String(question || '').trim();
    if (!q || this._busy) return;
    var self = this;
    this.push('user', q);
    this._input.value = '';
    this._busy = true;
    this._sync();

    var dots = document.createElement('div');
    dots.className = 'row agent';
    dots.innerHTML = '<div style="flex:none">' + avatar(26, false) + '</div><div class="dots"><i></i><i></i><i></i></div>';
    this._thread.appendChild(dots);
    this._thread.scrollTop = this._thread.scrollHeight;

    this.dispatchEvent(new CustomEvent('ichi-ask', { detail: { question: q }, bubbles: true }));

    var resolve = this.resolver || function (text) {
      return new Promise(function (r) { setTimeout(function () { r(fallbackResolver(text)); }, 900); });
    };

    Promise.resolve(resolve(q, this)).then(function (a) {
      dots.remove();
      self._busy = false;
      var reply = typeof a === 'string' ? { text: a } : (a || {});
      self.push('agent', reply.text || '', reply.note);
    }).catch(function (err) {
      dots.remove();
      self._busy = false;
      self.push('agent', 'No pude consultar el motor en este momento. Intenta de nuevo.', String(err && err.message || err));
    });
  };

  IchiAgent.prototype._sendDraft = function () { this.ask(this._input.value); };

  IchiAgent.prototype.open = function () {
    this.setAttribute('data-open', '');
    var b = this.shadowRoot.querySelector('[data-badge]');
    if (b) b.style.display = 'none';
    this._sync();
    this._input.focus();
    this.dispatchEvent(new CustomEvent('ichi-open', { bubbles: true }));
  };

  IchiAgent.prototype.close = function () {
    this.removeAttribute('data-open');
    this.removeAttribute('data-waiting');
    this.dispatchEvent(new CustomEvent('ichi-close', { bubbles: true }));
  };

  IchiAgent.prototype.toggle = function () {
    if (this.hasAttribute('data-open')) this.close(); else this.open();
  };

  IchiAgent.prototype.reset = function () {
    this._thread.innerHTML = '';
    this._busy = false;
    this._input.value = '';
    this.push('agent', 'Listo, empecemos de nuevo. ¿Qué necesitas revisar?');
  };

  if (!customElements.get('ichi-agent')) customElements.define('ichi-agent', IchiAgent);
})();
