/**
 * Infosec Maturity - Executive Overview (Page 1) custom visualization.
 * Renders the EXACT design mockup (gauges with target band, stat cards,
 * maturity/KPI-by-domain bars, KPI-by-owner bars, program scorecard, trend)
 * from live Looker data. No HTML sanitizer limits apply inside a custom viz.
 *
 * Query it against the program_score explore with these fields (in any order):
 *   program_score.vp_name          (dimension)  - owner VP
 *   dim_program.program_name       (dimension)  - program
 *   dim_domain.domain_name         (dimension)  - domain
 *   program_score.maturity_level   (dimension)
 *   program_score.kpi_status       (dimension)
 *   program_score.kpi_score        (measure, 0-100)
 *   program_score.maturity_score   (measure, 0-5)
 */
(function () {
  var C = {
    purple: "#4D148C", purple2: "#6A32B0", orange: "#E8720C", teal: "#2E8B7A",
    dark: "#232323", grey: "#6A6A6A", card: "#FFFFFF", bg: "#F4F2F8",
    border: "#DCD3EA", track: "#ECE6F5", good: "#188038"
  };
  var RAG = { Critical: "#C0392B", High: "#E8720C", Medium: "#F1C40F", Moderate: "#7FB800", Low: "#2E8B57" };
  var MAT = { Absent: "#C0392B", Initial: "#E8720C", Developing: "#F1C40F", Defined: "#7FB800", Managed: "#2E8B57", Optimized: "#1F6F4A" };
  var LEVELS = ["Absent", "Initial", "Developing", "Defined", "Managed", "Optimized"];
  var OWN_PALETTE = ["#4D148C", "#E8720C", "#2E8B7A", "#6A32B0", "#C0392B", "#188038", "#2E8B57"];

  function kband(v) { return v < 10 ? "Critical" : v <= 30 ? "High" : v <= 80 ? "Medium" : v <= 95 ? "Moderate" : "Low"; }
  function matlvl(m100) { return LEVELS[Math.max(0, Math.min(5, Math.round(m100 / 20)))]; }
  function avg(a) { return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : 0; }

  function polar(cx, cy, r, deg) { var a = deg * Math.PI / 180; return [cx + r * Math.cos(a), cy - r * Math.sin(a)]; }
  function arc(cx, cy, r, a0, a1) {
    var p0 = polar(cx, cy, r, a0), p1 = polar(cx, cy, r, a1);
    var large = Math.abs(a0 - a1) > 180 ? 1 : 0;
    return "M " + p0[0] + " " + p0[1] + " A " + r + " " + r + " 0 " + large + " 1 " + p1[0] + " " + p1[1];
  }
  // frac 0..1 (value/max), goodFrac 0..1 (target/max) -> green target band + tick
  function gauge(frac, color, big, sub, goodFrac) {
    var W = 230, H = 140, cx = 115, cy = 120, r = 88, t = 30, rc = r - t / 2;
    var valEnd = 180 - Math.max(0, Math.min(1, frac)) * 180;
    var gb = 180 - goodFrac * 180;
    var tk0 = polar(cx, cy, r + 2, gb), tk1 = polar(cx, cy, r + 18, gb);
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%">' +
      '<path d="' + arc(cx, cy, rc, 180, 0) + '" stroke="' + C.track + '" stroke-width="' + t + '" fill="none"/>' +
      '<path d="' + arc(cx, cy, rc, 180, valEnd) + '" stroke="' + color + '" stroke-width="' + t + '" fill="none"/>' +
      '<path d="' + arc(cx, cy, r + 11, gb, 0) + '" stroke="' + C.good + '" stroke-width="9" fill="none"/>' +
      '<line x1="' + tk0[0] + '" y1="' + tk0[1] + '" x2="' + tk1[0] + '" y2="' + tk1[1] + '" stroke="' + C.good + '" stroke-width="2.4"/>' +
      '<text x="' + cx + '" y="' + (cy - 18) + '" text-anchor="middle" font-size="30" font-weight="800" fill="' + C.dark + '">' + big + '</text>' +
      '<text x="' + cx + '" y="' + (cy + 4) + '" text-anchor="middle" font-size="15" font-weight="700" fill="' + color + '">' + sub + '</text>' +
      '</svg>';
  }
  function bar(pct, color, valText) {
    var w = Math.max(Math.min(pct, 100), 2);
    return '<div class="bar"><div class="track"><div class="fill" style="width:' + w + '%;background:' + color + '"></div></div>' +
      '<div class="val">' + valText + '</div></div>';
  }
  function lineChart(series, months) {
    var W = 430, H = 230, padL = 32, padR = 14, padT = 10, iw = W - padL - padR, ih = H - padT - 34;
    var x = function (i) { return padL + i * iw; };
    var y = function (v) { return padT + ih - (v / 100) * ih; };
    var g = "";
    for (var v = 0; v <= 100; v += 25) {
      g += '<line x1="' + padL + '" y1="' + y(v) + '" x2="' + (padL + iw) + '" y2="' + y(v) + '" stroke="#EEE7F7" stroke-width="1"/>';
      g += '<text x="' + (padL - 6) + '" y="' + (y(v) + 3) + '" text-anchor="end" font-size="10" fill="' + C.grey + '">' + v + '</text>';
    }
    var lines = "";
    series.forEach(function (s) {
      var xs = s.vals.map(function (_, i) { return x(s.vals.length === 1 ? 0.5 : i / (s.vals.length - 1)); });
      var ys = s.vals.map(function (val) { return y(val); });
      var d = "M " + xs[0] + " " + ys[0];
      for (var i = 1; i < xs.length; i++) d += " L " + xs[i] + " " + ys[i];
      lines += '<path d="' + d + '" stroke="' + s.color + '" stroke-width="2.6" fill="none"/>';
      xs.forEach(function (xx, i) { lines += '<circle cx="' + xx + '" cy="' + ys[i] + '" r="4.5" fill="' + s.color + '"/>'; });
    });
    var mx = "";
    months.forEach(function (m, i) { mx += '<text x="' + x(months.length === 1 ? 0.5 : i / (months.length - 1)) + '" y="' + (H - 12) + '" text-anchor="middle" font-size="12" fill="' + C.grey + '">' + m + '</text>'; });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%">' + g + lines + mx + '</svg>';
  }

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function renderPage(rows) {
    if (!rows.length) return '<div style="padding:24px;color:' + C.grey + '">No data for the current filters.</div>';
    var om = avg(rows.map(function (p) { return p.mat100; }));
    var ok = avg(rows.map(function (p) { return p.kpi; }));
    var owners = rows.map(function (p) { return p.owner; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
    var OC = {}; owners.forEach(function (o, i) { OC[o] = OWN_PALETTE[i % OWN_PALETTE.length]; });

    var doms = {}; rows.forEach(function (p) { (doms[p.domain] = doms[p.domain] || []).push(p); });
    var dm = {}, dk = {};
    Object.keys(doms).forEach(function (d) { dm[d] = avg(doms[d].map(function (p) { return p.mat100; })); dk[d] = avg(doms[d].map(function (p) { return p.kpi; })); });
    var dOrder = Object.keys(doms).sort(function (a, b) { return dm[b] - dm[a]; });

    var ownK = {}; owners.forEach(function (o) { ownK[o] = avg(rows.filter(function (p) { return p.owner === o; }).map(function (p) { return p.kpi; })); });
    var oOrder = owners.slice().sort(function (a, b) { return ownK[b] - ownK[a]; });

    var atRisk = rows.filter(function (p) { return p.kpi < 50; }).length;

    var domainRows = dOrder.map(function (d) {
      return '<div class="barrow dom"><div class="lbl">' + esc(d) + '</div>' +
        bar(dm[d], dm[d] >= 50 ? MAT.Defined : MAT.Developing, (dm[d] / 20).toFixed(1)) +
        bar(dk[d], RAG[kband(dk[d])], Math.round(dk[d])) + '</div>';
    }).join("");

    var ownerRows = oOrder.map(function (o) {
      return '<div class="barrow"><div class="lbl"><span class="dot" style="background:' + OC[o] + '"></span>' + esc(o) + '</div>' +
        bar(ownK[o], RAG[kband(ownK[o])], Math.round(ownK[o])) + '</div>';
    }).join("");

    var scRows = rows.slice().sort(function (a, b) {
      if (a.owner < b.owner) return -1; if (a.owner > b.owner) return 1; return b.mat100 - a.mat100;
    }).map(function (p) {
      var lvlColor = MAT[p.level] || C.grey;
      return '<tr><td><div class="owner-cell"><span class="dot" style="background:' + OC[p.owner] + '"></span>' + esc(p.owner) + '</div></td>' +
        '<td class="prog">' + esc(p.program) + '</td>' +
        '<td>' + (p.mat100 / 20).toFixed(1) + '</td>' +
        '<td><span class="pill" style="background:' + lvlColor + '">' + esc(p.level) + '</span></td>' +
        '<td>' + Math.round(p.kpi) + '</td>' +
        '<td><span class="pill" style="background:' + RAG[kband(p.kpi)] + '">' + esc(p.status || kband(p.kpi)) + '</span></td></tr>';
    }).join("");

    var gaugeMat = gauge(om / 100, MAT[matlvl(om)], (om / 20).toFixed(2), matlvl(om), 0.8);
    var gaugeKpi = gauge(ok / 100, RAG[kband(ok)], ok.toFixed(1), kband(ok), 0.95);

    var trend = lineChart([
      { vals: [ok, ok], color: C.purple },
      { vals: [om, om], color: C.orange }
    ], ["Prev", "Now"]);

    return '' +
      '<div class="topbar"><h1>Infosec Maturity — Executive Overview</h1><div class="meta">Page 1 of 5</div></div>' +
      '<div class="wrap">' +
      '<div class="shell"><div class="nav">' +
      '<div class="tab active">1 Overview</div><div class="tab">2 Metric Detail</div><div class="tab">3 Domain</div><div class="tab">4 Maturity Q&amp;A</div><div class="tab">5 Trend</div>' +
      '</div></div>' +

      '<div class="card" style="margin-top:16px">' +
      '<h2>At a Glance&nbsp;&nbsp;—&nbsp;&nbsp;Maturity (from Q&amp;A)&nbsp;&nbsp;·&nbsp;&nbsp;KPI (from metrics)</h2>' +
      '<div class="glance"><div class="gauges">' +
      '<div class="gauge">' + gaugeMat + '<div class="cap">Overall Maturity (0-5) · good &gt; 4</div></div>' +
      '<div class="gauge">' + gaugeKpi + '<div class="cap">Overall KPI (0-100) · good &gt; 95</div></div>' +
      '</div><div class="stats">' +
      '<div class="stat"><div class="topbar2" style="background:' + C.purple + '"></div><div class="big">' + owners.length + '</div><div class="sub">Owners (VPs)</div></div>' +
      '<div class="stat"><div class="topbar2" style="background:' + C.teal + '"></div><div class="big">' + rows.length + '</div><div class="sub">Programs</div></div>' +
      '<div class="stat"><div class="topbar2" style="background:' + C.orange + '"></div><div class="big">' + atRisk + '</div><div class="sub">At Risk</div></div>' +
      '</div></div></div>' +

      '<div class="grid g2a">' +
      '<div class="card"><h2>Maturity &amp; KPI by Domain</h2>' + domainRows +
      '<div class="subhdr"><span></span><span>Maturity</span><span>KPI</span></div></div>' +
      '<div class="card"><h2>KPI by Owner (VP)</h2>' + ownerRows + '</div>' +
      '</div>' +

      '<div class="grid g2b">' +
      '<div class="card"><h2>Program Scorecard</h2><table><thead><tr>' +
      '<th>Owner</th><th>Program</th><th>Mat.</th><th>Level</th><th>KPI</th><th>Status</th>' +
      '</tr></thead><tbody>' + scRows + '</tbody></table></div>' +
      '<div class="card"><h2>Enterprise Trend</h2>' + trend +
      '<div class="legend"><span class="swatch" style="background:' + C.orange + '"></span>Orange = Maturity&nbsp;&nbsp;&nbsp;' +
      '<span class="swatch" style="background:' + C.purple + '"></span>Purple = KPI' +
      '<div class="note">Showing the current period only — add a period column / history table for month-over-month.</div></div></div>' +
      '</div>' +
      '</div>';
  }

  var STYLE =
    '.imd-root{background:#F4F2F8;color:#232323;font-family:"Segoe UI",Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;height:100%;overflow:auto;padding-bottom:20px}' +
    '.imd-root *{box-sizing:border-box}' +
    '.imd-root .topbar{background:#4D148C;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:18px 26px}' +
    '.imd-root .topbar h1{font-size:24px;margin:0;font-weight:800;letter-spacing:.2px}' +
    '.imd-root .topbar .meta{color:#EAD9F7;font-size:14px}' +
    '.imd-root .wrap{max-width:1320px;margin:0 auto;padding:0 18px}' +
    '.imd-root .shell{background:#fff;border:1px solid #DCD3EA;border-radius:14px;padding:12px 14px;margin-top:16px}' +
    '.imd-root .nav{display:flex;gap:10px;flex-wrap:wrap}' +
    '.imd-root .nav .tab{border:1px solid #DCD3EA;background:#F3EFFA;color:#4D148C;font-weight:700;font-size:13px;padding:9px 18px;border-radius:16px;white-space:nowrap}' +
    '.imd-root .nav .tab.active{background:#4D148C;color:#fff;border-color:#4D148C}' +
    '.imd-root .card{background:#fff;border:1px solid #DCD3EA;border-radius:16px;padding:20px 22px}' +
    '.imd-root .card h2{color:#4D148C;font-size:18px;margin:0 0 16px;font-weight:800}' +
    '.imd-root .grid{display:grid;gap:16px;margin-top:16px}' +
    '.imd-root .g2a{grid-template-columns:60% 1fr}' +
    '.imd-root .g2b{grid-template-columns:62% 1fr}' +
    '@media(max-width:900px){.imd-root .g2a,.imd-root .g2b{grid-template-columns:1fr}}' +
    '.imd-root .glance{display:grid;grid-template-columns:1.1fr 1fr;gap:18px;align-items:center}' +
    '@media(max-width:900px){.imd-root .glance{grid-template-columns:1fr}}' +
    '.imd-root .gauges{display:flex;gap:10px;justify-content:space-around}' +
    '.imd-root .gauge{width:230px;text-align:center}' +
    '.imd-root .gauge .cap{color:#6A6A6A;font-size:12.5px;margin-top:2px}' +
    '.imd-root .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}' +
    '.imd-root .stat{background:#FBFAFD;border:1px solid #DCD3EA;border-radius:14px;text-align:center;padding:18px 8px 16px;position:relative;overflow:hidden}' +
    '.imd-root .stat .topbar2{position:absolute;top:0;left:0;right:0;height:7px}' +
    '.imd-root .stat .big{font-size:38px;font-weight:800;line-height:1;margin-top:6px}' +
    '.imd-root .stat .sub{color:#6A6A6A;font-size:12.5px;margin-top:10px}' +
    '.imd-root .barrow{display:grid;grid-template-columns:150px 1fr;align-items:center;gap:14px;margin:9px 0}' +
    '.imd-root .barrow.dom{grid-template-columns:150px 1fr 1fr}' +
    '.imd-root .barrow .lbl{font-size:13.5px;color:#232323}' +
    '.imd-root .barrow .lbl .dot{display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:8px;vertical-align:-1px}' +
    '.imd-root .bar{display:flex;align-items:center;gap:10px}' +
    '.imd-root .track{flex:1;height:15px;background:#ECE6F5;border-radius:8px;overflow:hidden}' +
    '.imd-root .fill{height:100%;border-radius:8px}' +
    '.imd-root .bar .val{font-size:13px;font-weight:800;color:#232323;width:32px;text-align:right}' +
    '.imd-root .subhdr{display:grid;grid-template-columns:150px 1fr 1fr;gap:14px;margin-top:6px}' +
    '.imd-root .subhdr span{font-size:12px;color:#6A6A6A}' +
    '.imd-root table{width:100%;border-collapse:collapse}' +
    '.imd-root thead th{text-align:left;color:#6A6A6A;font-size:13px;font-weight:700;padding:6px 8px;border-bottom:1.5px solid #DCD3EA}' +
    '.imd-root tbody td{padding:11px 8px;font-size:13.5px;border-bottom:1px solid #F0ECF7}' +
    '.imd-root tbody tr:last-child td{border-bottom:none}' +
    '.imd-root .owner-cell{display:flex;align-items:center;gap:9px}' +
    '.imd-root .owner-cell .dot{width:13px;height:13px;border-radius:50%}' +
    '.imd-root .prog{font-weight:700}' +
    '.imd-root .pill{display:inline-block;color:#fff;font-weight:700;font-size:12px;padding:6px 16px;border-radius:14px}' +
    '.imd-root .legend{color:#6A6A6A;font-size:13px;margin-top:8px}' +
    '.imd-root .legend .note{font-style:italic;font-size:12.5px;margin-top:4px}' +
    '.imd-root .legend .swatch{display:inline-block;width:14px;height:3px;vertical-align:3px;margin-right:5px}';

  var FIELDS = {
    vp: "program_score.vp_name",
    prog: "dim_program.program_name",
    dom: "dim_domain.domain_name",
    lvl: "program_score.maturity_level",
    st: "program_score.kpi_status",
    kpi: "program_score.kpi_score",
    mat: "program_score.maturity_score"
  };

  function pick(row, key) {
    if (row[key]) return row[key];
    var suffix = key.split(".").pop();
    for (var k in row) { if (k.indexOf(suffix) !== -1) return row[k]; }
    return null;
  }
  function val(cell) { return cell ? cell.value : null; }

  looker.plugins.visualizations.add({
    id: "infosec_page1",
    label: "Infosec — Executive Overview (Page 1)",
    options: {},
    create: function (element) {
      element.innerHTML = "<style>" + STYLE + "</style><div class='imd-root'></div>";
      this._root = element.querySelector(".imd-root");
    },
    updateAsync: function (data, element, config, queryResponse, details, done) {
      try {
        if (!this._root) { element.innerHTML = "<style>" + STYLE + "</style><div class='imd-root'></div>"; this._root = element.querySelector(".imd-root"); }
        var rows = data.map(function (r) {
          var matRaw = val(pick(r, FIELDS.mat));
          return {
            owner: val(pick(r, FIELDS.vp)),
            program: val(pick(r, FIELDS.prog)),
            domain: val(pick(r, FIELDS.dom)),
            level: val(pick(r, FIELDS.lvl)),
            status: val(pick(r, FIELDS.st)),
            kpi: Number(val(pick(r, FIELDS.kpi))) || 0,
            mat100: (Number(matRaw) || 0) * 20
          };
        }).filter(function (p) { return p.program != null; });
        this._root.innerHTML = renderPage(rows);
        done();
      } catch (e) {
        this.addError({ title: "Render error", message: String(e && e.message ? e.message : e) });
        done();
      }
    }
  });
})();
