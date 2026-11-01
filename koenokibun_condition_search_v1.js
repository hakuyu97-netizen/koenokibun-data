(function () {
  "use strict";

  var TARGET_PATH = "/archives/17519110.html";
  var DATA_URL = "https://raw.githubusercontent.com/hakuyu97-netizen/koenokibun-data/main/koenokibun_works.json";
  var PREF_KEY = "koenokibunPrefsV1";

  function isTargetPage() {
    return location.pathname === TARGET_PATH || !!document.getElementById("kk-cond-app");
  }
  function isHomePage() {
    return location.pathname === "/" || location.pathname === "";
  }
  if (!isTargetPage() && !isHomePage()) return;


  function injectStyles() {
    if (document.getElementById("kk-condition-runtime-style")) return;
    var s = document.createElement("style");
    s.id = "kk-condition-runtime-style";
    s.textContent =
      "#kk-results{margin-top:14px}" +
      "#kk-results .kk-work{border:1px solid #ecdde2;background:#fff;padding:14px 16px;margin:0 0 12px;border-radius:12px}" +
      "#kk-results .kk-work-title{font-weight:700;font-size:1rem;line-height:1.55;margin-bottom:5px}" +
      "#kk-results .kk-work-meta{font-size:.79rem;color:#777;line-height:1.6;margin-bottom:7px}" +
      "#kk-results .kk-work-warn{font-size:.8rem;color:#9a4b56;background:#fff4f5;padding:7px 9px;border-radius:7px;margin:7px 0}" +
      "#kk-results .kk-work-link{display:inline-block;margin-top:7px;padding:7px 12px;border:1px solid #e5cbd3;border-radius:999px;background:#fff8fa;color:#222;text-decoration:none;font-weight:700;font-size:.82rem}" +
      "#kk-results .kk-empty{border:1px dashed #decfd4;border-radius:10px;padding:14px;color:#777;background:#fcfafb}" +
      "#kk-cond-app .kk-mode-btn.is-active{background:#333!important;color:#fff!important;border-color:#333!important}"+"".concat("#koe-home-cv{width:100%;max-width:320px;padding:9px 10px;border:1px solid #e5cbd3;border-radius:8px;background:#fff;margin:4px 0 10px}");
    document.head.appendChild(s);
  }

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

  function findSectionByHeading(text) {
    var hs = Array.prototype.slice.call(document.querySelectorAll("h2"));
    for (var i=0;i<hs.length;i++) {
      if ((hs[i].textContent || "").trim() === text) return hs[i].closest("section");
    }
    return null;
  }
  function renderTrendsHome(works) {
    var sec = findSectionByHeading("最近増えている傾向");
    if (!sec) return;

    function parseDate(s) {
      var d = new Date(String(s || "") + "T00:00:00");
      return isNaN(d.getTime()) ? null : d;
    }
    var dates = works.map(function(w){return parseDate(w.releaseDate);}).filter(Boolean);
    if (!dates.length) {
      sec.innerHTML='<h2>最近増えている傾向</h2><p class="koe-mini-note">集計できる発売日データがありません。</p>';
      return;
    }
    var maxDate = new Date(Math.max.apply(null, dates.map(function(d){return d.getTime();})));
    var recentStart = new Date(maxDate); recentStart.setDate(recentStart.getDate()-29);
    var prevEnd = new Date(recentStart); prevEnd.setDate(prevEnd.getDate()-1);
    var prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate()-29);

    function bucket(w) {
      var out=[];
      ["mood","affection","relationship","officialTags"].forEach(function(k){
        arr(w,k).forEach(function(v){ if(v) out.push(v); });
      });
      return Array.from(new Set(out));
    }
    function counts(start,end) {
      var m={};
      works.forEach(function(w){
        var d=parseDate(w.releaseDate);
        if(!d || d<start || d>end) return;
        bucket(w).forEach(function(t){m[t]=(m[t]||0)+1;});
      });
      return m;
    }
    var a=counts(recentStart,maxDate),b=counts(prevStart,prevEnd);
    var rows=Object.keys(a).map(function(k){
      return {tag:k,recent:a[k]||0,prev:b[k]||0,delta:(a[k]||0)-(b[k]||0)};
    }).filter(function(x){return x.delta>0 && x.recent>=2;})
      .sort(function(x,y){return y.delta-x.delta || y.recent-x.recent || x.tag.localeCompare(y.tag,"ja");})
      .slice(0,5);

    var period = recentStart.getFullYear()+"/"+(recentStart.getMonth()+1)+"/"+recentStart.getDate()+
      "〜"+(maxDate.getMonth()+1)+"/"+maxDate.getDate();

    sec.innerHTML =
      '<h2>最近増えている傾向</h2>'+
      '<p>'+esc(period)+'の作品を、その前30日と比べています。</p>'+
      (rows.length
        ? '<div class="koe-feature-examples">'+rows.map(function(x){return '<span>'+esc(x.tag)+' ＋'+x.delta+'</span>';}).join("")+'</div>'
        : '<p class="koe-mini-note">今のデータでは、はっきり増えている傾向はありません。</p>')+
      '<div class="koe-mini-note">※発売日が確認できる作品だけを集計しています。</div>';
  }

  function renderCvHome(works) {
    var sec = findSectionByHeading("好きなCVの作品");
    if (!sec) return;
    var cvs = [];
    works.forEach(function(w){ cvs = cvs.concat(arr(w,"cv")); });
    cvs = Array.from(new Set(cvs.filter(Boolean))).sort(function(a,b){return String(a).localeCompare(String(b),"ja");});

    sec.innerHTML =
      '<h2>好きなCVの作品</h2>' +
      '<p>CVを選ぶと、その声の新しい作品を表示します。</p>' +
      '<select id="koe-home-cv" class="koe-cv-select"><option value="">CVを選んでください</option></select>' +
      '<div id="koe-home-cv-results" class="koe-top-list"></div>' +
      '<a class="koe-cta-link" href="https://koenokibun.doorblog.jp/archives/17519110.html">さらに条件で絞る</a>';

    var sel = document.getElementById("koe-home-cv");
    var box = document.getElementById("koe-home-cv-results");
    if (!sel || !box) return;

    cvs.forEach(function(v){
      var o=document.createElement("option");o.value=v;o.textContent=v;sel.appendChild(o);
    });

    function show(cvName){
      if(!cvName){box.innerHTML='<div class="koe-mini-note">CVを選ぶと、作品候補がここに表示されます。</div>';return;}
      var list=works.filter(function(w){return arr(w,"cv").indexOf(cvName)!==-1;}).sort(latestFirst).slice(0,3);
      if(!list.length){box.innerHTML='<div class="koe-mini-note">このCVの作品は現在のデータにありません。</div>';return;}
      box.innerHTML=list.map(function(w){
        var age=w.ageRating||"";
        var badge=age==="R18"?'<span class="koe-badge koe-badge-r18">R18</span>':'<span class="koe-badge koe-badge-general">全年齢</span>';
        var url=w.affiliate_url||w.url||"#";
        return '<div class="koe-top-item">'+badge+
          '<a href="'+esc(url)+'" target="_blank" rel="noopener sponsored">'+esc(w.title)+'</a>'+
          '<div class="koe-top-meta">'+esc(w.releaseDate||"")+' / CV：'+esc(arr(w,"cv").join(" / "))+'</div></div>';
      }).join("");
    }

    sel.addEventListener("change",function(){show(sel.value);});
    show("");
  }

  injectStyles();

  if (isHomePage()) {
    fetch(DATA_URL,{cache:"no-store"})
      .then(function(r){if(!r.ok)throw new Error("HTTP "+r.status);return r.json();})
      .then(function(data){
        var homeWorks=Array.isArray(data)?data:(Array.isArray(data.works)?data.works:[]);
        renderCvHome(homeWorks);
        renderTrendsHome(homeWorks);
      })
      .catch(function(){});
    return;
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