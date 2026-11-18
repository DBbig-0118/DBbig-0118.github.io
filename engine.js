/* 디비빅SQL — 브라우저 SQL 실습 엔진
   SQLite(sql.js) 위에 Oracle 호환 레이어를 얹는다.
   - DATE 값은 숫자(1,000,000 + MJD)로 저장 → SYSDATE-1, 날짜 뺄셈이 Oracle처럼 동작
   - NVL/DECODE/TO_CHAR/TO_DATE/TRUNC/ADD_MONTHS/LISTAGG/FETCH FIRST/MINUS 등 지원
   - ORDER BY 기본 NULL 정렬을 Oracle과 동일하게(ASC → NULLS LAST, DESC → NULLS FIRST) */
(function (root) {
  "use strict";
  var D0 = 1000000 + 40587;              // 1970-01-01 의 날짜값
  var DMIN = 1015020, DMAX = 1088070;    // 1900~2100 범위면 날짜로 간주
  var MON = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  var MONTHN = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];
  var DAYN = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"];

  function isDate(v) { return typeof v === "number" && v >= DMIN && v < DMAX; }
  function dv(y, m, d, h, mi, s) { return D0 + Date.UTC(y, m - 1, d, h || 0, mi || 0, s || 0) / 86400000; }
  function dparts(v) {
    var t = new Date(Math.round((v - D0) * 86400) * 1000);
    return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), h: t.getUTCHours(), mi: t.getUTCMinutes(), s: t.getUTCSeconds(), dow: t.getUTCDay() };
  }
  function pad(n, w) { n = String(n); while (n.length < w) n = "0" + n; return n; }
  function caseLike(word, tok) {
    if (tok === tok.toUpperCase()) return word.toUpperCase();
    if (tok[0] === tok[0].toUpperCase()) return word[0] + word.slice(1).toLowerCase();
    return word.toLowerCase();
  }
  function lastDom(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }

  function fmtDate(v, fmt) {
    var p = dparts(v), fm = false, out = "";
    fmt = fmt || "YYYY-MM-DD HH24:MI:SS";
    var re = /"[^"]*"|FM|YYYY|RRRR|YYY|YY|RR|Y|MONTH|MON|MM|DDD|DD|DAY|DY|D|HH24|HH12|HH|MI|SS|AM|PM|A\.M\.|P\.M\.|Q|WW|./gi, m;
    while ((m = re.exec(fmt))) {
      var tk = m[0], U = tk.toUpperCase();
      if (tk[0] === '"') { out += tk.slice(1, -1); continue; }
      switch (U) {
        case "FM": fm = !fm; break;
        case "YYYY": case "RRRR": out += pad(p.y, 4); break;
        case "YYY": out += pad(p.y % 1000, 3); break;
        case "YY": case "RR": out += pad(p.y % 100, 2); break;
        case "Y": out += String(p.y % 10); break;
        case "MONTH": var mn = caseLike(MONTHN[p.m - 1], tk); out += fm ? mn : (mn + "         ").slice(0, 9); break;
        case "MON": out += caseLike(MON[p.m - 1], tk); break;
        case "MM": out += fm ? p.m : pad(p.m, 2); break;
        case "DDD": var doy = Math.floor(dv(p.y, p.m, p.d) - dv(p.y, 1, 1)) + 1; out += fm ? doy : pad(doy, 3); break;
        case "DD": out += fm ? p.d : pad(p.d, 2); break;
        case "DAY": var dn = caseLike(DAYN[p.dow], tk); out += fm ? dn : (dn + "         ").slice(0, 9); break;
        case "DY": out += caseLike(DAYN[p.dow].slice(0, 3), tk); break;
        case "D": out += String(p.dow + 1); break;
        case "HH24": out += fm ? p.h : pad(p.h, 2); break;
        case "HH12": case "HH": var h12 = p.h % 12 === 0 ? 12 : p.h % 12; out += fm ? h12 : pad(h12, 2); break;
        case "MI": out += pad(p.mi, 2); break;
        case "SS": out += pad(p.s, 2); break;
        case "AM": case "PM": out += p.h < 12 ? "AM" : "PM"; break;
        case "A.M.": case "P.M.": out += p.h < 12 ? "A.M." : "P.M."; break;
        case "Q": out += String(Math.floor((p.m - 1) / 3) + 1); break;
        case "WW": out += pad(Math.floor((Math.floor(dv(p.y, p.m, p.d) - dv(p.y, 1, 1))) / 7) + 1, 2); break;
        default: out += tk;
      }
    }
    return out;
  }

  function fmtNum(n, fmt) {
    var f = String(fmt).toUpperCase(), fm = false;
    if (f.indexOf("FM") === 0) { fm = true; f = f.slice(2); }
    var cur = f.indexOf("$") >= 0 ? "$" : "", L = f.indexOf("L") >= 0 ? "₩" : "";
    f = f.replace(/[$L]/g, "");
    var dot = f.indexOf("."), intF = dot >= 0 ? f.slice(0, dot) : f, decF = dot >= 0 ? f.slice(dot + 1) : "";
    var dec = (decF.match(/[09]/g) || []).length;
    var neg = n < 0, a = Math.abs(n), s = a.toFixed(dec), ip = s.split(".")[0], dp = s.split(".")[1] || "";
    var digitsAllowed = (intF.match(/[09]/g) || []).length;
    if (ip.length > digitsAllowed && !(ip === "0" && digitsAllowed === 0)) return new Array(f.length + 2).join("#");
    var z = intF.indexOf("0");
    if (z >= 0) { var need = (intF.slice(z).match(/[09]/g) || []).length; while (ip.length < need) ip = "0" + ip; }
    if (ip === "0" && z < 0 && dec > 0) ip = "";
    if (intF.indexOf(",") >= 0) ip = ip.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    var body = cur + L + ip + (dec > 0 ? "." + dp : "");
    var res = (neg ? "-" : "") + body;
    if (!fm) { var w = f.length + 1 + cur.length + L.length; while (res.length < w) res = " " + res; }
    return res;
  }

  function parseDate(s, fmt) {
    if (s === null || s === undefined) return null;
    if (typeof s === "number") return s;
    s = String(s).trim();
    if (!fmt) {
      var m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
      if (m) return dv(+m[1], +m[2], +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
      m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
      if (m) return dv(+m[1], +m[2], +m[3]);
      m = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
      if (m) { var yy = +m[3]; if (m[3].length === 2) yy += yy < 50 ? 2000 : 1900; return dv(yy, MON.indexOf(m[2].toUpperCase()) + 1, +m[1]); }
      throw new Error("ORA-01861: 리터럴이 형식 문자열과 일치하지 않습니다 ('" + s + "')");
    }
    var parts = { y: 1970, m: 1, d: 1, h: 0, mi: 0, s: 0, pm: null }, pos = 0;
    var re = /"[^"]*"|FM|YYYY|RRRR|YY|RR|MON|MM|DD|HH24|HH12|HH|MI|SS|AM|PM|./gi, t;
    while ((t = re.exec(fmt))) {
      var U = t[0].toUpperCase(), rest = s.slice(pos), mm;
      if (U === "FM") continue;
      if (t[0][0] === '"') { pos += t[0].length - 2; continue; }
      var num = function (max) { var q = rest.match(new RegExp("^\\d{1," + max + "}")); if (!q) throw new Error("ORA-01858: 숫자가 와야 할 위치에 다른 문자가 있습니다"); pos += q[0].length; return +q[0]; };
      switch (U) {
        case "YYYY": case "RRRR": parts.y = num(4); break;
        case "YY": case "RR": var y2 = num(2); parts.y = y2 < 50 ? 2000 + y2 : 1900 + y2; break;
        case "MM": parts.m = num(2); break;
        case "MON": mm = rest.slice(0, 3).toUpperCase(); parts.m = MON.indexOf(mm) + 1; if (!parts.m) throw new Error("ORA-01843: 지정한 월이 부적합합니다"); pos += 3; break;
        case "DD": parts.d = num(2); break;
        case "HH24": parts.h = num(2); break;
        case "HH12": case "HH": parts.h = num(2); break;
        case "MI": parts.mi = num(2); break;
        case "SS": parts.s = num(2); break;
        case "AM": case "PM": parts.pm = rest.slice(0, 2).toUpperCase() === "PM"; pos += 2; break;
        default: pos += 1;
      }
    }
    if (parts.pm === true && parts.h < 12) parts.h += 12;
    if (parts.pm === false && parts.h === 12) parts.h = 0;
    if (parts.m < 1 || parts.m > 12) throw new Error("ORA-01843: 지정한 월이 부적합합니다");
    if (parts.d < 1 || parts.d > lastDom(parts.y, parts.m)) throw new Error("ORA-01847: 일자는 1과 월의 마지막 일 사이여야 합니다");
    return dv(parts.y, parts.m, parts.d, parts.h, parts.mi, parts.s);
  }

  function addMonths(v, n) {
    var p = dparts(v), frac = v - Math.floor(v);
    var isLast = p.d === lastDom(p.y, p.m);
    var tm = p.m - 1 + Math.trunc(n), y = p.y + Math.floor(tm / 12), m = ((tm % 12) + 12) % 12 + 1;
    var d = isLast ? lastDom(y, m) : Math.min(p.d, lastDom(y, m));
    return dv(y, m, d) + frac;
  }
  function monthsBetween(a, b) {
    var p = dparts(a), q = dparts(b);
    var whole = (p.y - q.y) * 12 + (p.m - q.m);
    if (p.d === q.d || (p.d === lastDom(p.y, p.m) && q.d === lastDom(q.y, q.m))) return whole;
    var fa = (p.h * 3600 + p.mi * 60 + p.s) / 86400, fb = (q.h * 3600 + q.mi * 60 + q.s) / 86400;
    return whole + ((p.d + fa) - (q.d + fb)) / 31;
  }
  function truncDate(v, f) {
    var p = dparts(v); f = (f || "DD").toUpperCase();
    if (/^(YYYY|YYY|YY|Y|YEAR|SYYYY|RRRR|RR)$/.test(f)) return dv(p.y, 1, 1);
    if (/^(Q)$/.test(f)) return dv(p.y, Math.floor((p.m - 1) / 3) * 3 + 1, 1);
    if (/^(MONTH|MON|MM|RM)$/.test(f)) return dv(p.y, p.m, 1);
    if (/^(DD|DDD|J)$/.test(f)) return dv(p.y, p.m, p.d);
    if (/^(HH|HH12|HH24)$/.test(f)) return dv(p.y, p.m, p.d, p.h);
    if (/^MI$/.test(f)) return dv(p.y, p.m, p.d, p.h, p.mi);
    if (/^(DAY|DY|D)$/.test(f)) return dv(p.y, p.m, p.d) - p.dow;
    throw new Error("ORA-01898: 정밀도 지정자가 너무 많습니다 (" + f + ")");
  }
  function oraRegex(p, flags) {
    var fl = "g"; flags = flags || "";
    if (flags.indexOf("i") >= 0) fl += "i";
    if (flags.indexOf("m") >= 0) fl += "m";
    if (flags.indexOf("n") >= 0) fl += "s";
    p = String(p).replace(/\[:alpha:\]/g, "a-zA-Z").replace(/\[:digit:\]/g, "0-9").replace(/\[:alnum:\]/g, "a-zA-Z0-9").replace(/\[:space:\]/g, "\\s").replace(/\[:upper:\]/g, "A-Z").replace(/\[:lower:\]/g, "a-z").replace(/\[:punct:\]/g, "!-\\/:-@\\[-`{-~");
    return new RegExp(p, fl);
  }

  function variadic(f) { try { Object.defineProperty(f, "length", { value: -1 }); } catch (e) {} return f; }

  function registerFunctions(db, ctx) {
    var F = function (name, fn) { db.create_function(name, variadic(fn)); };
    F("SYSDATE", function () { return ctx.now; });
    F("SYSTIMESTAMP", function () { return ctx.now; });
    F("NVL", function (a, b) { return a === null || a === "" ? b : a; });
    F("NVL2", function (a, b, c) { return a === null || a === "" ? c : b; });
    F("DECODE", function () {
      var a = arguments, x = a[0], i;
      for (i = 1; i + 1 < a.length; i += 2) { if (x === a[i] || (x === null && a[i] === null) || (x !== null && a[i] !== null && String(x) === String(a[i]))) return a[i + 1]; }
      return a.length % 2 === 0 ? a[a.length - 1] : null;
    });
    F("GREATEST", function () { var a = [].slice.call(arguments); if (a.some(function (x) { return x === null; })) return null; return a.reduce(function (m, x) { return x > m ? x : m; }); });
    F("LEAST", function () { var a = [].slice.call(arguments); if (a.some(function (x) { return x === null; })) return null; return a.reduce(function (m, x) { return x < m ? x : m; }); });
    F("TO_CHAR", function (x, f) {
      if (x === null) return null;
      if (isDate(x) && (f === undefined || /[YMDHS]/i.test(f))) return fmtDate(x, f);
      if (typeof x === "number") return f ? fmtNum(x, f) : String(x);
      return String(x);
    });
    F("TO_DATE", function (s, f) { return parseDate(s, f); });
    F("TO_TIMESTAMP", function (s, f) { return parseDate(s, f); });
    F("TO_NUMBER", function (s) { if (s === null) return null; var n = Number(String(s).replace(/,/g, "").trim()); if (isNaN(n)) throw new Error("ORA-01722: 수치가 부적합합니다"); return n; });
    F("TRUNC", function (x, f) {
      if (x === null) return null;
      if (isDate(x) && (f === undefined || typeof f === "string")) return truncDate(x, f);
      var d = f === undefined ? 0 : f, k = Math.pow(10, d); return Math.trunc(x * k) / k;
    });
    F("ADD_MONTHS", function (d, n) { return d === null || n === null ? null : addMonths(d, n); });
    F("MONTHS_BETWEEN", function (a, b) { return a === null || b === null ? null : monthsBetween(a, b); });
    F("LAST_DAY", function (d) { if (d === null) return null; var p = dparts(d); return dv(p.y, p.m, lastDom(p.y, p.m), p.h, p.mi, p.s); });
    F("ORA_EXTRACT", function (part, d) {
      if (d === null) return null; var p = dparts(d);
      return { YEAR: p.y, MONTH: p.m, DAY: p.d, HOUR: p.h, MINUTE: p.mi, SECOND: p.s }[String(part).toUpperCase()];
    });
    F("INITCAP", function (s) { return s === null ? null : String(s).toLowerCase().replace(/(^|[^a-z0-9])([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); }); });
    F("LPAD", function (s, n, p) { if (s === null || n === null) return null; s = String(s); p = p === undefined ? " " : String(p); if (s.length >= n) return s.slice(0, n); var f = ""; while (f.length + s.length < n) f += p; return f.slice(0, n - s.length) + s; });
    F("RPAD", function (s, n, p) { if (s === null || n === null) return null; s = String(s); p = p === undefined ? " " : String(p); if (s.length >= n) return s.slice(0, n); var f = s; while (f.length < n) f += p; return f.slice(0, n); });
    F("ORA_SUBSTR", function (s, st, len) {
      if (s === null || st === null) return null; s = String(s); st = Math.trunc(st);
      if (st === 0) st = 1; var i = st > 0 ? st - 1 : s.length + st; if (i < 0) return null;
      var r = len === undefined ? s.slice(i) : (len < 1 ? "" : s.substr(i, Math.trunc(len))); return r === "" ? null : r;
    });
    F("ORA_INSTR", function (s, sub, pos, occ) {
      if (s === null || sub === null) return null; s = String(s); sub = String(sub); pos = pos === undefined ? 1 : pos; occ = occ === undefined ? 1 : occ;
      var i, found = 0;
      if (pos > 0) { for (i = pos - 1; i <= s.length - sub.length; i++) if (s.substr(i, sub.length) === sub && ++found === occ) return i + 1; }
      else { for (i = s.length + pos; i >= 0; i--) if (s.substr(i, sub.length) === sub && ++found === occ) return i + 1; }
      return 0;
    });
    F("ORA_REPLACE", function (s, a, b) { if (s === null) return null; if (a === null || a === "") return s; return String(s).split(String(a)).join(b === undefined || b === null ? "" : String(b)); });
    F("CHR", function (n) { return n === null ? null : String.fromCharCode(n); });
    F("MOD", function (a, b) { if (a === null || b === null) return null; return b === 0 ? a : a % b; });
    F("CEIL", function (x) { return x === null ? null : Math.ceil(x); });
    F("FLOOR", function (x) { return x === null ? null : Math.floor(x); });
    F("POWER", function (a, b) { return a === null || b === null ? null : Math.pow(a, b); });
    F("SQRT", function (x) { return x === null ? null : Math.sqrt(x); });
    F("SIGN", function (x) { return x === null ? null : Math.sign(x); });
    F("EXP", function (x) { return x === null ? null : Math.exp(x); });
    F("LN", function (x) { return x === null ? null : Math.log(x); });
    F("LOG", function (b, x) { return b === null || x === null ? null : Math.log(x) / Math.log(b); });
    F("REGEXP_LIKE", function (s, p, f) { if (s === null || p === null) return null; return oraRegex(p, f).test(String(s)) ? 1 : 0; });
    F("REGEXP_SUBSTR", function (s, p, pos, occ, f) {
      if (s === null || p === null) return null; s = String(s).slice((pos || 1) - 1); var re = oraRegex(p, f), m, n = 0; occ = occ || 1;
      while ((m = re.exec(s))) { if (++n === occ) return m[0]; if (m[0] === "") re.lastIndex++; } return null;
    });
    F("REGEXP_REPLACE", function (s, p, r, pos, occ, f) { if (s === null || p === null) return s; return String(s).replace(oraRegex(p, f), r === undefined || r === null ? "" : String(r).replace(/\\(\d)/g, "$$$1")); });
    F("REGEXP_COUNT", function (s, p, pos, f) { if (s === null || p === null) return null; var m = String(s).slice((pos || 1) - 1).match(oraRegex(p, f)); return m ? m.length : 0; });
    F("ORA_LENGTHB", function (s) { return s === null ? null : new TextEncoder().encode(String(s)).length; });
    F("USERENV", function () { return null; });

    if (db.create_aggregate) {
      var agg = function (name, fin) {
        db.create_aggregate(name, { init: function () { return []; }, step: function (st, v) { if (v !== null) st.push(v); return st; }, finalize: fin });
      };
      agg("MEDIAN", function (st) { if (!st || !st.length) return null; st.sort(function (a, b) { return a - b; }); var n = st.length; return n % 2 ? st[(n - 1) / 2] : (st[n / 2 - 1] + st[n / 2]) / 2; });
      var variance = function (st) { if (!st || st.length < 2) return st && st.length === 1 ? 0 : null; var m = st.reduce(function (a, b) { return a + b; }, 0) / st.length; return st.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0) / (st.length - 1); };
      agg("VARIANCE", variance);
      agg("STDDEV", function (st) { var v = variance(st); return v === null ? null : Math.sqrt(v); });
    }
  }

  /* ───────────── Oracle → SQLite 전처리 ───────────── */
  function matchParen(s, open) { var d = 0; for (var i = open; i < s.length; i++) { if (s[i] === "(") d++; else if (s[i] === ")") { d--; if (d === 0) return i; } } return -1; }

  function fixOrderBy(code) {
    var re = /\bORDER\s+BY\b/gi, m, starts = [];
    while ((m = re.exec(code))) starts.push(re.lastIndex);
    for (var k = starts.length - 1; k >= 0; k--) {
      var i = starts[k], d = 0, items = [], cur = i, end = code.length;
      for (var j = i; j < code.length; j++) {
        var c = code[j];
        if (c === "(") d++;
        else if (c === ")") { if (d === 0) { end = j; break; } d--; }
        else if (d === 0) {
          if (c === ",") { items.push([cur, j]); cur = j + 1; continue; }
          if (/[A-Za-z]/.test(c) && (j === 0 || /[^A-Za-z0-9_$#]/.test(code[j - 1]))) {
            if (/^(LIMIT|OFFSET|FETCH|ROWS|RANGE|GROUPS|UNION|INTERSECT|EXCEPT|FOR)\b/i.test(code.slice(j))) { end = j; break; }
          }
        }
      }
      items.push([cur, end]);
      var out = code.slice(0, i);
      for (var t = 0; t < items.length; t++) {
        var seg = code.slice(items[t][0], items[t][1]), trimmed = seg.replace(/\s+$/, ""), trail = seg.slice(trimmed.length);
        if (trimmed.trim() && !/\bNULLS\s+(FIRST|LAST)\b/i.test(trimmed)) trimmed += /\bDESC$/i.test(trimmed.trim()) ? " NULLS FIRST" : " NULLS LAST";
        out += trimmed + trail + (t < items.length - 1 ? "," : "");
      }
      code = out + code.slice(end);
    }
    return code;
  }

  function preprocess(sql) {
    var lits = [], code = "", i = 0, n = sql.length;
    while (i < n) {
      var c = sql[i];
      if (c === "'") { var j = i + 1, buf = "'"; while (j < n) { if (sql[j] === "'" && sql[j + 1] === "'") { buf += "''"; j += 2; continue; } if (sql[j] === "'") break; buf += sql[j++]; } if (j >= n) throw new Error("ORA-01756: 따옴표(')가 닫히지 않았습니다"); buf += "'"; lits.push(buf); code += "§" + (lits.length - 1) + "§"; i = j + 1; continue; }
      if (c === '"') { var e = sql.indexOf('"', i + 1); if (e < 0) throw new Error("ORA-01740: 큰따옴표(\")가 닫히지 않았습니다"); lits.push(sql.slice(i, e + 1)); code += "§" + (lits.length - 1) + "§"; i = e + 1; continue; }
      if (c === "-" && sql[i + 1] === "-") { var nl = sql.indexOf("\n", i); i = nl < 0 ? n : nl; continue; }
      if (c === "/" && sql[i + 1] === "*") { var ce = sql.indexOf("*/", i + 2); i = ce < 0 ? n : ce + 2; code += " "; continue; }
      code += c; i++;
    }
    code = code.replace(/[\s;\/]+$/g, "").trim();
    if (/;/.test(code)) throw new Error("한 번에 SQL 문장 하나만 실행할 수 있어요. 세미콜론(;)으로 여러 문장을 나누지 마세요.");
    if (!code) throw new Error("실행할 SQL이 없습니다.");
    var desc = code.match(/^DESC(?:RIBE)?\s+([A-Za-z0-9_$#.]+)$/i);
    if (desc) return { describe: desc[1].replace(/^.*\./, "").toUpperCase() };
    if (/\bROWNUM\b/i.test(code)) throw new Error("실습 엔진은 ROWNUM을 지원하지 않아요. 같은 결과를 FETCH FIRST n ROWS ONLY 또는 ROW_NUMBER() OVER(...)로 작성해 보세요. (실무에서도 12c+ 권장 문법)");
    if (/\bCONNECT\s+BY\b|\bSTART\s+WITH\b/i.test(code)) throw new Error("실습 엔진은 CONNECT BY 계층 쿼리를 지원하지 않아요. WITH 재귀 쿼리(Recursive WITH)로 작성해 보세요.");
    if (/\(\s*\+\s*\)/.test(code)) throw new Error("Oracle 전용 (+) 외부조인 표기는 지원하지 않아요. ANSI 표준 LEFT/RIGHT OUTER JOIN으로 작성해 보세요.");
    if (/\bWITH\s+TIES\b|\bPERCENT\s+ROWS\b/i.test(code)) throw new Error("FETCH ... WITH TIES / PERCENT 는 실습 엔진에서 지원하지 않아요.");
    if (/\bPIVOT\b/i.test(code)) throw new Error("PIVOT은 실습 엔진에서 지원하지 않아요. SUM(CASE WHEN ...) 방식으로 작성해 보세요.");
    // 날짜/타임스탬프 리터럴
    code = code.replace(/\b(DATE|TIMESTAMP)\s*(§\d+§)/gi, "TO_DATE($2)");
    // # 포함 식별자 (SERIAL#, GROUP#, THREAD# ...)
    code = code.replace(/(^|[^A-Za-z0-9_$#§])([A-Za-z_][A-Za-z0-9_$]*#[A-Za-z0-9_$#]*)/g, function (m, a, id) { return a + '"' + id.toUpperCase() + '"'; });
    code = code.replace(/\b(SYSDATE|SYSTIMESTAMP|CURRENT_DATE|CURRENT_TIMESTAMP|LOCALTIMESTAMP)\b(?!\s*\()/gi, "SYSDATE()");
    code = code.replace(/\bMINUS\b/gi, "EXCEPT");
    code = code.replace(/\bOFFSET\s+(\S+)\s+ROWS?\s+FETCH\s+(?:FIRST|NEXT)\s+(\S+)\s+ROWS?\s+ONLY\b/gi, "LIMIT $2 OFFSET $1");
    code = code.replace(/\bFETCH\s+(?:FIRST|NEXT)\s+ROWS?\s+ONLY\b/gi, "LIMIT 1");
    code = code.replace(/\bFETCH\s+(?:FIRST|NEXT)\s+(\S+)\s+ROWS?\s+ONLY\b/gi, "LIMIT $1");
    code = code.replace(/\bOFFSET\s+(\S+)\s+ROWS?\b/gi, "LIMIT -1 OFFSET $1");
    code = code.replace(/\bEXTRACT\s*\(\s*(YEAR|MONTH|DAY|HOUR|MINUTE|SECOND)\s+FROM\s+/gi, "ORA_EXTRACT('$1', ");
    code = code.replace(/\b(SUBSTR|INSTR|REPLACE|LENGTHB)\s*\(/gi, function (m, f) { return "ORA_" + f.toUpperCase() + "("; });
    code = code.replace(/\bNVL\s*\(/gi, "NVL(");
    // LISTAGG(x, sep) WITHIN GROUP (ORDER BY ...)  →  GROUP_CONCAT(x, sep ORDER BY ...)
    var lre = /\bLISTAGG\s*\(/i, lm;
    while ((lm = lre.exec(code))) {
      var op = code.indexOf("(", lm.index), cp = matchParen(code, op);
      if (cp < 0) break;
      var inner = code.slice(op + 1, cp), after = code.slice(cp + 1), wg = after.match(/^\s*WITHIN\s+GROUP\s*\(/i), ord = "", tailStart = cp + 1;
      if (wg) { var wo = cp + 1 + wg[0].length - 1, wc = matchParen(code, wo); ord = code.slice(wo + 1, wc).trim(); tailStart = wc + 1; }
      var dd = 0, comma = -1; for (var q = 0; q < inner.length; q++) { if (inner[q] === "(") dd++; else if (inner[q] === ")") dd--; else if (inner[q] === "," && dd === 0) { comma = q; break; } }
      var expr = comma < 0 ? inner : inner.slice(0, comma), sep = comma < 0 ? "''" : inner.slice(comma + 1);
      code = code.slice(0, lm.index) + "GROUP_CONCAT(" + expr + ", " + sep + (ord ? " " + ord : "") + ")" + code.slice(tailStart);
    }
    // 정수 나눗셈 방지 (Oracle은 5/2 = 2.5)
    code = code.replace(/\//g, "*1.0/");
    code = fixOrderBy(code);
    var out = code.replace(/§(\d+)§/g, function (m, k) { return lits[+k]; });
    return { sql: out };
  }

  /* ───────────── 결과 비교(채점) ───────────── */
  function normVal(v) {
    if (v === null || v === undefined) return "∅";
    if (typeof v === "number") return String(Math.round(v * 10000) / 10000);
    if (v instanceof Uint8Array) return "BLOB";
    return String(v);
  }
  function compare(user, ans, ordered) {
    if (!user) return { ok: false, why: "결과가 없습니다." };
    if (!user.values.length && ans.values.length) return { ok: false, why: "결과가 0행이에요. (정답 " + ans.values.length + "행) WHERE 조건을 확인하세요 — NOT IN 서브쿼리에 NULL이 섞여도 0행이 됩니다." };
    if (user.columns.length !== ans.columns.length) return { ok: false, why: "컬럼 개수가 달라요. (내 결과 " + user.columns.length + "개 / 정답 " + ans.columns.length + "개)" };
    if (user.values.length !== ans.values.length) return { ok: false, why: "행 개수가 달라요. (내 결과 " + user.values.length + "행 / 정답 " + ans.values.length + "행)" };
    var U = user.values.map(function (r) { return r.map(normVal).join("\u0001"); });
    var A = ans.values.map(function (r) { return r.map(normVal).join("\u0001"); });
    if (ordered) {
      for (var i = 0; i < A.length; i++) if (U[i] !== A[i]) {
        var su = U.slice().sort().join("\n"), sa = A.slice().sort().join("\n");
        if (su === sa) return { ok: false, why: "데이터는 맞는데 정렬 순서가 달라요. ORDER BY를 확인하세요." };
        return { ok: false, why: (i + 1) + "번째 행의 값이 달라요." };
      }
      return { ok: true };
    }
    U.sort(); A.sort();
    for (var k = 0; k < A.length; k++) if (U[k] !== A[k]) return { ok: false, why: "일부 행의 값이 달라요. 조건·계산·반올림 자릿수를 확인하세요." };
    return { ok: true };
  }

  /* ───────────── 엔진 ───────────── */
  function Engine(SQL, schemaBuilder) {
    this.SQL = SQL; this.schemaBuilder = schemaBuilder; this.reset();
  }
  Engine.prototype.reset = function () {
    if (this.db) try { this.db.close(); } catch (e) {}
    var now = new Date(Date.now() + 9 * 3600 * 1000);   // KST 벽시계
    this.ctx = { now: dv(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()) };
    this.db = new this.SQL.Database();
    this.db.run("PRAGMA case_sensitive_like = ON");
    registerFunctions(this.db, this.ctx);
    this.schemaBuilder(this.db, this.ctx, { dv: dv, D0: D0 });
  };
  Engine.prototype.run = function (sql) {
    var p = preprocess(sql);
    if (p.describe) return this.describe(p.describe);
    var t0 = Date.now(), res;
    try { res = this.db.exec(p.sql); }
    catch (e) { throw new Error(translateErr(e.message)); }
    var last = res.length ? res[res.length - 1] : null;
    var changes = this.db.getRowsModified ? this.db.getRowsModified() : 0;
    return { columns: last ? last.columns.map(prettyCol) : [], values: last ? last.values : [], ms: Date.now() - t0, changes: changes, isSelect: !!last, translated: p.sql };
  };
  Engine.prototype.describe = function (t) {
    var r = this.db.exec("PRAGMA table_info(\"" + t.replace(/"/g, "") + "\")");
    if (!r.length) { var v = this.db.exec("SELECT name FROM sqlite_master WHERE upper(name)='" + t.replace(/'/g, "") + "'"); if (!v.length) throw new Error("ORA-04043: " + t + " 객체가 존재하지 않습니다"); }
    return { columns: ["이름", "널?", "유형"], values: (r[0] ? r[0].values : []).map(function (x) { return [x[1], x[3] ? "NOT NULL" : "", x[2]]; }), ms: 0, isSelect: true, describe: true };
  };
  Engine.prototype.tables = function () {
    var r = this.db.exec("SELECT name, type FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY name");
    var self = this;
    return (r[0] ? r[0].values : []).map(function (x) {
      var cols = self.db.exec("PRAGMA table_info(\"" + x[0] + "\")");
      return { name: x[0], type: x[1], cols: cols[0] ? cols[0].values.map(function (c) { return [c[1], c[2]]; }) : [] };
    });
  };
  Engine.prototype.grade = function (userSql, answerSql, ordered) {
    var ans = this.run(answerSql), user = this.run(userSql);
    return { user: user, ans: ans, verdict: compare(user, ans, ordered) };
  };

  function prettyCol(c) {
    if (/^"[^"]*"$/.test(c)) return c.slice(1, -1);
    var lit = /'[^']*'/.test(c);
    c = c.replace(/\*1\.0\//g, "/").replace(/\s+NULLS\s+(FIRST|LAST)/gi, "").replace(/SYSDATE\(\)/gi, "SYSDATE")
      .replace(/ORA_EXTRACT\('(\w+)',\s*/gi, "EXTRACT($1 FROM ").replace(/\bORA_(\w+)\(/gi, "$1(")
      .replace(/"([A-Z0-9_$#]+)"/g, "$1").replace(/\bTO_DATE\(('[^']*')\)/g, "DATE $1")
      .replace(/GROUP_CONCAT\(/gi, "LISTAGG(");
    return lit ? c : c.toUpperCase();
  }

  function translateErr(m) {
    var x;
    if ((x = m.match(/no such table: (\S+)/i))) return "ORA-00942: 테이블 또는 뷰가 존재하지 않습니다 (" + x[1].toUpperCase() + ")";
    if ((x = m.match(/no such column: (\S+)/i))) return "ORA-00904: \"" + x[1].toUpperCase() + "\": 부적합한 식별자";
    if ((x = m.match(/no such function: (\S+)/i))) return "ORA-00904: \"" + x[1].toUpperCase() + "\": 실습 엔진에서 지원하지 않는 함수입니다";
    if ((x = m.match(/ambiguous column name: (\S+)/i))) return "ORA-00918: 열의 정의가 애매합니다 (" + x[1].toUpperCase() + ") — 테이블 별칭을 붙이세요";
    if (/misuse of aggregate/i.test(m)) return "ORA-00934: 그룹 함수는 허가되지 않습니다 (WHERE 절에서 집계함수 사용 불가 → HAVING 사용)";
    if (/must appear in the GROUP BY|not an aggregate/i.test(m)) return "ORA-00979: GROUP BY 표현식이 아닙니다";
    if ((x = m.match(/near "([^"]*)": syntax error/i))) return "ORA-00933/00936: SQL 구문 오류 — \"" + x[1] + "\" 근처를 확인하세요";
    if (/incomplete input/i.test(m)) return "ORA-00921: SQL 문이 완전하지 않습니다 (괄호·따옴표 확인)";
    if (/wrong number of arguments/i.test(m)) return "ORA-00909: 인수의 개수가 부적합합니다";
    if (/UNIQUE constraint failed/i.test(m)) return "ORA-00001: 무결성 제약 조건에 위배됩니다 (UNIQUE)";
    if (/NOT NULL constraint failed/i.test(m)) return "ORA-01400: NULL을 삽입할 수 없습니다";
    if (/SELECTs to the left and right of/i.test(m)) return "ORA-01789: 질의 블록의 결과 열 개수가 부정확합니다";
    return m;
  }

  root.DBBIG_ENGINE = { Engine: Engine, isDate: isDate, fmtDate: fmtDate, dv: dv, preprocess: preprocess, compare: compare };
})(typeof window !== "undefined" ? window : globalThis);
