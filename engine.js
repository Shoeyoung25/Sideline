/* Sideline: possession engine. No DOM. Runs one possession at a time on a full court.
   World: x 0..50 ft, y 0..94 ft. Team 0 attacks the hoop at y = 88.75, team 1 the hoop at y = 5.25.
   Plays use half-court coordinates (hx -25..25, hy = feet from the baseline of the hoop being attacked). */
(function (root) {
  'use strict';
  var CW = 50, CL = 94, RIMY = 5.25;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function dist(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }
  function pd(a, b) { return dist(a.x, a.y, b.x, b.y); }
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function h2w(team, hx, hy) { return team === 0 ? { x: 25 - hx, y: CL - hy } : { x: 25 + hx, y: hy }; }
  function w2h(team, x, y) { return team === 0 ? { hx: 25 - x, hy: CL - y } : { hx: x - 25, hy: y }; }
  function hoop(team) { return { x: 25, y: team === 0 ? CL - RIMY : RIMY }; }
  function unit(ax, ay, bx, by) { var dx = bx - ax, dy = by - ay, l = Math.sqrt(dx * dx + dy * dy) || 1; return { x: dx / l, y: dy / l, l: l }; }
  function segDist(px, py, ax, ay, bx, by, lo) {
    var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
    var u = clamp(((px - ax) * dx + (py - ay) * dy) / l2, lo || 0, 1);
    return dist(px, py, ax + dx * u, ay + dy * u);
  }
  var F5 = [[0, 30], [-18.5, 22], [18.5, 22], [-22.5, 6.5], [22.5, 6.5]];
  var F41 = [[0, 30], [-18.5, 22], [18.5, 22], [22.5, 6.5], [-7.5, 9.5]];
  var FHS = [[0, 31], [-19, 21], [22.5, 6.5], [-22.5, 6.5], [7, 19]];
  var SPOTS = [[0, 30], [-18.5, 22], [18.5, 22], [-22.5, 6.5], [22.5, 6.5], [-11, 28], [11, 28]];
  var ZONE = [[-9, 21], [9, 21], [-13, 9.5], [13, 9.5], [0, 8]];

  function Sim(teams, seed) {
    this.rand = mulberry(seed || 1);
    this.t = 0; this.P = []; this.score = [0, 0]; this.events = []; this.done = null;
    this.inbound = false; this.offTeam = 0; this.defTeam = 1; this.sc = 24;
    for (var tm = 0; tm < 2; tm++) for (var s = 0; s < 5; s++) {
      var src = teams[tm][s];
      this.P.push({ team: tm, slot: s, i: tm * 5 + s, name: src.tag || src.last || src.name, r: src.r,
        x: 25, y: 47, tx: 25, ty: 47, sp: 0.6, stun: 0, scrUntil: 0, scrPending: false, imm: {},
        driving: false, post: false, dribbled: false, mode: null, modeUntil: 0, vx: 0, vy: 0, drvEnd: 0 });
    }
    this.ball = { h: -1, x: 25, y: 47, z: 0, fly: null, reb: null };
    this.o = null; this.d = null;
  }
  Sim.prototype.op = function (s) { return this.P[this.offTeam * 5 + s]; };
  Sim.prototype.dp = function (s) { return this.P[this.defTeam * 5 + s]; };
  Sim.prototype.holder = function () { return this.ball.h >= 0 ? this.P[this.ball.h] : null; };
  Sim.prototype.ev = function (txt, kind) { this.events.push({ t: this.t, txt: txt, kind: kind || 'i' }); };
  Sim.prototype.offs = function () { var a = []; for (var s = 0; s < 5; s++) a.push(this.op(s)); return a; };
  Sim.prototype.defs = function () { var a = []; for (var s = 0; s < 5; s++) a.push(this.dp(s)); return a; };

  // place everyone for the opening possession
  Sim.prototype.begin = function (offTeam) {
    this.offTeam = offTeam; this.defTeam = 1 - offTeam;
    var o = [[0, 62], [-14, 54], [14, 54], [-18, 46], [18, 46]], d = [[0, 40], [-12, 36], [12, 36], [-14, 28], [14, 28]];
    for (var s = 0; s < 5; s++) {
      var a = h2w(offTeam, o[s][0], o[s][1]), p = this.op(s); p.x = p.tx = a.x; p.y = p.ty = a.y;
      var b = h2w(offTeam, d[s][0], d[s][1]), q = this.dp(s); q.x = q.tx = b.x; q.y = q.ty = b.y;
    }
    this.ball.h = this.op(0).i; this.ball.x = this.op(0).x; this.ball.y = this.op(0).y;
  };

  Sim.prototype.startPossession = function (offTeam, po, pdn) {
    var self = this, i, p;
    this.offTeam = offTeam; this.defTeam = 1 - offTeam; this.done = null; this.sc = 24;
    for (i = 0; i < 10; i++) { p = this.P[i]; p.stun = 0; p.scrUntil = 0; p.scrPending = false; p.imm = {}; p.driving = false; p.post = false; p.dribbled = false; p.mode = null; p.tx = p.x; p.ty = p.y; }
    this.ball.fly = null; this.ball.reb = null;
    var offs = this.offs();
    if (this.inbound || this.ball.h < 0 || this.P[this.ball.h].team !== offTeam) {
      // inbound under the hoop this team defends
      var own = hoop(1 - offTeam), best = offs[0];
      offs.forEach(function (q) { if (pd(q, own) < pd(best, own)) best = q; });
      best.x = best.tx = own.x + 7; best.y = best.ty = own.y + (offTeam === 0 ? -4.5 : 4.5);
      this.ball.h = best.i; this.inbound = false; this.wasInbound = true;
    } else this.wasInbound = false;
    var plays = (po.plays || []).filter(function (q) { return q && q.beats && q.beats.length; });
    var hd = 0;
    if (plays.length) hd = plays[0].ball || 0;
    else { var bp = -1; offs.forEach(function (q) { if (q.r.ply > bp) { bp = q.r.ply; hd = q.slot; } }); if (po.style === 'iso' && po.focus != null) hd = po.focus; }
    var setup = plays.length ? plays[0].setup : (po.style === 'pnr' ? FHS : po.style === 'post' ? F41 : F5);
    setup = setup.map(function (q) { return [q[0], q[1]]; });
    if (!plays.length && hd !== 0) { var tmp = setup[0]; setup[0] = setup[hd]; setup[hd] = tmp; }
    this.o = { style: po.style || 'motion', tempo: po.tempo || 'set', focus: po.focus == null ? null : po.focus, after: po.after || 'crash',
      plays: plays, pi: -1, beats: null, bi: 0, bt: 0, minT: 0.3, phase: 'adv', think: 0, handler: hd, setup: setup, t0: this.t, arrT: null,
      free: false, gen: false, forced: false, crossed: false, nextTC: this.t + 0.15, fb: -1, drives: 0, passes: 0, lastBallScreen: -9,
      pendingRead: false, liveQ: null, reset: null, lastStyle: -1, fails: 0, ho: null, opt: null, soc: -1 };
    if (this.wasInbound) this.o.nextTC = this.t + 2.5;
    var style = pdn.style || 'man';
    if (style === 'mix') style = ['man', 'switch', 'zone'][Math.floor(this.rand() * 3)];
    var assign = (pdn.match || [0, 1, 2, 3, 4]).slice();
    // repair to a permutation
    var seen = {}, ok = assign.length === 5; assign.forEach(function (a) { if (seen[a] || a < 0 || a > 4) ok = false; seen[a] = 1; });
    if (!ok) assign = [0, 1, 2, 3, 4];
    var defs = this.defs().slice().sort(function (a, b) { return a.r.size - b.r.size || b.r.spd - a.r.spd; });
    var zs = {}; defs.forEach(function (q, k) { zs[q.slot] = k; });
    this.d = { style: style, shown: style, assign: assign, cover: style === 'switch' ? 'switch' : (pdn.cover || 'drop'), press: pdn.press || 'normal', pp: pdn.pp || {},
      help: pdn.help || 'help', after: pdn.after || 'box', rule: pdn.rule || null, dbl: null, dblBy: -1, watch: {}, mv: {}, contest: {}, gamble: {},
      deny: {}, ppRule: {}, ruleSwitch: false, zs: zs };
    if (style !== pdn.style) this.d.shown = style;
  };

  Sim.prototype.guardOf = function (p) {
    var d = this.d, j, best = null, bd = 1e9;
    if (d.style !== 'zone') { for (j = 0; j < 5; j++) if (d.assign[j] === p.slot) return this.dp(j); }
    for (j = 0; j < 5; j++) { var q = this.dp(j), dd = pd(q, p); if (dd < bd) { bd = dd; best = q; } }
    return best;
  };

  // ---------- shooting ----------
  Sim.prototype.shotInfo = function (p, closeBy) {
    var hp = hoop(this.offTeam), h = w2h(this.offTeam, p.x, p.y), d = pd(p, hp), r = p.r, defs = this.defs();
    var isThree = d >= 23.75 || (Math.abs(h.hx) >= 22 && h.hy < 14.2);
    var type = d < 5.5 ? 'rim' : isThree ? 'three' : d < 11 ? 'short' : 'mid';
    var n1 = null, d1 = 99, d2 = 99, n2 = null, k, dd;
    for (k = 0; k < 5; k++) {
      var q = defs[k]; dd = pd(q, p) + (q.stun > 0.15 ? 1.6 : 0);
      if (closeBy) dd = Math.max(type === 'rim' ? 0.9 : 1.3, dd - closeBy);
      if (dd < d1) { d2 = d1; n2 = n1; d1 = dd; n1 = q; } else if (dd < d2) { d2 = dd; n2 = q; }
    }
    var pm, pts = isThree ? 3 : 2, pf = 0;
    function rimC(q, dd2) { return dd2 >= 4.6 ? 0 : (1 - dd2 / 4.6) * clamp(0.10 + ((q.r.rim * 0.65 + q.r.blk * 0.35) - 50) / 49 * 0.17 + (q.r.size - r.size) * 0.022, 0.03, 0.34); }
    if (type === 'rim') {
      pm = 0.60 + (r.ins - 75) * 0.006;
      pm -= rimC(n1, d1) + (this.d && this.d.style === 'zone' ? 0.9 : this.d && this.d.help === 'help' ? 0.85 : 0.5) * rimC(n2, d2);
      if (d1 >= 6) pm += 0.14;
      if (d1 < 3.6) pf = 0.11 + Math.min(0.1, r.fta * 0.011);
    } else {
      var base;
      if (type === 'three') base = 0.352 + (r.three - 70) * 0.0043 - Math.max(0, d - 26) * 0.012;
      else if (type === 'short') base = 0.43 + (r.ins - 75) * 0.004;
      else base = 0.40 + (r.mid - 76) * 0.004;
      var c = 0;
      if (d1 >= 6) c = -0.05;
      else { c = (1 - d1 / 6) * clamp(0.17 + (n1.r.pd - 60) / 40 * 0.07 + (n1.r.size - r.size) * 0.015, 0.07, 0.3); }
      pm = base - c;
      if (p.dribbled) pm -= 0.035;
      if (type === 'short' && d1 < 3) pf = 0.07 + Math.min(0.06, r.fta * 0.006);
    }
    if (this.sc < 5) pm -= (99 - r.cmp) / 99 * 0.06; // rushed shots punish shaky players
    pm = clamp(pm, 0.08, 0.92);
    var ev = (1 - pf) * pm * pts + pf * 2 * r.ft;
    return { ev: ev, pm: pm, pts: pts, pf: pf, type: type, d1: d1, n1: n1, dist: d };
  };

  Sim.prototype.shoot = function (p) {
    var s = this.shotInfo(p), o = this.o, hp = hoop(this.offTeam), self = this;
    o.beats = null; p.driving = false;
    var label = s.type === 'three' ? 'three' : s.type === 'rim' ? 'at the rim' : s.type === 'short' ? 'in the paint' : 'jumper';
    if (this.rand() < s.pf) {
      var made = 0; for (var k = 0; k < 2; k++) if (this.rand() < p.r.ft) made++;
      this.score[this.offTeam] += made;
      this.ev(p.name + ' is fouled by ' + s.n1.name + '. ' + made + ' of 2 free throws.', made ? 'score' : 'miss');
      this.finish('ft', made, true); return;
    }
    var make = this.rand() < s.pm;
    (this.shots = this.shots || []).push([s.type, make ? 1 : 0, Math.round(s.d1)]);
    var blocked = !make && s.type === 'rim' && s.d1 < 3 && this.rand() < 0.14 + s.n1.r.blk / 400;
    this.ball.h = -1;
    this.ball.fly = { type: 'shot', fx: p.x, fy: p.y, tx: hp.x, ty: hp.y, t0: this.t, dur: 0.5 + s.dist / 42, make: make, pts: s.pts, shooter: p.i, label: label, blocked: blocked ? s.n1.name : null, open: s.d1 >= 6 };
    this.crashAndBox(p);
  };

  Sim.prototype.crashAndBox = function (shooter) {
    var o = this.o, d = this.d, off = this.offTeam, hp = hoop(off), self = this, k;
    var mates = this.offs().filter(function (q) { return q !== shooter; }).sort(function (a, b) { return pd(a, hp) - pd(b, hp); });
    var nCrash = o.after === 'crash' ? 3 : 1;
    mates.forEach(function (q, idx) {
      q.scrUntil = 0; q.scrPending = false;
      if (idx < nCrash) { var ang = (idx - 1) * 1.1, u = unit(hp.x, hp.y, q.x, q.y); q.tx = hp.x + (u.x * Math.cos(ang) - u.y * Math.sin(ang)) * 5.5; q.ty = hp.y + (u.y * Math.cos(ang) + u.x * Math.sin(ang)) * 5.5; q.sp = 0.95; }
      else if (o.after === 'back') { var hh = w2h(off, q.x, q.y), w = h2w(off, hh.hx * 0.6, 50 + idx * 5); q.tx = w.x; q.ty = w.y; q.sp = 0.85; }
    });
    if (o.after === 'back') { var sh = w2h(off, shooter.x, shooter.y), sw = h2w(off, sh.hx * 0.6, Math.max(sh.hy, 44)); shooter.tx = sw.x; shooter.ty = sw.y; shooter.sp = 0.7; }
    var defs = this.defs(), leaker = null;
    if (d.after === 'leak') { defs.forEach(function (q) { if (q.stun <= 0 && (!leaker || pd(q, hp) > pd(leaker, hp))) leaker = q; }); }
    defs.forEach(function (q) {
      q.mode = null;
      if (q === leaker) { var hh = w2h(off, q.x, q.y), w = h2w(off, hh.hx * 0.4, 78); q.tx = w.x; q.ty = w.y; q.sp = 1; return; }
      var m = null, bd = 1e9; self.offs().forEach(function (x) { var dd = pd(x, q); if (dd < bd) { bd = dd; m = x; } });
      var u = unit(hp.x, hp.y, m.x, m.y), rr = clamp(u.l - 2.5, 2.5, 6.5);
      q.tx = hp.x + u.x * rr; q.ty = hp.y + u.y * rr; q.sp = 0.95;
    });
    this.leaker = leaker;
  };

  Sim.prototype.resolveRebound = function () {
    var self = this, o = this.o, d = this.d, hp = hoop(this.offTeam);
    var ang = this.rand() * Math.PI * 2, rr = 2 + this.rand() * 5;
    var bx = clamp(hp.x + Math.cos(ang) * rr, 2, 48), by = hp.y + Math.abs(Math.sin(ang)) * rr * (this.offTeam === 0 ? -1 : 1);
    var tot = 0, w = [];
    this.P.forEach(function (p) {
      var dd = dist(p.x, p.y, bx, by), prox = 1 / (1 + Math.pow(dd / 5.5, 2));
      var tf = p.team === self.offTeam ? (o.after === 'crash' ? 0.62 : 0.5) : (d.after === 'box' ? 1.3 : 1.12) * (d.style === 'zone' ? 0.88 : 1);
      if (p === self.leaker) tf = 0.02;
      var v = Math.pow((p.r.reb * 0.85 + p.r.str * 0.15) / 70, 2.4) * prox * tf * (p.stun > 0 ? 0.6 : 1) + 0.0005;
      w.push(v); tot += v;
    });
    var roll = this.rand() * tot, pick = 0;
    for (var k = 0; k < 10; k++) { roll -= w[k]; if (roll <= 0) { pick = k; break; } }
    var p = this.P[pick];
    this.ball.reb = null; this.ball.h = p.i; this.ball.x = p.x; this.ball.y = p.y; this.ball.z = 0; p.dribbled = false;
    if (p.team === this.offTeam) {
      this.ev(p.name + ' grabs the offensive rebound.', 'i');
      this.sc = 14; o.beats = null; o.ho = null; o.opt = null; o.free = true; o.forced = false; o.gen = false; o.think = 0.4; o.phase = 'run'; o.drives = 0; o.pendingRead = false; o.liveQ = null;
      this.offs().forEach(function (q) { q.driving = false; q.post = false; });
    } else {
      this.ev(p.name + ' rebounds.', 'i');
      this.finish('dreb', 0, false);
    }
  };

  Sim.prototype.finish = function (type, pts, inbound) {
    this.done = { type: type, pts: pts || 0 }; this.inbound = !!inbound;
    this.ball.fly = null; this.ball.reb = null;
    if (inbound) { this.ball.h = -1; var hp = hoop(this.offTeam); this.ball.x = hp.x; this.ball.y = hp.y; this.ball.z = 0; }
    this.P.forEach(function (p) { p.driving = false; p.post = false; p.scrUntil = 0; p.scrPending = false; p.mode = null; if (inbound || p.sp < 0.9) { p.tx = p.x; p.ty = p.y; } });
  };

  Sim.prototype.turnover = function (txt, by) {
    var self = this;
    if (!by) { var bd = 1e9; this.defs().forEach(function (q) { var dd = dist(q.x, q.y, self.ball.x, self.ball.y); if (dd < bd) { bd = dd; by = q; } }); }
    this.ev(txt, 'to');
    this.ball.fly = null; this.ball.h = by.i; this.ball.x = by.x; this.ball.y = by.y; this.ball.z = 0;
    this.finish('to', 0, false);
  };

  // ---------- passing ----------
  Sim.prototype.doubled = function (p) {
    var n = 0; this.defs().forEach(function (q) { if (q.stun <= 0 && pd(q, p) < 4) n++; }); return n >= 2;
  };
  Sim.prototype.passRisk = function (H, T) {
    var d = this.d, l = pd(H, T), risk = 0.005 + l / 1600 + Math.max(0, l - 24) / 220 + (99 - H.r.pas) / 99 * 0.028, self = this;
    this.defs().forEach(function (q) {
      if (q.stun > 0.1) return;
      var near = pd(q, H) < 4;
      var sd = segDist(q.x, q.y, H.x, H.y, T.x, T.y, 0.22);
      if (sd < 2.6 && !near) { var m = (1 - sd / 2.6) * (0.11 + ((q.r.stl * 0.6 + q.r.diq * 0.4) - 62) / 40 * 0.07); if (d.deny[T.slot] || d.gamble[q.slot] > self.t) m *= 1.7; risk += m; }
      if (near) risk += 0.012;
    });
    if (this.doubled(H)) risk += 0.06;
    return clamp(risk, 0.005, 0.9);
  };
  Sim.prototype.pass = function (H, T) {
    var risk = this.passRisk(H, T), o = this.o, self = this;
    H.driving = false; H.post = false; o.passes++;
    if (this.rand() < risk) {
      var by = null, bd = 1e9; this.defs().forEach(function (q) { var sd = segDist(q.x, q.y, H.x, H.y, T.x, T.y, 0.18); if (sd < bd) { bd = sd; by = q; } });
      if (bd < 4) this.turnover(by.name + ' picks off the pass from ' + H.name + '.', by);
      else this.turnover(H.name + ' throws it away.', null);
      return false;
    }
    var l = pd(H, T);
    this.ball.h = -1; this.ball.fly = { type: 'pass', fx: H.x, fy: H.y, tx: T.x, ty: T.y, t0: this.t, dur: Math.max(0.16, l / 38 + Math.max(0, l - 24) / 70), to: T.i };
    return true;
  };
  Sim.prototype.catchEV = function (H, T) {
    var l0 = pd(H, T), fl = l0 / 38 + Math.max(0, l0 - 24) / 70 + 0.3, close = Math.max(0, fl - 0.22) * 11.5;
    var was = T.dribbled; T.dribbled = false; var s = this.shotInfo(T, close); T.dribbled = was; return s.ev;
  };

  // ---------- driving ----------
  Sim.prototype.pBeat = function (H, G, post) {
    if (!G) return 0.95;
    if (G.stun > 0.2 || pd(G, H) > 7.5) return 0.92;
    var d = this.d, p;
    if (post) p = 0.42 + ((H.r.ins + H.r.str * 0.5 + H.r.size * 4) - (G.r.rim + G.r.str * 0.5 + G.r.size * 4)) / 140 - (d.style === 'zone' ? 0.16 : 0);
    else {
      p = 0.36 + clamp(((H.r.hnd * 0.6 + H.r.spd * 0.4) - (G.r.pd * 0.65 + G.r.spd * 0.35)) / 110, -0.17, 0.17);
      var pr = d.ppRule[H.slot] || d.pp[H.slot] || d.press;
      if (d.contest[G.slot] > this.t) p += 0.16; else if (pr === 'tight') p += 0.18; else if (pr === 'sag') p -= 0.2;
      var hp = hoop(this.offTeam), u = unit(G.x, G.y, H.x, H.y);
      if (G.vx * u.x + G.vy * u.y > 8) p += 0.18; // closing out hard
      if (d.style === 'zone') p -= 0.12;
    }
    return clamp(p, 0.08, 0.9);
  };
  Sim.prototype.driveEV = function (H) {
    var o = this.o, d = this.d, hp = hoop(this.offTeam), dr = pd(H, hp);
    if (dr < 7.5) return -9;
    var G = this.guardOf(H), pb = this.pBeat(H, G, false), p0 = 0.60 + (H.r.ins - 75) * 0.006, hc = 0;
    this.defs().forEach(function (q) { if (q === G) return; if (pd(q, hp) < 8.5) hc = Math.max(hc, 0.55 * clamp(0.10 + (q.r.rim - 50) / 49 * 0.17, 0.03, 0.3)); });
    if (d.help === 'help' && d.style !== 'zone') hc = Math.max(hc, 0.11);
    var evb = clamp(p0 - hc - 0.04, 0.2, 0.9) * 2 * 0.88 + 0.12 * 2 * H.r.ft;
    var ev = pb * evb + (1 - pb) * 0.7 - 0.06 - 0.14 * o.drives;
    if (H.r.hnd < 66 && H.r.size >= 4) ev -= 0.15;
    return ev;
  };
  Sim.prototype.startDrive = function (p, tx, ty, post) {
    var o = this.o, G = this.guardOf(p), hp = hoop(this.offTeam);
    o.drives++;
    if (!post) for (var si = 0; si < 5; si++) { var S = this.op(si); if (S !== p && S.scrUntil > this.t && pd(S, p) < 6 && G) { this.applyScreen(G, S, p, p, this.d.style === 'zone'); G = this.guardOf(p); } }
    var ps = 0.012 + Math.max(0, (G ? G.r.stl - p.r.hnd : 0)) / 700 + (this.doubled(p) ? 0.05 : 0);
    if (G && pd(G, p) < 6 && this.rand() < ps) { this.turnover(G.name + ' strips ' + p.name + '.', G); return false; }
    var beaten = this.rand() < this.pBeat(p, G, post);
    p.driving = true; p.post = !!post; p.dribbled = true; p.drvEnd = this.t + 2.6; p.scrUntil = 0;
    if (beaten) { if (G && pd(G, p) < 7.5) G.stun = Math.max(G.stun, 0.5 + this.rand() * 0.25); p.tx = tx; p.ty = ty; p.sp = 0.88; }
    else {
      var nx = p.x + (tx - p.x) * 0.55, ny = p.y + (ty - p.y) * 0.55, minR = post ? 6.5 : 9.5, dr = dist(nx, ny, hp.x, hp.y);
      if (dr < minR) { var u = unit(hp.x, hp.y, p.x, p.y); nx = hp.x + u.x * minR; ny = hp.y + u.y * minR; }
      p.tx = nx; p.ty = ny; p.sp = 0.55;
    }
    return true;
  };

  // ---------- offense brain ----------
  Sim.prototype.spaceOthers = function (busy) {
    var off = this.offTeam, self = this, taken = [], H = this.holder();
    var act = busy.map(function (s) { var q = self.op(s); return w2h(off, q.tx, q.ty); });
    this.offs().forEach(function (q) {
      if (busy.indexOf(q.slot) >= 0 || q === H) return;
      var h = w2h(off, q.x, q.y), best = -1, bd = 1e9;
      SPOTS.forEach(function (sp, k) {
        if (taken.indexOf(k) >= 0) return;
        for (var a = 0; a < act.length; a++) if (dist(sp[0], sp[1], act[a].hx, act[a].hy) < 9) return;
        if (H) { var hh = w2h(off, H.x, H.y); if (dist(sp[0], sp[1], hh.hx, hh.hy) < 9) return; }
        var dd = dist(sp[0], sp[1], h.hx, h.hy); if (dd < bd) { bd = dd; best = k; }
      });
      if (best >= 0) { taken.push(best); var w = h2w(off, SPOTS[best][0], SPOTS[best][1]); q.tx = w.x; q.ty = w.y; q.sp = 0.7; q.scrUntil = 0; q.scrPending = false; }
    });
  };

  Sim.prototype.genPnr = function (a, b) {
    var off = this.offTeam, H = this.holder(), A = this.op(a), B = this.op(b), beats = [];
    if (H !== A) beats.push([{ k: 'pass', s: H.slot, to: a }]);
    var h = w2h(off, A.x, A.y); if (h.hy < 20) h = { hx: h.hx * 0.6, hy: 27 };
    var side = h.hx >= 0 ? -1 : 1; if (Math.abs(h.hx) < 5) side = this.rand() < 0.5 ? -1 : 1;
    var pre = [{ k: 'scr', s: b, x: h.hx + side * 3.5, y: h.hy - 1.5 }];
    if (dist(h.hx, h.hy, w2h(off, A.x, A.y).hx, w2h(off, A.x, A.y).hy) > 3) pre.push({ k: H === A ? 'drv' : 'mv', s: a, x: h.hx, y: h.hy, soft: 1 });
    beats.push(pre);
    var pop = B.r.three >= 74 && B.r.three > B.r.ins - 12;
    beats.push([{ k: 'drv', s: a, x: h.hx * 0.3 + side * 8, y: Math.max(13, h.hy - 13) },
      pop ? { k: 'mv', s: b, x: h.hx - side * 10, y: 27 } : { k: 'mv', s: b, x: -side * 1.5, y: 8 }]);
    return { beats: beats, busy: [a, b] };
  };

  Sim.prototype.styleAction = function () {
    var o = this.o, off = this.offTeam, H = this.holder(), self = this, offs = this.offs(), beats = [], busy = [H.slot];
    var hh = w2h(off, H.x, H.y), style = o.style, others = offs.filter(function (q) { return q !== H; });
    function bestBy(arr, f) { var b = arr[0]; arr.forEach(function (q) { if (f(q) > f(b)) b = q; }); return b; }
    if (o.drives >= 2 && style !== 'motion') { // nothing there: swing it out and start again
      var outs = others.filter(function (q) { return pd(q, hoop(off)) > 15 && self.passRisk(H, q) < 0.25; });
      if (outs.length) { var out = bestBy(outs, function (q) { return -self.passRisk(H, q) * 100 + q.r.ply * 0.05; }); o.drives = 0; o.beats = [[{ k: 'pass', s: H.slot, to: out.slot }]]; o.gen = true; o.bi = 0; this.spaceOthers([H.slot, out.slot]); if (!this.startBeat(0)) { o.beats = null; o.think = 0.3; o.fails++; } return; }
    }
    if (style === 'pnr') {
      var hd = o.focus != null ? this.op(o.focus) : (H.r.ply >= 68 ? H : bestBy(offs, function (q) { return q.r.ply; }));
      if (hd !== H && this.passRisk(H, hd) > 0.3) hd = H;
      var scr = bestBy(offs.filter(function (q) { return q !== hd; }), function (q) { return q.r.size * 20 + q.r.ins * 0.3 - pd(q, hd) * 0.4; });
      var g = this.genPnr(hd.slot, scr.slot); beats = g.beats; busy = g.busy.concat([H.slot]);
    } else if (style === 'iso') {
      var star = o.focus != null ? this.op(o.focus) : bestBy(offs, function (q) { return q.r.ins * 0.5 + q.r.ply * 0.5; });
      if (star !== H) { if (this.passRisk(H, star) < 0.3) beats.push([{ k: 'pass', s: H.slot, to: star.slot }]); else star = H; }
      var sh = w2h(off, star.x, star.y), side = sh.hx >= 0 ? 1 : -1;
      beats.push([{ k: 'drv', s: star.slot, x: side * 2.5, y: 8 }]); busy = [star.slot, H.slot];
    } else if (style === 'post') {
      var big = o.focus != null ? this.op(o.focus) : bestBy(offs, function (q) { return q.r.ins + q.r.size * 9; });
      var bside = hh.hx >= 0 ? 1 : -1;
      if (big === H) { if (pd(H, hoop(off)) > 13) beats.push([{ k: 'drv', s: H.slot, x: bside * 7.5, y: 9.5, soft: 1 }]); }
      else { beats.push([{ k: 'mv', s: big.slot, x: bside * 7.5, y: 9.5 }]); beats.push([{ k: 'pass', s: H.slot, to: big.slot }]); }
      beats.push([{ k: 'drv', s: big.slot, x: bside * 2.5, y: 6.5, post: 1 }]); busy = [big.slot, H.slot];
    } else if (style === 'dnk') {
      var drv = H;
      if (H.r.ply < 66 || o.drives > 1) { var alt = bestBy(others, function (q) { return q.r.ply - pd(q, hoop(off)) * 0.2; }); if (this.passRisk(H, alt) < 0.3) { beats.push([{ k: 'pass', s: H.slot, to: alt.slot }]); drv = alt; } }
      var dh = w2h(off, drv.x, drv.y);
      beats.push([{ k: 'drv', s: drv.slot, x: (dh.hx >= 0 ? 1 : -1) * 2.5, y: 9 }]); busy = [drv.slot, H.slot];
    } else { // motion
      var pick = Math.floor(this.rand() * 3); if (pick === o.lastStyle) pick = (pick + 1) % 3; o.lastStyle = pick;
      var near = others.slice().sort(function (a, b) { return pd(a, H) - pd(b, H); });
      var rec = null; for (var k = 0; k < near.length; k++) if (this.passRisk(H, near[k]) < 0.22 && pd(near[k], hoop(off)) > 14) { rec = near[k]; break; }
      if (pick === 0 && rec) { // pass and cut
        beats.push([{ k: 'pass', s: H.slot, to: rec.slot }, { k: 'mv', s: H.slot, x: hh.hx > 0 ? 2 : -2, y: 7 }]); busy = [H.slot, rec.slot];
      } else if (pick === 1) { // screen away for the best shooter
        var shooter = bestBy(others, function (q) { return q.r.three + pd(q, H) * 0.5; });
        var scr2 = bestBy(others.filter(function (q) { return q !== shooter; }), function (q) { return q.r.size * 10 - pd(q, shooter); });
        var s2 = w2h(off, shooter.x, shooter.y), wing = { x: (s2.hx >= 0 ? 1 : -1) * 17, y: 23.5 };
        if (dist(s2.hx, s2.hy, wing.x, wing.y) < 6) wing = { x: (s2.hx >= 0 ? 1 : -1) * 22.5, y: 7 };
        beats.push([{ k: 'scr', s: scr2.slot, x: (s2.hx + wing.x) / 2 + (s2.hx >= 0 ? -1.5 : 1.5), y: (s2.hy + wing.y) / 2 }]);
        beats.push([{ k: 'mv', s: shooter.slot, x: wing.x, y: wing.y }]); busy = [H.slot, shooter.slot, scr2.slot];
      } else if (rec) { // swing
        beats.push([{ k: 'pass', s: H.slot, to: rec.slot }]); busy = [H.slot, rec.slot];
      } else { beats.push([{ k: 'drv', s: H.slot, x: hh.hx * 0.3, y: 12 }]); }
    }
    if (!beats.length) beats.push([{ k: 'drv', s: H.slot, x: hh.hx * 0.3, y: 12 }]);
    o.beats = beats; o.gen = true; o.bi = 0;
    this.spaceOthers(busy);
    if (!this.startBeat(0)) { o.beats = null; o.think = 0.3; o.fails++; }
  };

  Sim.prototype.decide = function (onlyGood) {
    var o = this.o, H = this.holder(), self = this, force = this.sc <= 4.2;
    var thr = force ? -9 : (this.sc > 14 ? 1.07 : this.sc > 8 ? 0.99 : 0.88) - Math.min(0.3, 0.09 * o.drives + 0.06 * o.fails);
    var fog = (99 - H.r.oiq) / 99 * 0.3; function nz() { return (self.rand() - 0.5) * 2 * fog; } // low IQ misreads the floor
    var best = { k: 'sh', ev: this.shotInfo(H).ev + nz() };
    this.offs().forEach(function (T) {
      if (T === H) return;
      var risk = self.passRisk(H, T); if (risk > 0.3) return;
      var ev = (1 - risk) * self.catchEV(H, T) - risk * 1.0 - 0.03 - 0.015 * o.passes - (force ? 0.12 : 0) + nz();
      if (ev > best.ev) best = { k: 'pass', T: T, ev: ev };
    });
    if (this.sc > 2.6) { var dv = this.driveEV(H) + nz(); if (dv > best.ev) best = { k: 'drv', ev: dv }; }
    if (best.ev >= thr) {
      if (best.k === 'sh') this.shoot(H);
      else if (best.k === 'pass') { this.pass(H, best.T); o.think = 0.3; }
      else {
        var h = w2h(this.offTeam, H.x, H.y), w = h2w(this.offTeam, clamp(h.hx * 0.15, -3, 3), 7);
        o.beats = [[{ k: 'drv', s: H.slot, x: clamp(h.hx * 0.15, -3, 3), y: 7 }]]; o.gen = true; o.bi = 0;
        if (!this.startBeat(0)) { o.beats = null; o.think = 0.3; }
      }
      return true;
    }
    if (onlyGood) return false;
    this.styleAction();
    return true;
  };

  Sim.prototype.setPath = function (p, c) { // c: control point in half-court coords, or nothing for a straight line
    p.path = null; if (!c) return;
    var cw = h2w(this.offTeam, c[0], c[1]), pts = [], x0 = p.x, y0 = p.y;
    [0.2, 0.4, 0.6, 0.8].forEach(function (u) { var a = (1 - u) * (1 - u), b = 2 * u * (1 - u), d2 = u * u; pts.push([clamp(a * x0 + b * cw.x + d2 * p.tx, 1.5, 48.5), clamp(a * y0 + b * cw.y + d2 * p.ty, 1.5, 92.5)]); });
    p.path = { pts: pts, ex: p.tx, ey: p.ty };
  };
  // ordered reads drawn into a play: take the first option that is really there
  Sim.prototype.tryOptions = function () {
    var o = this.o, H = this.holder(), op = o.opt, k;
    if (!H || H.slot !== op.s) { o.opt = null; this.breakPlay(); return; }
    for (k = 0; k < op.list.length; k++) {
      var q = op.list[k];
      if (q.k === 'pass') { var T = this.op(q.to); if (T && T !== H && this.passRisk(H, T) < 0.26 && this.catchEV(H, T) >= 0.9) { o.opt = null; o.beats = null; o.gen = false; o.soc = T.slot; this.ev(H.name + ' finds ' + T.name + '.', 'play'); this.pass(H, T); o.think = 0.3; return; } }
      else if (q.k === 'sh') { if (this.shotInfo(H).ev >= 0.88) { o.opt = null; this.shoot(H); return; } }
      else if (q.k === 'drv') { if (this.driveEV(H) >= 0.95) { o.opt = null; var hh = w2h(this.offTeam, H.x, H.y); o.beats = [[{ k: 'drv', s: H.slot, x: clamp(hh.hx * 0.15, -3, 3), y: 7 }]]; o.gen = true; o.bi = 0; if (!this.startBeat(0)) { o.beats = null; o.think = 0.3; } return; } }
    }
    if (this.t - op.t > 1.3) { o.opt = null; this.breakPlay(); }
  };
  Sim.prototype.startBeat = function (i) {
    var o = this.o, off = this.offTeam, movers = [], k, a, p, w, H;
    var ord = { pass: 0, ho: 0.5, drv: 1, sh: 2, opt: 2.5, scr: 3, mv: 4 }, b = o.beats[i].slice().sort(function (x, y) { return ord[x.k] - ord[y.k]; });
    for (k = 0; k < b.length; k++) {
      a = b[k]; p = this.op(a.s); H = this.holder();
      if (a.k === 'pass') {
        if (H !== p) return false;
        var T = this.op(a.to); if (!T || T === p) return false;
        if (this.passRisk(H, T) > (o.gen ? 0.3 : 0.26)) return false;
        if (!this.pass(H, T)) return true; // turnover ends it
      } else if (a.k === 'sh') {
        if (H !== p) return false;
        if (!o.gen && this.sc > 6 && this.shotInfo(p).ev < 0.52) return false;
        this.shoot(p); return true;
      } else if (a.k === 'drv') {
        if (H !== p) return false;
        w = h2w(off, a.x, a.y);
        if (a.soft) { p.tx = w.x; p.ty = w.y; p.sp = 0.7; p.dribbled = true; }
        else if (!this.startDrive(p, w.x, w.y, a.post)) return true;
        else if (a.c && p.tx === w.x && p.ty === w.y) this.setPath(p, a.c);
        movers.push(p);
      } else if (a.k === 'ho') {
        if (H !== p) return false;
        var R = this.op(a.to); if (!R || R === p) return false;
        R.tx = p.x; R.ty = p.y; R.sp = 0.9; R.scrUntil = 0; R.scrPending = false; this.setPath(R, a.c);
        p.tx = p.x; p.ty = p.y; o.ho = { g: p, r: R };
      } else if (a.k === 'opt') {
        if (H !== p) return false;
        o.opt = { s: p.slot, list: a.list || [], t: this.t };
      } else if (a.k === 'mv' || a.k === 'scr') {
        w = h2w(off, a.x, a.y); p.tx = clamp(w.x, 1.5, 48.5); p.ty = clamp(w.y, 1.5, 92.5); p.sp = a.k === 'mv' ? 0.92 : 0.85; p.scrUntil = 0; p.scrPending = a.k === 'scr'; this.setPath(p, a.c);
        movers.push(p);
      }
    }
    o.bt = this.t; o.movers = movers; o.minT = 0.3;
    return true;
  };

  Sim.prototype.runBeats = function () {
    var o = this.o, el = this.t - o.bt, all = true, k;
    if (o.ho) { // handoff: the ball changes hands when the receiver brushes past, and the giver acts as a screen
      var hg = o.ho.g, hr = o.ho.r;
      if (pd(hg, hr) < 2.8) {
        o.ho = null; this.ball.h = hr.i; hr.dribbled = true; hr.tx = hr.x; hr.ty = hr.y; hr.path = null; hg.scrUntil = this.t + 1.0;
        var gd = this.guardOf(hr); if (gd) this.applyScreen(gd, hg, hr, hr, this.d.style === 'zone');
        this.ev(hg.name + ' hands off to ' + hr.name + '.', 'play'); o.bt = this.t - 0.2; return;
      }
      if (el > 3.4) { o.ho = null; this.breakPlay(); }
      return;
    }
    if (o.opt) { this.tryOptions(); return; }
    for (k = 0; k < o.movers.length; k++) { var p = o.movers[k]; if (dist(p.x, p.y, p.tx, p.ty) > 1.3) all = false; if (p.scrPending) all = false; }
    if ((all && el >= o.minT) || el > 3.2) {
      o.movers.forEach(function (q) { q.driving = false; });
      o.bi++;
      if (o.bi >= o.beats.length) { o.beats = null; o.think = 0.22; if (!o.gen) o.pendingRead = true; o.gen = false; return; }
      if (!this.startBeat(o.bi)) this.breakPlay();
    }
  };
  Sim.prototype.breakPlay = function () {
    var o = this.o;
    if (!o.gen) this.ev('The play gets broken up.', 'i');
    o.beats = null; o.gen = false; o.think = 0.3; o.pendingRead = false; o.ho = null; o.opt = null;
    this.offs().forEach(function (q) { q.driving = false; q.scrPending = false; });
  };

  Sim.prototype.loadPlay = function (i) {
    var o = this.o, play = o.plays[i], off = this.offTeam, self = this;
    o.pi = i; o.phase = 'reset'; o.reset = { t: this.t, passed: false };
    this.offs().forEach(function (q) { var w = h2w(off, play.setup[q.slot][0], play.setup[q.slot][1]); q.tx = w.x; q.ty = w.y; q.sp = 0.8; q.scrUntil = 0; q.scrPending = false; q.driving = false; });
    this.ev('Running ' + play.name + '.', 'play');
  };
  Sim.prototype.resetStep = function () {
    var o = this.o, play = o.plays[o.pi], H = this.holder(), all = true, self = this;
    this.offs().forEach(function (q) { if (dist(q.x, q.y, q.tx, q.ty) > 2.2) all = false; });
    if (!all && this.t - o.reset.t < 2.4) return;
    if (H.slot !== (play.ball || 0)) {
      var T = this.op(play.ball || 0);
      if (!o.reset.passed && this.passRisk(H, T) < 0.34) { o.reset.passed = true; this.pass(H, T); return; }
      o.phase = 'run'; this.breakPlay(); return;
    }
    o.phase = 'run'; o.beats = play.beats; o.gen = false; o.bi = 0;
    if (!this.startBeat(0)) this.breakPlay();
  };

  Sim.prototype.fastBreak = function (H) {
    var o = this.o;
    o.phase = 'run'; o.free = true; o.fb = -1; o.gen = true; o.bi = 0;
    o.beats = [[{ k: 'drv', s: H.slot, x: 0, y: 6.8 }]];
    this.ev('Fast break! ' + H.name + ' is out in front.', 'play');
    if (!this.startBeat(0)) { o.beats = null; }
  };
  Sim.prototype.transition = function () {
    var H = this.holder(), hp = hoop(this.offTeam), self = this, dH = pd(H, hp);
    if (dH < 24) return false;
    var dd = this.defs().map(function (q) { return pd(q, hp); });
    function back(T) { var dT = pd(T, hp), n = 0; dd.forEach(function (v) { if (v < dT + 1.5) n++; }); return n; }
    if (back(H) === 0 && H.r.ply >= 45) { this.fastBreak(H); return true; }
    var best = null;
    this.offs().forEach(function (T) { if (T === H) return; var dT = pd(T, hp); if (dT < dH - 12 && back(T) === 0 && (!best || dT < pd(best, hp))) best = T; });
    if (best && this.passRisk(H, best) + (pd(H, best) > 40 ? 0.08 : 0) < 0.38) { this.o.fb = best.slot; this.pass(H, best); return true; }
    return false;
  };

  Sim.prototype.advance = function (dt) {
    var o = this.o, d = this.d, off = this.offTeam, H = this.holder(), self = this;
    if (o.fb === H.slot) { this.fastBreak(H); return; }
    if (this.t >= o.nextTC) { o.nextTC = this.t + 0.3; if (this.transition()) return; }
    var hd = this.op(o.handler), fast = o.tempo === 'push' || (d.style === 'press' && !o.crossed);
    if (H !== hd) {
      if (this.t - o.t0 > 3.5) { o.handler = H.slot; hd = H; }
      else {
        var hh = w2h(off, H.x, H.y), tg = h2w(off, clamp(hh.hx + (hh.hx > 0 ? -10 : 10), -20, 20), Math.max(hh.hy - 16, 30));
        hd.tx = tg.x; hd.ty = tg.y; hd.sp = 0.9; H.tx = H.x; H.ty = H.y;
        if (pd(H, hd) < 26 && this.t - o.t0 > 0.5 && this.passRisk(H, hd) < 0.3) { this.pass(H, hd); return; }
      }
    }
    this.offs().forEach(function (q) {
      if (q !== hd && q !== H) { var w = h2w(off, o.setup[q.slot][0], o.setup[q.slot][1]); q.tx = w.x; q.ty = w.y; q.sp = fast ? 1 : 0.75; }
    });
    if (H === hd) {
      var sw = h2w(off, o.setup[hd.slot][0], o.setup[hd.slot][1]); H.tx = sw.x; H.ty = sw.y; H.sp = fast ? 0.92 : 0.64; H.dribbled = true;
      var h2 = w2h(off, H.x, H.y);
      if (d.style === 'press' && !o.crossed) {
        var G = this.guardOf(H);
        if (h2.hy > 47 && G && pd(G, H) < 5.5) { var rate = clamp(0.03 * (1 + (G.r.stl - H.r.hnd) / 45), 0.01, 0.09); if (this.rand() < rate * dt) { this.turnover(G.name + ' steals it in the press.', G); return; } }
      }
      if (!o.crossed && h2.hy < 47) { o.crossed = true; if (d.style === 'press') { this.defs().forEach(function (q) { q.stun = Math.max(q.stun, 0.55); }); this.ev('The press is broken.', 'i'); } }
      if (pd(H, sw) < 2.5) {
        if (o.arrT == null) o.arrT = this.t;
        var set = true; this.offs().forEach(function (q) { if (dist(q.x, q.y, q.tx, q.ty) > 5) set = false; });
        if (o.tempo === 'push' || set || this.t - o.arrT > 1.8) {
          o.phase = 'run'; o.think = 0.15;
          if (o.plays.length) this.loadPlay(0);
        }
      }
    }
  };

  Sim.prototype.updOffense = function (dt) {
    var o = this.o, H = this.holder();
    if (this.ball.fly || this.ball.reb || !H) return;
    if (o.phase === 'adv') { this.advance(dt); return; }
    if (this.sc <= 4.2 && !o.forced) { o.forced = true; o.beats = null; o.ho = null; o.opt = null; this.offs().forEach(function (q) { q.driving = false; }); o.phase = 'run'; o.think = Math.min(o.think, 0.05); o.free = true; }
    if (o.phase === 'reset') { this.resetStep(); return; }
    if (o.liveQ && !o.forced) {
      var c = o.liveQ; o.liveQ = null;
      var g = this.genPnr(c.a, c.b); o.beats = g.beats; o.gen = true; o.bi = 0; o.free = true; o.pendingRead = false;
      this.spaceOthers(g.busy.concat([H.slot]));
      if (!this.startBeat(0)) { o.beats = null; o.think = 0.3; }
      return;
    }
    if (o.beats) { this.runBeats(); return; }
    o.think -= dt; if (o.think > 0) return;
    if (o.soc === H.slot) { o.soc = -1; o.free = true; if (this.shotInfo(H).ev >= 0.8) { this.shoot(H); return; } }
    if (o.pendingRead) { o.pendingRead = false; if (this.decide(true)) return; }
    if (!o.free && !o.forced && o.pi + 1 < o.plays.length) { this.loadPlay(o.pi + 1); return; }
    o.free = true; this.decide(false);
  };

  // ---------- defense ----------
  Sim.prototype.applyRule = function (H) {
    var d = this.d, r = d.rule, hp = hoop(this.offTeam);
    d.deny = {}; d.ppRule = {}; d.ruleSwitch = false; d.ruleDbl = -1;
    if (!r) return;
    var cond = false, who = r.wo == null ? null : r.wo;
    if (r.w === 'always') cond = true;
    else if (!H) cond = false;
    else if (who != null && H.slot !== who) cond = false;
    else if (r.w === 'ball') cond = true;
    else if (r.w === 'drive') cond = H.driving && !H.post;
    else if (r.w === 'post') cond = H.post || (pd(H, hp) < 11.5 && !H.driving && H.r.size >= 3);
    else if (r.w === 'screen') cond = this.t - this.o.lastBallScreen < 2.5;
    if (!cond) return;
    var tgt = r.ao != null ? r.ao : (who != null ? who : (H ? H.slot : null));
    if (r.a === 'switch') d.ruleSwitch = true;
    if (tgt == null) return;
    if (r.a === 'double') d.ruleDbl = tgt;
    else if (r.a === 'deny') d.deny[tgt] = true;
    else if (r.a === 'sag' || r.a === 'tight') d.ppRule[tgt] = r.a;
  };

  Sim.prototype.updDefense = function (dt) {
    if ((this.ball.fly && this.ball.fly.type === 'shot') || this.ball.reb) return;
    var d = this.d, o = this.o, off = this.offTeam, hp = hoop(off), H = this.holder(), self = this, t = this.t, j;
    var bx = this.ball.x, by = this.ball.y;
    this.applyRule(H);
    var zone = d.style === 'zone', pressing = d.style === 'press' && !o.crossed;
    // double team target
    var dt2 = -1;
    if (H) { if (d.dbl && d.dbl.until > t && d.dbl.o === H.slot) dt2 = H.slot; else if (d.ruleDbl === H.slot) dt2 = H.slot; }
    if (dt2 < 0) d.dblBy = -1;
    else if (d.dblBy < 0 || this.dp(d.dblBy) === this.guardOf(H)) {
      var g0 = this.guardOf(H), bd = 1e9; d.dblBy = -1;
      for (j = 0; j < 5; j++) { var q0 = this.dp(j); if (q0 === g0 || q0.stun > 0) continue; var dd0 = pd(q0, H); if (dd0 < bd) { bd = dd0; d.dblBy = j; } }
    }
    // help on a drive
    var helper = null;
    if (H && H.driving && (d.help === 'help' || zone)) {
      var gH = this.guardOf(H), hb = 16, u0 = unit(hp.x, hp.y, H.x, H.y), sx = hp.x + u0.x * 4.5, sy = hp.y + u0.y * 4.5;
      for (j = 0; j < 5; j++) { var q1 = this.dp(j); if (q1 === gH || j === d.dblBy || q1.stun > 0) continue; var d1 = dist(q1.x, q1.y, sx, sy); if (d1 < hb) { hb = d1; helper = q1; } }
    }
    // matchup zone: attackers nearest the ball get the nearest free perimeter defender, the biggest man stays home
    var zBall = -1, zMan = {};
    if (zone) {
      var free = [0, 1, 2, 3, 4].filter(function (jj) { return d.zs[jj] !== 4 && self.dp(jj).stun <= 0; });
      var atk = this.offs().filter(function (q) { return pd(q, hp) > 9 && pd(q, hp) < 34; }).sort(function (a, b) { return (a === H ? -1 : dist(a.x, a.y, bx, by)) - (b === H ? -1 : dist(b.x, b.y, bx, by)); });
      atk.forEach(function (q) {
        if (!free.length) return;
        var bi2 = 0, bd2 = 1e9; free.forEach(function (jj, k2) { var dd2 = pd(self.dp(jj), q); if (dd2 < bd2) { bd2 = dd2; bi2 = k2; } });
        var jj2 = free.splice(bi2, 1)[0];
        if (q === H) zBall = jj2; else zMan[jj2] = q;
      });
    }
    for (j = 0; j < 5; j++) {
      var D = this.dp(j), tx, ty, u, r;
      if (d.mv[j] && d.mv[j].until > t) { tx = d.mv[j].x; ty = d.mv[j].y; }
      else if (D.mode && D.modeUntil > t && H) {
        if (D.mode === 'drop') { u = unit(hp.x, hp.y, bx, by); tx = hp.x + u.x * 8.5; ty = hp.y + u.y * 8.5; }
        else { u = unit(H.x, H.y, hp.x, hp.y); tx = H.x + u.x * 2.2; ty = H.y + u.y * 2.2; }
      }
      else if (dt2 >= 0 && d.dblBy === j) { var X = this.op(dt2); u = unit(X.x, X.y, hp.x, hp.y); tx = X.x + u.x * 1.8 - u.y * 1.6; ty = X.y + u.y * 1.8 + u.x * 1.6; }
      else if (helper === D) { u = unit(hp.x, hp.y, H.x, H.y); tx = hp.x + u.x * 4.5; ty = hp.y + u.y * 4.5; }
      else if (zone) {
        if (zBall === j) { u = unit(H.x, H.y, hp.x, hp.y); tx = H.x + u.x * 3.2; ty = H.y + u.y * 3.2; }
        else {
          var zp = h2w(off, ZONE[d.zs[j]][0], ZONE[d.zs[j]][1]); tx = zp.x + (bx - zp.x) * 0.3; ty = zp.y + (by - zp.y) * 0.3;
          var zn = zMan[j];
          if (zn) { var uz = unit(zn.x, zn.y, hp.x, hp.y), sh2 = d.zs[j] === 4 ? 0.2 : 0.72; tx += (zn.x + uz.x * 3.4 - tx) * sh2; ty += (zn.y + uz.y * 3.4 - ty) * sh2; }
        }
      } else {
        var M = this.op(d.assign[j]), pr = d.ppRule[M.slot] || d.pp[M.slot] || d.press;
        if (d.contest[j] > t) pr = 'contest';
        u = unit(hp.x, hp.y, M.x, M.y); var dm = u.l;
        if (H === M) {
          var dOn = pr === 'sag' ? 4.3 : pr === 'tight' ? 1.9 : pr === 'contest' ? 1.4 : 3.2;
          r = dm - dOn; if (!pressing) r = Math.min(r, 26.5); r = Math.max(r, 1.5);
          tx = hp.x + u.x * r; ty = hp.y + u.y * r;
        } else {
          var dOff = pr === 'sag' ? 3.6 : pr === 'tight' ? 2.2 : pr === 'contest' ? 1.6 : 3.4;
          r = Math.max(1.5, Math.min(dm - dOff, pressing ? 999 : 25));
          var bxp = hp.x + u.x * r, byp = hp.y + u.y * r;
          var mb = dist(M.x, M.y, bx, by), hf = (d.help === 'help' ? 0.3 : 0.1) * clamp(mb / 22, 0.2, 1) * (pr === 'tight' || pr === 'contest' ? 0.5 : 1);
          if (pressing) hf = 0;
          var ub = unit(hp.x, hp.y, bx, by), hx = hp.x + ub.x * 6, hy = hp.y + ub.y * 6;
          tx = bxp + (hx - bxp) * hf; ty = byp + (hy - byp) * hf;
          if ((d.deny[M.slot] || d.gamble[j] > t) && !pressing) { var um = unit(M.x, M.y, bx, by); tx = M.x + um.x * 2.6 + (-u.x) * 0.8; ty = M.y + um.y * 2.6 + (-u.y) * 0.8; }
          if (d.watch[j] && d.watch[j].until > t) { var W = this.op(d.watch[j].o), uw = unit(W.x, W.y, hp.x, hp.y); tx = (tx + W.x + uw.x * 3) / 2; ty = (ty + W.y + uw.y * 3) / 2; }
        }
      }
      var tau = 0.12 + (99 - D.r.diq) / 99 * 0.3, k = 1 - Math.exp(-dt / tau);
      D.tx += (clamp(tx, 1, 49) - D.tx) * k; D.ty += (clamp(ty, 1, 93) - D.ty) * k; D.sp = 0.97;
    }
    this.screens(H, zone);
  };

  Sim.prototype.applyScreen = function (D, S, U, H, zone) {
    var d = this.d, o = this.o, t = this.t;
    if ((D.imm[S.slot] || 0) > t || D === this.guardOf(S) && !zone) return;
    D.imm[S.slot] = t + 2.8;
    if (zone) { D.stun = Math.max(D.stun, 0.3); return; }
    var D2 = this.guardOf(S), onBall = H === U;
    if (onBall) o.lastBallScreen = t;
    var rs = !!d.rule && d.rule.a === 'switch' && (d.rule.wo == null || d.rule.wo === U.slot) && (d.rule.w !== 'drive' && d.rule.w !== 'post');
    var cov = onBall ? (rs ? 'switch' : d.cover) : (d.style === 'switch' || rs ? 'switch' : 'fight');
    if (cov === 'switch' && D2 && D2 !== D) { var a = d.assign[D.slot]; d.assign[D.slot] = d.assign[D2.slot]; d.assign[D2.slot] = a; D.tx = S.x; D.ty = S.y; D2.tx = U.x; D2.ty = U.y; d.contest[D.slot] = t + 2.5; D2.imm[S.slot] = t + 2.8; this.nScr = (this.nScr || 0) + 1; return; }
    this.nScr = (this.nScr || 0) + 1;
    if (!onBall) D.stun = Math.max(D.stun, clamp(0.5 + (S.r.str - D.r.str) / 120, 0.3, 0.9));
    else if (cov === 'drop') { D.stun = Math.max(D.stun, 0.5); if (D2) { D2.mode = 'drop'; D2.modeUntil = t + 2.0; } }
    else if (cov === 'hedge') { D.stun = Math.max(D.stun, 0.4); if (D2) { D2.mode = 'hedge'; D2.modeUntil = t + 0.9; } }
    else if (cov === 'trap') { D.stun = Math.max(D.stun, 0.2); d.dbl = { o: U.slot, until: t + 2.6 }; d.dblBy = D2 ? D2.slot : -1; }
    else D.stun = Math.max(D.stun, 0.45);
  };
  Sim.prototype.screens = function (H, zone) {
    var t = this.t, s, u;
    for (s = 0; s < 5; s++) {
      var S = this.op(s); if (!(S.scrUntil > t)) continue;
      for (u = 0; u < 5; u++) {
        if (u === s) continue;
        var U = this.op(u); if (pd(U, S) > 4.2 || (U.vx * U.vx + U.vy * U.vy) < 16) continue;
        var G = this.guardOf(U); if (!G || pd(G, U) > 12) continue;
        this.applyScreen(G, S, U, H, zone);
      }
    }
  };

  // ---------- movement and ball ----------
  Sim.prototype.move = function (dt) {
    var t = this.t, H = this.holder(), hedged = false, self = this;
    if (H && this.d) this.defs().forEach(function (q) { if (q.mode === 'hedge' && q.modeUntil > t && pd(q, H) < 3.6) hedged = true; });
    for (var i = 0; i < 10; i++) {
      var p = this.P[i], v = (10 + p.r.spd / 99 * 6) * p.sp;
      if (p.stun > 0) { p.stun -= dt; v *= 0.2; }
      if (p === H && hedged) v *= 0.45;
      if (p.scrUntil > t) v = 0;
      var gx = p.tx, gy = p.ty;
      if (p.path) { // follow a drawn curve: waypoints first, then the end point
        if (p.path.ex !== p.tx || p.path.ey !== p.ty) p.path = null;
        else { while (p.path.pts.length && dist(p.x, p.y, p.path.pts[0][0], p.path.pts[0][1]) < 1.4) p.path.pts.shift(); if (p.path.pts.length) { gx = p.path.pts[0][0]; gy = p.path.pts[0][1]; } else p.path = null; }
      }
      var dx = gx - p.x, dy = gy - p.y, l0 = Math.sqrt(dx * dx + dy * dy), ox = p.x, oy = p.y;
      if (l0 > 0.05) { var st = Math.min(l0, v * dt); p.x += dx / l0 * st; p.y += dy / l0 * st; }
      var l = dist(p.x, p.y, p.tx, p.ty);
      p.x = clamp(p.x, 0.8, 49.2); p.y = clamp(p.y, 0.8, 93.2);
      p.vx = (p.x - ox) / dt; p.vy = (p.y - oy) / dt;
      if (p.scrPending && l < 1) { p.scrPending = false; p.scrUntil = t + 2.6; }
      if (p.driving && (l < 1 || t > p.drvEnd)) { /* cleared by the beat runner */ }
    }
  };

  Sim.prototype.updBall = function () {
    var b = this.ball, f = b.fly, t = this.t;
    if (f) {
      var u = clamp((t - f.t0) / f.dur, 0, 1);
      if (f.type === 'pass') { var T = this.P[f.to]; f.tx = T.x; f.ty = T.y; }
      b.x = f.fx + (f.tx - f.fx) * u; b.y = f.fy + (f.ty - f.fy) * u; b.z = f.type === 'shot' ? Math.sin(u * Math.PI) * 9 + u * 3 : 1;
      if (u >= 1) {
        if (f.type === 'pass') { b.fly = null; b.h = f.to; b.z = 0; this.P[f.to].dribbled = false; this.o.think = Math.max(this.o.think, 0.28); }
        else {
          var sh = this.P[f.shooter];
          if (f.make) {
            this.score[this.offTeam] += f.pts;
            this.ev(sh.name + (f.pts === 3 ? ' hits the three' : f.label === 'at the rim' ? ' scores at the rim' : f.label === 'in the paint' ? ' scores in the paint' : ' hits the jumper') + (f.open ? ', wide open.' : '.'), 'score');
            this.finish('make', f.pts, true);
          } else {
            this.ev(f.blocked ? f.blocked + ' blocks ' + sh.name + '!' : sh.name + ' misses the ' + (f.pts === 3 ? 'three.' : f.label === 'jumper' ? 'jumper.' : 'shot ' + f.label + '.'), 'miss');
            b.fly = null; b.reb = { at: t + 0.45 }; b.z = 2;
          }
        }
      }
      return;
    }
    if (b.reb) { if (t >= b.reb.at) this.resolveRebound(); return; }
    var H = this.holder();
    if (H) { b.x = H.x; b.y = H.y; b.z = 0; }
  };

  Sim.prototype.step = function (dt) {
    this.t += dt;
    if (this.done) { this.move(dt); var H0 = this.holder(); if (H0) { this.ball.x = H0.x; this.ball.y = H0.y; } return; }
    if (!this.ball.reb && !(this.ball.fly && this.ball.fly.type === 'shot')) this.sc -= dt;
    this.updBall();
    if (this.done) return;
    this.updOffense(dt);
    if (this.done) return;
    this.updDefense(dt);
    this.move(dt);
    if (this.sc <= 0 && !this.done && !this.ball.reb && !(this.ball.fly && this.ball.fly.type === 'shot')) this.turnover('Shot clock violation.', null);
  };

  // ---------- live calls ----------
  Sim.prototype.call = function (team, c) {
    if (this.done || !this.o) return false;
    var o = this.o, d = this.d, t = this.t, H = this.holder(), off = this.offTeam;
    if (team === off) {
      if (c.k === 'off') { o.plays = []; o.free = true; o.pendingRead = false; if (o.phase === 'reset') o.phase = 'run'; if (o.beats && !o.gen) { o.beats = null; o.think = 0.2; } o.ho = null; o.opt = null; this.ev('Play called off. Freelance.', 'call'); return true; }
      if (c.k === 'pnr') { if (c.a === c.b || c.a == null || c.b == null) return false; if (o.phase === 'adv') { o.plays = []; } if (o.phase === 'reset') o.phase = 'run'; o.liveQ = { a: c.a, b: c.b }; if (o.beats && !this.ball.fly) { o.beats = null; o.ho = null; o.opt = null; } this.ev('Coach calls a pick and roll: ' + this.op(c.a).name + ' and ' + this.op(c.b).name + '.', 'call'); return true; }
      if (c.k === 'cut') { var p = this.op(c.s); if (!p || p === H) return false; var hh = w2h(off, p.x, p.y), w = h2w(off, hh.hx > 0 ? 2.5 : -2.5, 7); p.tx = w.x; p.ty = w.y; p.sp = 1; p.scrUntil = 0; p.scrPending = false; if (!o.beats) o.think = Math.max(o.think, 0.55); this.ev(p.name + ' cuts to the rim.', 'call'); return true; }
      return false;
    }
    if (c.k === 'match') { var k = d.assign.indexOf(c.o); if (k < 0 || c.d == null) return false; d.assign[k] = d.assign[c.d]; d.assign[c.d] = c.o; this.ev(this.dp(c.d).name + ' switches onto ' + this.op(c.o).name + '.', 'call'); return true; }
    if (c.k === 'double') { d.dbl = { o: c.o, until: t + 6 }; d.dblBy = -1; this.ev('Defense sends a double at ' + this.op(c.o).name + '.', 'call'); return true; }
    if (c.k === 'contest') { d.contest[c.d] = t + 3.5; this.ev(this.dp(c.d).name + ' crowds his man.', 'call'); return true; }
    if (c.k === 'move') { d.mv[c.d] = { x: clamp(c.x, 1, 49), y: clamp(c.y, 1, 93), until: t + 3.5 }; return true; }
    if (c.k === 'watch') { d.watch[c.d] = { o: c.o, until: t + 5 }; this.ev(this.dp(c.d).name + ' shades toward ' + this.op(c.o).name + '.', 'call'); return true; }
    if (c.k === 'steal') {
      var D = this.dp(c.d); if (!D) return false;
      if (H && !this.ball.fly && pd(D, H) < 6) {
        var ps = clamp(0.11 + (D.r.stl - H.r.hnd) / 200 + (H.driving ? 0.03 : 0), 0.03, 0.32);
        if (this.rand() < ps) { this.turnover(D.name + ' goes for the steal and gets it!', D); }
        else if (this.rand() < 0.15) { var made = 0; for (var q = 0; q < 2; q++) if (this.rand() < H.r.ft) made++; this.score[off] += made; this.ev(D.name + ' reaches in. Foul. ' + H.name + ' makes ' + made + ' of 2.', made ? 'score' : 'miss'); this.finish('ft', made, true); }
        else { D.stun = 1.0; this.ev(D.name + ' gambles for the steal and misses.', 'call'); }
      } else { d.gamble[c.d] = t + 2.5; this.ev(D.name + ' jumps the passing lane.', 'call'); }
      return true;
    }
    return false;
  };

  // compact state for drawing and for sending to the other phone
  Sim.prototype.frame = function () {
    var a = [Math.round(this.sc * 10), Math.round(this.ball.x * 10), Math.round(this.ball.y * 10), Math.round(this.ball.z * 10), this.ball.h], t = this.t;
    for (var i = 0; i < 10; i++) { var p = this.P[i]; a.push(Math.round(p.x * 10), Math.round(p.y * 10), (p.scrUntil > t ? 1 : 0) + (p.stun > 0 ? 2 : 0)); }
    return a;
  };

  var E = { Sim: Sim, h2w: h2w, w2h: w2h, hoop: hoop, CW: CW, CL: CL, RIMY: RIMY };
  root.BBEngine = E;
  if (typeof module !== 'undefined') module.exports = E;
})(typeof window !== 'undefined' ? window : globalThis);
