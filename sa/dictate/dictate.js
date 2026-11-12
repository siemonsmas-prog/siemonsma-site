/* Talk to type, for every text box on siemonsma.org.
   Tap a text box and a mic appears at its right edge. Tap the mic and talk: the words go in where the
   cursor is, as you speak. Tap the mic again (or start typing, or leave the box) to stop.
   Uses the browser's own speech recognition (Chrome, Edge, Samsung Internet, Safari). Where the browser
   has none (Firefox), no mic is shown. package.py inlines this file into every page it builds. */
(function () {
  "use strict";
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR || window.__dictateLoaded) return;
  window.__dictateLoaded = true;

  var TEXT_TYPES = { "": 1, text: 1, search: 1, email: 1, url: 1 };
  function isTextBox(el) {
    if (!el || el.disabled || el.readOnly || el.dataset.noDictate !== undefined) return false;
    if (el.tagName === "TEXTAREA") return true;
    if (el.tagName === "INPUT") return TEXT_TYPES[(el.getAttribute("type") || "").toLowerCase()] === 1;
    return false;
  }

  var css = document.createElement("style");
  css.textContent =
    ".dict-mic{position:fixed;z-index:2147483000;width:32px;height:32px;border:0;border-radius:50%;padding:0;margin:0;" +
    "display:flex;align-items:center;justify-content:center;cursor:pointer;background:#3d8bff;color:#fff;" +
    "box-shadow:0 2px 6px rgba(0,0,0,.35);-webkit-tap-highlight-color:transparent;touch-action:manipulation}" +
    ".dict-mic svg{width:18px;height:18px;display:block}" +
    ".dict-mic.on{background:#e5484d;animation:dict-pulse 1.2s ease-out infinite}" +
    "@keyframes dict-pulse{0%{box-shadow:0 0 0 0 rgba(229,72,77,.6)}100%{box-shadow:0 0 0 12px rgba(229,72,77,0)}}" +
    ".dict-tip{position:fixed;z-index:2147483001;left:50%;bottom:24px;transform:translateX(-50%);max-width:90vw;" +
    "background:#121a27;color:#e9eef6;border:1px solid #26344c;border-radius:10px;padding:10px 14px;" +
    "font:500 15px/1.4 system-ui,Arial,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.4)}" +
    "@media (prefers-reduced-motion:reduce){.dict-mic.on{animation:none}}";
  document.head.appendChild(css);

  var MIC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8"/></svg>';
  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "dict-mic";
  btn.innerHTML = MIC;
  btn.hidden = true;
  btn.setAttribute("aria-label", "Talk to type");
  btn.setAttribute("data-no-dictate", "");

  var field = null;      // the text box the mic belongs to
  var rec = null;        // live recognition session
  var listening = false; // the mic is on (sessions may restart underneath)
  var pre = "", post = ""; // text before and after the spoken part
  var spoken = "";       // finished words from earlier sessions this time the mic was on
  var raf = 0, tipTimer = 0;

  function place() {
    raf = 0;
    if (!field || !document.contains(field)) { hide(); return; }
    var r = field.getBoundingClientRect();
    if (!r.width || r.bottom < 0 || r.top > innerHeight) { btn.style.display = "none"; return; }
    btn.style.display = "";
    var size = Math.max(24, Math.min(32, r.height - 6));
    btn.style.width = btn.style.height = size + "px";
    var top = field.tagName === "TEXTAREA" ? r.bottom - size - 4 : r.top + (r.height - size) / 2;
    btn.style.top = Math.round(top) + "px";
    btn.style.left = Math.round(r.right - size - 4) + "px";
  }
  function schedule() { if (field && !raf) raf = requestAnimationFrame(place); }
  function show(el) {
    if (field !== el) stop();
    field = el;
    if (!btn.isConnected) document.body.appendChild(btn);
    btn.hidden = false;
    place();
  }
  function hide() { stop(); field = null; btn.hidden = true; }

  function tip(msg) {
    var t = document.querySelector(".dict-tip");
    if (!t) { t = document.createElement("div"); t.className = "dict-tip"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg;
    clearTimeout(tipTimer);
    tipTimer = setTimeout(function () { t.remove(); }, 5000);
  }

  function caret(el) {
    try { return [el.selectionStart, el.selectionEnd]; } catch (e) { return null; } // email/url boxes have no cursor
  }
  function joinText(a, b) {
    if (!b) return a;
    if (!a) return b.charAt(0).toUpperCase() + b.slice(1);
    if (/[.!?]\s*$/.test(a)) b = b.charAt(0).toUpperCase() + b.slice(1);
    return /\s$/.test(a) ? a + b : a + " " + b;
  }
  function glue(a, b) { return a && b ? a + " " + b : a || b; }
  function write(text) {
    if (!field) return;
    var mid = joinText(pre, text);
    var tail = post && !/^\s/.test(post) && text ? " " + post : post;
    var v = mid + tail;
    if (field.maxLength > 0 && v.length > field.maxLength) v = v.slice(0, field.maxLength);
    field.value = v;
    var at = Math.min(mid.length, v.length);
    try { field.setSelectionRange(at, at); } catch (e) {}
    field.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function session() {
    rec = new SR();
    rec.lang = document.documentElement.lang && document.documentElement.lang.length > 2 ? document.documentElement.lang : "en-US";
    rec.interimResults = true;
    // Android Chrome repeats words in continuous mode, so there each session is one phrase and we restart it.
    rec.continuous = !/Android/i.test(navigator.userAgent);
    var finals = "";
    rec.onresult = function (e) {
      var fin = "", live = "";
      for (var i = 0; i < e.results.length; i++) {
        var t = e.results[i][0].transcript;
        if (e.results[i].isFinal) fin += t; else live += t;
      }
      finals = fin.trim();
      write(glue(spoken, (fin + live).trim()));
    };
    rec.onerror = function (e) {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        tip("The microphone is blocked. Allow it for siemonsma.org in your browser's site settings, then tap the mic again.");
        listening = false;
      } else if (e.error === "network") {
        tip("Talk to type needs an internet connection.");
        listening = false;
      } else if (e.error === "audio-capture") {
        tip("No microphone found.");
        listening = false;
      }
    };
    rec.onend = function () {
      spoken = glue(spoken, finals);
      rec = null;
      if (listening && field) {
        try { session(); return; } catch (err) {}
      }
      finish();
    };
    rec.start();
  }

  function start() {
    if (!field) return;
    var c = caret(field), v = field.value;
    if (c && c[0] != null) { pre = v.slice(0, c[0]); post = v.slice(c[1]); } else { pre = v; post = ""; }
    spoken = "";
    listening = true;
    btn.classList.add("on");
    btn.setAttribute("aria-label", "Stop talking");
    try { session(); } catch (e) { listening = false; finish(); }
  }
  function stop() {
    if (!listening && !rec) return;
    listening = false;
    if (rec) { try { rec.stop(); } catch (e) { finish(); } } else finish();
  }
  function finish() {
    btn.classList.remove("on");
    btn.setAttribute("aria-label", "Talk to type");
    if (field && spoken) field.dispatchEvent(new Event("change", { bubbles: true }));
    spoken = "";
  }

  // keep the cursor in the box when the mic is pressed, so the phone keyboard and focus stay put
  btn.addEventListener("pointerdown", function (e) { e.preventDefault(); });
  btn.addEventListener("mousedown", function (e) { e.preventDefault(); });
  btn.addEventListener("click", function (e) {
    e.preventDefault(); e.stopPropagation();
    if (listening) stop(); else { if (field && document.activeElement !== field) field.focus(); start(); }
  });

  document.addEventListener("focusin", function (e) {
    if (e.target === btn) return;
    if (isTextBox(e.target)) show(e.target); else if (field) hide();
  });
  document.addEventListener("focusout", function (e) {
    if (e.target !== field) return;
    setTimeout(function () { if (field && document.activeElement !== field && document.activeElement !== btn) hide(); }, 150);
  });
  // typing yourself takes over from the mic
  document.addEventListener("keydown", function (e) { if (listening && e.target === field && e.key.length === 1) stop(); }, true);
  addEventListener("scroll", schedule, true);
  addEventListener("resize", schedule);
  if (window.visualViewport) { visualViewport.addEventListener("resize", schedule); visualViewport.addEventListener("scroll", schedule); }
  new MutationObserver(function (list) {
    for (var i = 0; i < list.length; i++) if (list[i].target !== btn && !btn.contains(list[i].target)) { schedule(); return; }
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style", "hidden"] });
  document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); });
  if (document.activeElement && isTextBox(document.activeElement)) show(document.activeElement);
})();
