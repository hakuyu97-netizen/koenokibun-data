(function () {
  "use strict";

  var TARGET_PATH = "/archives/17519110.html";
  var DATA_URL = "https://raw.githubusercontent.com/hakuyu97-netizen/koenokibun-data/main/koenokibun_works.json";
  var PREF_KEY = "koenokibunPrefsV1";

  function isTargetPage() {
    return location.pathname === TARGET_PATH || !!document.getElementById("kk-cond-app");
  }
  if (!isTargetPage()) return;

  function norm(v) {
    return String(v == null ? "" : v)
      .normalize("NFKC")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }
  function arr(w, k) {
    return Array.isArray(w && w[k]) ? w[k] : [];
  }
  function splitTerms(q) {
    return String(q || "")
      .replace(/、/g, " ")
      .replace(/,/g, " ")
      .split(/\s+/)
      .map(function (x) { return x.trim(); })
      .filter(Boolean);
  }
  function textOf(w) {
    var parts = [
      w.title, w.circle, w.ageRating
    ];
    ["cv","relationship","affection","mood","warnings","officialTags","genres","situations"]
      .forEach(function (k) { parts = parts.concat(arr(w, k)); });
    return norm(parts.filter(Boolean).join(" "));
  }
  function matchTerm(w, term) {
    return textOf(w).indexOf(norm(term)) !== -1;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }
  function latestFirst(a, b) {
    return String(b.releaseDate || "").localeCompare(String(a.releaseDate || ""));
  }

  var app = document.getElementById("kk-cond-app");
  if (!app) return;

  var mainQ = document.getElementById("kk-main-query");
  var notQ = document.getElementById("kk-not-query");
  var age = document.getElementById("kk-age");
  var cv = document.getElementById("kk-cv");
  var circle = document.getElementById("kk-circle");
  var searchBtn = document.getElementById("kk-search");
  var resetBtn = document.getElementById("kk-reset");
  var titleEl = document.getElementById("kk-result-title");
  var countEl = document.getElementById("kk-count");
  var results = document.getElementById("kk-results");
  var modeBtns = Array.prototype.slice.call(document.querySelectorAll(".kk-mode-btn"));
  var exampleBtns = Array.prototype.slice.call(document.querySelectorAll(".kk-example"));

  if (!mainQ || !notQ || !age || !cv || !circle || !searchBtn || !resetBtn || !titleEl || !countEl || !results) {
    return;
  }

  var works = [];
  var matchMode = "and";

  function setMode(mode) {
    matchMode = mode === "or" ? "or" : "and";
    modeBtns.forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-mode") === matchMode);
    });
  }

  function populateSelect(select, values) {
    var current = select.value;
    Array.prototype.slice.call(select.querySelectorAll("option")).slice(1).forEach(function (o) {
      o.remove();
    });
    values.filter(Boolean).sort(function (a,b) { return String(a).localeCompare(String(b), "ja"); })
      .forEach(function (v) {
        var o = document.createElement("option");
        o.value = v;
        o.textContent = v;
        select.appendChild(o);
      });
    if (values.indexOf(current) !== -1) select.value = current;
  }

  function render(list) {
    if (!list.length) {
      results.innerHTML = '<div class="kk-empty">この条件に合う作品は見つかりませんでした。</div>';
      return;
    }
    results.innerHTML = list.map(function (w) {
      var cvs = arr(w, "cv").join(" / ");
      var rel = arr(w, "relationship").join("・");
      var warnings = arr(w, "warnings");
      var url = w.affiliate_url || w.url || "#";
      return ''
        + '<article class="kk-work">'
        + '<div class="kk-work-title">' + esc(w.title) + '</div>'
        + '<div class="kk-work-meta">' + esc(w.ageRating || "") + ' / CV：' + esc(cvs || "—")
        + (rel ? ' / 関係：' + esc(rel) : '') + '</div>'
        + (warnings.length ? '<div class="kk-work-warn">注意：' + esc(warnings.slice(0,4).join("・")) + '</div>' : '')
        + '<a class="kk-work-link" href="' + esc(url) + '" target="_blank" rel="noopener sponsored">作品を見る</a>'
        + '</article>';
    }).join("");
  }

  function savePrefs() {
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify({
        version: 1,
        source: "condition",
        matchMode: matchMode,
        includeTerms: splitTerms(mainQ.value),
        excludeTerms: splitTerms(notQ.value),
        age: age.value || "",
        cv: cv.value || "",
        circle: circle.value || "",
        updatedAt: Date.now()
      }));
    } catch (e) {}
  }

  function runSearch() {
    var include = splitTerms(mainQ.value);
    var exclude = splitTerms(notQ.value);
    var a = age.value;
    var c = cv.value;
    var ci = circle.value;

    var list = works.filter(function (w) {
      if (a && w.ageRating !== a) return false;
      if (c && arr(w, "cv").indexOf(c) === -1) return false;
      if (ci && w.circle !== ci) return false;

      if (include.length) {
        var hits = include.map(function (t) { return matchTerm(w, t); });
        if (matchMode === "or") {
          if (!hits.some(Boolean)) return false;
        } else {
          if (!hits.every(Boolean)) return false;
        }
      }
      if (exclude.length && exclude.some(function (t) { return matchTerm(w, t); })) return false;
      return true;
    }).sort(latestFirst);

    titleEl.textContent = "検索結果";
    countEl.textContent = list.length + "件";
    render(list);
    savePrefs();
  }

  modeBtns.forEach(function (b) {
    b.addEventListener("click", function () {
      setMode(b.getAttribute("data-mode"));
    });
  });

  exampleBtns.forEach(function (b) {
    b.addEventListener("click", function () {
      mainQ.value = b.getAttribute("data-q") || "";
    });
  });

  searchBtn.addEventListener("click", runSearch);

  resetBtn.addEventListener("click", function () {
    mainQ.value = "";
    notQ.value = "";
    age.value = "";
    cv.value = "";
    circle.value = "";
    setMode("and");
    titleEl.textContent = "条件を入れて検索してください";
    countEl.textContent = "";
    results.innerHTML = '<div class="kk-empty">含めたい条件とNOT除外を組み合わせて作品を絞り込めます。</div>';
    try { localStorage.removeItem(PREF_KEY); } catch (e) {}
  });

  fetch(DATA_URL, { cache: "no-store" })
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(function (data) {
      works = Array.isArray(data) ? data : (Array.isArray(data.works) ? data.works : []);
      var cvs = [];
      var circles = [];
      works.forEach(function (w) {
        cvs = cvs.concat(arr(w, "cv"));
        if (w.circle) circles.push(w.circle);
      });
      cvs = Array.from(new Set(cvs));
      circles = Array.from(new Set(circles));
      populateSelect(cv, cvs);
      populateSelect(circle, circles);
      setMode("and");
    })
    .catch(function () {
      titleEl.textContent = "作品データを読み込めませんでした";
      results.innerHTML = '<div class="kk-empty">ページを再読み込みしても改善しない場合は、作品データ側を確認してください。</div>';
    });
})();