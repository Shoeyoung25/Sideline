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
    this.box = []; for (var bi = 0; bi < 10; bi++) this.box.push([0, 0, 0, 0, 0, 0, 0]); // pts, reb, ast, fgm, fga, stl, to
  }
  Sim.prototype.op = function (s) { return this.P[this.offTeam * 5 + s]; };
  Sim.prototype.dp = function (s) { return this.P[this.defTeam * 5 + s]; };
  Sim.prototype.holder = function () { return this.ball.h >= 0 ? this.P[this.ball.h] : null; };
  // codes: 1 screened, 2 switch, 3 beat his man, 4 cut off, 5 double, 6 open, 7 denied, 8 trap
  Sim.prototype.tag = function (c, p) { if (!p) return; this.tags = (this.tags || []).filter(function (q) { return q.i !== p.i; }); this.tags.push({ c: c, i: p.i, t: this.t }); if (this.tags.length > 3) this.tags.shift(); };
  Sim.prototype.ev = function (txt, kind) { this.events.push({ t: this.t, txt: txt, kind: kind || 'i' }); };
  Sim.prototype.offs = function () { var a = []; for (var s = 0; s < 5; s++) a.push(this.op(s)); return a; };
  Sim.prototype.defs = function () { var a = []; for (var s = 0; s < 5; s++) a.push(this.dp(s)); return a; };

  // place everyone for the opening possession
  Sim.prototype.begin = function (offTeam) {
    this.offTeam = offTeam; this.defTeam = 1 - offTeam;
    var o = [[0, 64], [-17, 56], [17, 56], [-21, 49], [21, 49]], d = [[0, 44], [-16, 40], [16, 40], [-19, 34], [19, 34]];
    for (var s = 0; s < 5; s++) {
      var a = h2w(offTeam, o[s][0], o[s][1]), p = this.op(s); p.x = p.tx = a.x; p.y = p.ty = a.y;
      var b = h2w(offTeam, d[s][0], d[s][1]), q = this.dp(s); q.x = q.tx = b.x; q.y = q.ty = b.y;
    }
    this.ball.h = this.op(0).i; this.ball.x = this.op(0).x; this.ball.y = this.op(0).y;
  };

  // startPossession clears lastShot below
  Sim.prototype.startPossession = function (offTeam, po, pdn) {
    var self = this, i, p;
    this.offTeam = offTeam; this.defTeam = 1 - offTeam; this.done = null; this.sc = 20;
    for (i = 0; i < 10; i++) { p = this.P[i]; p.lay = false; p.stun = 0; p.trailUntil = 0; p.reactUntil = 0; p.stripAt = 0; p.path = null; p.scrUntil = 0; p.scrPending = false; p.imm = {}; p.driving = false; p.post = false; p.dribbled = false; p.mode = null; p.tx = p.x; p.ty = p.y; }
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
    // every possession starts with a sideline inbound in the half court
    var side = this.rand() < 0.5 ? -1 : 1, inb = -1, ib = 1e9, hpI = hoop(offTeam);
    for (i = 0; i < 5; i++) { if (i === hd) continue; var sc0 = Math.abs(setup[i][0] - side * 25) + Math.abs(setup[i][1] - 28) * 0.6; if (sc0 < ib) { ib = sc0; inb = i; } }
    offs.forEach(function (q) { var sp = q.slot === inb ? [side * 25, 28] : setup[q.slot], w = h2w(offTeam, sp[0], sp[1]); q.x = q.tx = w.x; q.y = q.ty = w.y; q.cvx = q.cvy = 0; });
    var amap = (pdn.match && pdn.match.length === 5 ? pdn.match : [0, 1, 2, 3, 4]);
    this.defs().forEach(function (q) { var O = self.op(amap[q.slot] != null ? amap[q.slot] : q.slot) || self.op(q.slot), u = unit(O.x, O.y, hpI.x, hpI.y), gap = O.slot === inb ? 4.5 : 3.5; q.x = q.tx = clamp(O.x + u.x * gap, 2, 48); q.y = q.ty = O.y + u.y * gap; q.cvx = q.cvy = 0; });
    var ro = this.runout && this.runout.team === offTeam ? this.runout.lvl : 0; this.runout = null;
    if (ro) { this.defs().forEach(function (q) { q.stun = 0.35 + 0.3 * ro; }); this.ev('They get out and run off the rebound: the defense is ' + (ro > 1 ? 'scrambling' : 'a step slow') + ' to get set.', 'play'); }
    this.ball.h = this.op(inb).i; this.ball.x = this.op(inb).x; this.ball.y = this.op(inb).y; this.ball.z = 0; this.inbound = false; this.wasInbound = false;
    var crash = {}, nCrash = 0, cl = Array.isArray(po.crash) ? po.crash : null;
    if (cl) cl.forEach(function (sl) { if (sl >= 0 && sl < 5 && !crash[sl]) { crash[sl] = true; nCrash++; } });
    else { offs.slice().sort(function (a, b) { return b.r.size - a.r.size || b.r.reb - a.r.reb; }).slice(0, 3).forEach(function (q) { crash[q.slot] = true; nCrash++; }); }
    this.trace = [];
    this.o = { jumped: po.jumped || '', fooled: !!po.fooled, tr: null, fresh: !!po.fresh && !po.jumped, sel: po.sel || 'bal', pace: po.pace || 'normal', read: Math.max(0, Math.min(2, po.read | 0)), crash: crash, nCrash: nCrash, inb: inb, inbPassed: false, safe: false, style: po.style || 'motion', tempo: 'set', focus: po.focus == null ? null : po.focus, after: po.after || 'crash',
      plays: plays, pi: -1, beats: null, bi: 0, bt: 0, minT: 0.3, phase: 'adv', think: 0, handler: hd, setup: setup, t0: this.t, arrT: null,
      free: false, gen: false, forced: false, crossed: true, nextTC: this.t + 0.15, fb: -1, drives: 0, passes: 0, lastBallScreen: -9,
      pendingRead: false, liveQ: null, reset: null, lastStyle: -1, fails: 0, ho: null, opt: null, soc: -1, defer: null, endSh: -1, movers: [] };
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
      deny: {}, ppRule: {}, ruleSwitch: false, zs: zs, rules: (Array.isArray(pdn.rules) ? pdn.rules : pdn.rule ? [pdn.rule] : []).slice(0, 4), roles: pdn.roles || {}, dblOn: pdn.dbl == null ? -1 : pdn.dbl, leak: {}, nLeak: 0 };
    var dd0 = this.d; (Array.isArray(pdn.leak) ? pdn.leak : pdn.after === 'leak' ? [defs[0].slot] : []).slice(0, 2).forEach(function (sl) { if (sl >= 0 && sl < 5 && !dd0.leak[sl]) { dd0.leak[sl] = true; dd0.nLeak++; } });
    if (style !== pdn.style) this.d.shown = style;
    this.d.spots = (Array.isArray(pdn.spots) ? pdn.spots : []).slice(0, 4).map(function (z) { var w = h2w(offTeam, z.x, z.y); return { k: z.k, x: w.x, y: w.y }; });
    if (po.hunt != null && po.hunt >= 0 && po.hunt < 5 && style !== 'zone') this.o.focus = assign[po.hunt]; // go at one defender: the ball goes to whoever he is guarding
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
      var q = defs[k]; dd = pd(q, p) + (q.stun > 0.15 ? 1.6 : q.trailUntil > this.t ? 1.1 : 0);
      if (closeBy) dd = Math.max(type === 'rim' ? 0.9 : 1.3, dd - closeBy);
      if (dd < d1) { d2 = d1; n2 = n1; d1 = dd; n1 = q; } else if (dd < d2) { d2 = dd; n2 = q; }
    }
    var pm, pts = isThree ? 3 : 2, pf = 0;
    function rimC(q, dd2) { return dd2 >= 5 ? 0 : (1 - Math.max(0, dd2 - 1.8) / 3.2) * clamp(0.10 + ((q.r.rim * 0.65 + q.r.blk * 0.35) - 50) / 49 * 0.17 + (q.r.size - r.size) * 0.026 + ((q.r.vert || 75) - 75) * 0.0008, 0.02, 0.36); }
    if (type === 'rim') {
      pm = 0.575 + (r.ins - 75) * 0.006;
      pm -= rimC(n1, d1) + (this.d && this.d.style === 'zone' ? 0.9 : this.d && this.d.help === 'help' ? 0.85 : 0.5) * rimC(n2, d2);
      pm += ((r.vert || 75) - 75) * 0.0012; // leapers finish
      if (d1 < 3.2 && n1) pm += clamp((r.str - n1.r.str) * 0.0013, -0.04, 0.045); // a stronger finisher goes through the contact
      if (d1 >= 6) pm += 0.14;
      if (d1 < 3.6) pf = 0.11 + Math.min(0.1, r.fta * 0.011);
    } else {
      var base;
      if (type === 'three') base = 0.336 + (r.three - 70) * 0.0043 - Math.max(0, d - 26) * 0.012;
      else if (type === 'short') base = 0.43 + (r.ins - 75) * 0.004;
      else base = 0.40 + (r.mid - 76) * 0.004;
      var c = 0;
      if (d1 >= 6) c = -0.05;
      else { c = (1 - Math.max(0, d1 - 1.8) / 4.2) * clamp(0.17 + (n1.r.pd - 60) / 40 * 0.07 + (n1.r.size - r.size) * 0.021, 0.05, 0.3); }
      pm = base - c;
      if (p.dribbled) pm -= 0.035;
      if (type === 'short' && d1 < 3) pf = 0.07 + Math.min(0.06, r.fta * 0.006);
    }
    if (this.sc < 5) pm -= (99 - r.cmp) / 99 * 0.06; // rushed shots punish shaky players
    pm += 0.025 * Math.min(2, Math.max(0, ((this.hot || {})[p.i] || 0) - 1)); // a shooter who has made two straight is feeling it
    var sp0 = this.d ? this.d.spots : null;
    if (sp0 && sp0.length) { var inW = false; for (var wi = 0; wi < sp0.length; wi++) if (sp0[wi].k === 'wall' && dist(p.x, p.y, sp0[wi].x, sp0[wi].y) < 5.5) inW = true; pm += inW ? -0.07 : 0.012 * sp0.length; } // a spot the defense is fighting for is a bad place to shoot from; every marker thins the cover everywhere else
    if (this.o && this.o.read) pm -= 0.03 * this.o.read;
    if (this.o && this.o.fooled) pm += 0.075; // the defense guessed the wrong play and is leaning the wrong way // a call the defense has seen coming: every look is a little tougher
    if (this.clutch) pm += (r.cmp - 75) * 0.003; // late and close: composure shows
    pm = clamp(pm, 0.08, 0.92);
    var ev = (1 - pf) * pm * pts + pf * 2 * r.ft;
    return { ev: ev, pm: pm, pts: pts, pf: pf, type: type, d1: d1, n1: n1, dist: d };
  };

  Sim.prototype.shoot = function (p) {
    var s = this.shotInfo(p), o = this.o, hp = hoop(this.offTeam), self = this;
    if (o.tr && !o.tr.why && ((o.beats && !o.gen) || this.t - (o.trT || -9) < 2.6)) { o.tr.shot = true; o.tr.done = true; s.pm = Math.min(0.92, s.pm + (o.jumped === 'shooter' ? -0.06 : o.jumped ? 0 : 0.07) + (o.fresh ? 0.03 : 0)); } // the shot the play was drawn to get: taken in rhythm
    o.beats = null; p.driving = false;
    var label = s.type === 'three' ? 'three' : s.type === 'rim' ? 'at the rim' : s.type === 'short' ? 'in the paint' : 'jumper';
    if (this.rand() < s.pf) {
      var made = 0; for (var k = 0; k < 2; k++) if (this.rand() < p.r.ft) made++;
      this.score[this.offTeam] += made; this.box[p.i][0] += made;
      this.ev(p.name + ' is fouled by ' + s.n1.name + '. ' + made + ' of 2 free throws.', made ? 'score' : 'miss');
      this.finish('ft', made, true); return;
    }
    this.lastShot = { i: p.i, who: p.name, type: s.type, pm: s.pm, d1: s.d1, by: s.n1 ? s.n1.name : '' };
    var make = this.rand() < s.pm; this.box[p.i][4]++;
    var lp = o.lastPass; this.astBy = make && lp && lp.to === p.slot && this.t - lp.t < 4.5 ? lp.from : -1;
    (this.shots = this.shots || []).push([s.type, make ? 1 : 0, Math.round(s.d1)]);
    var blocked = !make && s.type === 'rim' && s.d1 < 3 && this.rand() < 0.14 + s.n1.r.blk / 400;
    this.ball.h = -1;
    this.ball.fly = { type: 'shot', fx: p.x, fy: p.y, tx: hp.x, ty: hp.y, t0: this.t, dur: 0.5 + s.dist / 42, make: make, pts: s.pts, shooter: p.i, label: label, blocked: blocked ? s.n1.name : null, open: s.d1 >= 6, over: s.n1 && s.d1 < 4.5 && p.r.hgt - s.n1.r.hgt >= 4 ? s.n1.name : s.n1 && s.d1 < 3.2 && s.type === 'rim' && p.r.str - s.n1.r.str >= 14 ? '>' + s.n1.name : '' };
    if (this.ball.fly.over) this.tag(15, p);
    this.crashAndBox(p);
  };

  Sim.prototype.crashAndBox = function (shooter) {
    var o = this.o, d = this.d, off = this.offTeam, hp = hoop(off), self = this, k;
    var mates = this.offs().filter(function (q) { return q !== shooter; }).sort(function (a, b) { return pd(a, hp) - pd(b, hp); });
    var ci = 0;
    mates.forEach(function (q, idx0) {
      q.scrUntil = 0; q.scrPending = false; var isC = o.crash[q.slot], idx = isC ? ci++ : idx0;
      if (isC) { var ang = (idx - 1) * 1.1, u = unit(hp.x, hp.y, q.x, q.y); q.tx = hp.x + (u.x * Math.cos(ang) - u.y * Math.sin(ang)) * 5.5; q.ty = hp.y + (u.y * Math.cos(ang) + u.x * Math.sin(ang)) * 5.5; q.sp = 0.95; }
      else { var hh = w2h(off, q.x, q.y), w = h2w(off, hh.hx * 0.7, 36 + idx * 3); q.tx = w.x; q.ty = w.y; q.sp = 0.85; }
    });
    if (!o.crash[shooter.slot]) { var sh = w2h(off, shooter.x, shooter.y), sw = h2w(off, sh.hx * 0.6, Math.max(sh.hy, 32)); shooter.tx = sw.x; shooter.ty = sw.y; shooter.sp = 0.7; }
    var defs = this.defs(), leaker = null;
    defs.forEach(function (q) {
      q.mode = null;
      if (d.leak[q.slot]) { var hh = w2h(off, q.x, q.y), w = h2w(off, hh.hx * 0.5, 44); q.tx = w.x; q.ty = w.y; q.sp = 1; return; }
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
    if (this.ball.reb && this.ball.reb.x != null) { bx = this.ball.reb.x; by = this.ball.reb.y; }
    var tot = 0, w = [];
    this.P.forEach(function (p) {
      var dd = dist(p.x, p.y, bx, by), prox = 1 / (1 + Math.pow(dd / 5.5, 2));
      var tf = p.team === self.offTeam ? (o.crash[p.slot] ? 0.6 + 0.03 * (o.nCrash - 3) : 0.2) : (1.3 - 0.1 * d.nLeak) * (d.style === 'zone' ? 0.88 : 1);
      if (p.team !== self.offTeam && d.leak[p.slot]) tf = 0.02;
      var v = Math.pow((p.r.reb * 0.85 + p.r.str * 0.15) / 70, 2.4) * (1 + ((p.r.hgt || 79) - 79) * 0.015 + ((p.r.vert || 75) - 75) * 0.004) * prox * tf * (p.stun > 0 ? 0.6 : 1) + 0.0005;
      w.push(v); tot += v;
    });
    var roll = this.rand() * tot, pick = 0;
    for (var k = 0; k < 10; k++) { roll -= w[k]; if (roll <= 0) { pick = k; break; } }
    var p = this.P[pick];
    this.ball.reb = null; this.ball.h = p.i; this.ball.x = p.x; this.ball.y = p.y; this.ball.z = 0; p.dribbled = false; this.box[p.i][1]++;
    if (p.team === this.offTeam) {
      this.ev(p.name + ' grabs the offensive rebound.', 'i');
      this.sc = 14; o.beats = null; o.ho = null; o.opt = null; o.free = true; o.forced = false; o.gen = false; o.think = 0.4; o.phase = 'run'; o.drives = 0; o.pendingRead = false; o.liveQ = null;
      this.offs().forEach(function (q) { q.driving = false; q.post = false; });
    } else {
      this.ev(p.name + ' rebounds.', 'i');
      var edge = d.nLeak + Math.max(0, o.nCrash - 3) - (o.nCrash <= 1 ? 1 : 0); // leaking out and beating a heavy crash both mean a head start next time down
      if (edge >= 1) this.runout = { team: 1 - this.offTeam, lvl: Math.min(3, edge) };
      this.finish('dreb', 0, false);
    }
  };

  Sim.prototype.finish = function (type, pts, inbound) {
    this.done = { type: type, pts: pts || 0, label: type === 'to' ? (this.doneLabel || 'Turnover') : '' }; this.doneLabel = ''; this.inbound = !!inbound;
    this.ball.fly = null; this.ball.reb = null;
    if (inbound) { this.ball.h = -1; var hp = hoop(this.offTeam); this.ball.x = hp.x; this.ball.y = hp.y; this.ball.z = 0; }
    this.P.forEach(function (p) { p.driving = false; p.post = false; p.scrUntil = 0; p.scrPending = false; p.mode = null; if (inbound || p.sp < 0.9) { p.tx = p.x; p.ty = p.y; } });
  };

  // the ball visibly leaves the offense first: poked loose, picked off, or thrown out of bounds
  Sim.prototype.loseBall = function (txt, by, label, tx, ty, dur) {
    var b = this.ball, H = this.holder(), fx = H ? H.x : b.x, fy = H ? H.y : b.y;
    if (H) { H.driving = false; this.box[H.i][6]++; }
    if (by) this.box[by.i][5]++;
    b.h = -1; b.fly = { type: 'lost', fx: fx, fy: fy, tx: by ? by.x : tx, ty: by ? by.y : ty, t0: this.t, dur: dur || 0.25, by: by ? by.i : -1, txt: txt, label: label };
    this.o.beats = null; this.o.ho = null; this.o.opt = null;
  };
  Sim.prototype.turnover = function (txt, by, label) {
    var self = this; this.doneLabel = label || 'Turnover';
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
    var d = this.d, l = pd(H, T), risk = 0.003 + l / 2600 + Math.max(0, l - 24) / 330 + (99 - H.r.pas) / 99 * 0.016, self = this;
    this.defs().forEach(function (q) {
      if (q.stun > 0.1) return;
      var near = pd(q, H) < 4;
      var sd = segDist(q.x, q.y, H.x, H.y, T.x, T.y, 0.22);
      if (sd < 2.6 && !near) { var m = (1 - sd / 2.6) * (0.07 + ((q.r.stl * 0.6 + q.r.diq * 0.4) - 62) / 40 * 0.05); if (d.deny[T.slot] || d.gamble[q.slot] > self.t) m *= 1.7; risk += m; }
      if (near) risk += 0.005;
    });
    if (this.doubled(H)) risk += 0.04;
    var sp = this.d ? this.d.spots : null; // a marked steal spot: a defender is waiting on any pass thrown there
    if (sp) for (var si = 0; si < sp.length; si++) if (sp[si].k === 'steal' && dist(T.tx, T.ty, sp[si].x, sp[si].y) < 6 && dist(T.x, T.y, sp[si].x, sp[si].y) < 9) { risk += 0.12; break; }
    return clamp(risk, 0.005, 0.9);
  };
  Sim.prototype.pass = function (H, T) {
    var o = this.o, self = this, risk = o.safe ? 0 : this.passRisk(H, T);
    H.driving = false; H.post = false; o.passes++;
    var l = pd(H, T);
    if (this.rand() < risk) {
      var by = null, bd = 1e9; this.defs().forEach(function (q) { var sd = segDist(q.x, q.y, H.x, H.y, T.x, T.y, 0.18); if (sd < bd) { bd = sd; by = q; } });
      if (bd < 4.5) this.loseBall(by.name + ' picks off the pass from ' + H.name + '.', by, 'Steal', 0, 0, Math.max(0.18, pd(H, by) / 38));
      else { var u = unit(H.x, H.y, T.x, T.y), ox = clamp(T.x + u.x * 12, -1, 51), oy = clamp(T.y + u.y * 12, -1, 95); this.loseBall(H.name + ' throws it out of bounds.', null, 'Out of bounds', ox, oy, (l + 12) / 38); }
      return false;
    }
    o.lastPass = { from: H.slot, to: T.slot, t: this.t };
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
    if (G.stun > 0.2 || G.trailUntil > this.t || pd(G, H) > 7.5) return 0.92;
    var d = this.d, p;
    if (post) p = 0.42 + ((H.r.ins + H.r.str * 0.5 + H.r.size * 4) - (G.r.rim + G.r.str * 0.5 + G.r.size * 4)) / 140 - (d.style === 'zone' ? 0.16 : 0);
    else {
      p = 0.36 + clamp(((H.r.hnd * 0.6 + H.r.spd * 0.4) - (G.r.pd * 0.65 + G.r.spd * 0.35)) / 110, -0.17, 0.17) + clamp((H.r.str - G.r.str) / 500, -0.035, 0.04);
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
    var G = this.guardOf(H), pb = this.pBeat(H, G, false), p0 = 0.575 + (H.r.ins - 75) * 0.006, hc = 0;
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
    var ps = 0.006 + Math.max(0, (G ? G.r.stl - p.r.hnd : 0)) / 1400 + (this.doubled(p) ? 0.03 : 0);
    p.stripAt = G && this.rand() < ps ? this.t + 0.35 + this.rand() * 0.45 : 0; p.stripBy = G ? G.i : -1;
    var beaten = this.rand() < this.pBeat(p, G, post);
    p.driving = true; p.post = !!post; p.dribbled = true; p.drvEnd = this.t + 2.6; p.scrUntil = 0;
    if (beaten) { if (G && pd(G, p) < 7.5) { G.trailUntil = this.t + (post ? 0.3 : 0.7) + this.rand() * 0.25 + (post ? 0 : clamp((p.r.spd - G.r.spd) / 40, 0, 0.5)); G.stun = Math.max(G.stun, 0.12); this.tag(3, p); } p.tx = tx; p.ty = ty; p.sp = 0.92; }
    else {
      // the defender stays in front: the driver gets as deep as the defender lets him, then has to stop
      var minR = (post ? 6.5 : 9) + this.rand() * 2.5, dT = dist(tx, ty, hp.x, hp.y), dP = pd(p, hp), nx = tx, ny = ty;
      if (dT < minR) { if (dP <= minR + 0.5) { nx = p.x; ny = p.y; } else { var f = clamp((dP - minR) / ((dP - dT) || 1), 0, 1); nx = p.x + (tx - p.x) * f; ny = p.y + (ty - p.y) * f; } }
      p.tx = nx; p.ty = ny; p.sp = 0.62; if (G) this.tag(4, G);
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
      var pick = Math.floor(this.rand() * 4); if (pick === o.lastStyle) pick = (pick + 1) % 4; o.lastStyle = pick;
      if (pick === 3 && (H.r.hnd < 70 || o.drives > 1)) pick = 2;
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
      } else if (pick === 3) { // attack off the dribble, then read
        beats.push([{ k: 'drv', s: H.slot, x: (hh.hx >= 0 ? 1 : -1) * 3, y: 10 }]); busy = [H.slot];
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
    var thr = force ? -9 : (this.sc > 14 ? 1.07 : this.sc > 8 ? 0.99 : 0.88) + (this.sc > 7 ? (o.pace === 'quick' ? -0.13 : o.pace === 'patient' ? 0.08 : 0) : 0) - Math.min(0.3, 0.09 * o.drives + 0.06 * o.fails + 0.02 * Math.min(4, o.passes));
    var fog = (99 - H.r.oiq) / 99 * 0.3; function nz() { return (self.rand() - 0.5) * 2 * fog; } // low IQ misreads the floor
    var si0 = this.shotInfo(H), sel = o.sel, sb = sel === 'three' ? (si0.type === 'three' ? 0.1 : -0.07) : sel === 'paint' ? (si0.type === 'rim' ? 0.08 : si0.type === 'three' ? -0.09 : -0.03) : 0;
    var best = { k: 'sh', ev: si0.ev + sb + nz() };
    this.offs().forEach(function (T) {
      if (T === H) return;
      var risk = self.passRisk(H, T); if (risk > 0.2) return;
      var ev = (1 - risk) * self.catchEV(H, T) - risk * 1.0 - 0.03 - 0.015 * o.passes - (force ? 0.12 : 0) + nz();
      if (ev > best.ev) best = { k: 'pass', T: T, ev: ev };
    });
    if (this.sc > 2.6) { var dv = this.driveEV(H) + (sel === 'paint' ? 0.09 : sel === 'three' ? -0.05 : 0) + nz(); if (dv > best.ev) best = { k: 'drv', ev: dv }; }
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

  // c: a list of waypoints in half-court coords ([[x,y],...]) or one curve control point ([x,y]); nothing means straight
  Sim.prototype.setPath = function (p, c) {
    p.path = null; if (!c || !c.length) return;
    var off = this.offTeam, pts = [], x0 = p.x, y0 = p.y, k;
    if (typeof c[0] === 'number') {
      var cw = h2w(off, c[0], c[1]);
      [0.2, 0.4, 0.6, 0.8].forEach(function (u) { var a = (1 - u) * (1 - u), b = 2 * u * (1 - u), d2 = u * u; pts.push([a * x0 + b * cw.x + d2 * p.tx, a * y0 + b * cw.y + d2 * p.ty]); });
    } else {
      var raw = [[x0, y0]]; c.forEach(function (q) { var w = h2w(off, q[0], q[1]); raw.push([w.x, w.y]); }); raw.push([p.tx, p.ty]);
      for (k = 0; k < raw.length - 1; k++) { // Catmull-Rom through the drawn points so the run is as smooth as the line
        var p0 = raw[Math.max(0, k - 1)], p1 = raw[k], p2 = raw[k + 1], p3 = raw[Math.min(raw.length - 1, k + 2)];
        [0.34, 0.67, 1].forEach(function (u) { if (k === raw.length - 2 && u === 1) return; var u2 = u * u, u3 = u2 * u;
          pts.push([0.5 * (2 * p1[0] + (p2[0] - p0[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (3 * p1[0] - p0[0] - 3 * p2[0] + p3[0]) * u3),
                    0.5 * (2 * p1[1] + (p2[1] - p0[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (3 * p1[1] - p0[1] - 3 * p2[1] + p3[1]) * u3)]); });
      }
    }
    var len = 0, lx = x0, ly = y0; pts.forEach(function (q) { q[0] = clamp(q[0], 1.5, 48.5); q[1] = clamp(q[1], 1.5, 92.5); len += dist(lx, ly, q[0], q[1]); lx = q[0]; ly = q[1]; });
    p.path = { pts: pts, ex: p.tx, ey: p.ty, len: len + dist(lx, ly, p.tx, p.ty) };
  };
  // ordered reads attached to a step: take the first one that is really open. Returns true when one was taken.
  Sim.prototype.tryOptions = function () {
    var o = this.o, H = this.holder(), op = o.opt, hp = hoop(this.offTeam), k;
    if (!H) return false;
    for (k = 0; k < op.list.length; k++) {
      var q = op.list[k];
      if (q.k === 'pass') { var T = this.op(q.to); if (T && T !== H && this.passRisk(H, T) < 0.2 && this.catchEV(H, T) >= 0.9) { o.opt = null; o.beats = null; o.gen = false; o.soc = T.slot; this.tag(6, T); this.ev(H.name + ' finds ' + T.name + ', who is open.', 'play'); this.pass(H, T); o.think = 0.3; return true; } }
      else if (q.k === 'sh') { if (this.shotInfo(H).ev >= 0.88) { o.opt = null; this.shoot(H); return true; } }
      else if (q.k === 'lay' || q.k === 'drv') {
        if (pd(H, hp) < 6.8) { if (this.shotInfo(H).ev >= 0.8) { o.opt = null; this.shoot(H); return true; } }
        else if (this.driveEV(H) >= 0.92) { o.opt = null; var hh = w2h(this.offTeam, H.x, H.y); o.beats = [[{ k: 'lay', s: H.slot, x: clamp(hh.hx * 0.15, -3, 3), y: 6.5 }]]; o.gen = true; o.bi = 0; if (!this.startBeat(0)) { o.beats = null; o.think = 0.3; } return true; }
      }
    }
    return false;
  };
  Sim.prototype.doDrive = function (a, p) { // a drive or layup action, started now
    var o = this.o, w = h2w(this.offTeam, a.x, a.y);
    if (a.soft) { p.tx = w.x; p.ty = w.y; p.sp = 0.7; p.dribbled = true; }
    else { if (!this.startDrive(p, w.x, w.y, a.post)) return false; if ((a.w || a.c) && p.tx === w.x && p.ty === w.y) this.setPath(p, a.w || a.c); }
    p.lay = a.k === 'lay'; if (o.movers.indexOf(p) < 0) o.movers.push(p);
    return true;
  };
  Sim.prototype.startBeat = function (i) {
    var o = this.o, off = this.offTeam, movers = [], k, a, p, w, H;
    var ord = { pass: 0, ho: 0.5, drv: 1, lay: 1, sh: 2, opt: 2.5, scr: 3, mv: 4 }, b = o.beats[i].slice().sort(function (x, y) { return ord[x.k] - ord[y.k]; });
    var recv = -1, chain = false, mvK = {}, expl = {}; o.movers = movers; o.defer = null; o.endSh = -1; o.opt = null; o.late = null; o.caught = -1;
    for (k = 0; k < b.length; k++) { if (b[k].k === 'mv' || b[k].k === 'scr' || b[k].k === 'drv' || b[k].k === 'lay') mvK[b[k].s] = b[k].k; if (b[k].k === 'drv' || b[k].k === 'lay' || b[k].k === 'sh') expl[b[k].s] = 1; }
    for (k = 0; k < b.length; k++) { if (b[k].k === 'pass' || b[k].k === 'ho') recv = b[k].to; if (b[k].k === 'pass' || b[k].k === 'ho' || b[k].k === 'drv' || b[k].k === 'lay') chain = true; }
    for (k = 0; k < b.length; k++) {
      a = b[k]; p = this.op(a.s); H = this.holder();
      if (a.k === 'pass') {
        if (H !== p) { o.why = p.name + ' does not have the ball'; return false; }
        var T = this.op(a.to); if (!T || T === p) return false;
        if (!expl[a.to] && !o.gen) o.caught = a.to; // nothing drawn for him after the catch: he reads it himself
        // a pass to a cutter is led to his spot, and a driver passes at the end of his drive
        if (mvK[a.to] === 'mv' || mvK[a.to] === 'scr' || mvK[a.s] === 'drv' || mvK[a.s] === 'lay') { o.late = { s: a.s, to: a.to, t: 0, then: [] }; continue; }
        if (this.passRisk(H, T) > (o.gen ? 0.22 : 0.3 - 0.035 * o.read + (o.fresh ? 0.05 : 0) - (o.jumped === 'pass' ? 0.1 : 0) + (o.fooled ? 0.04 : 0))) { o.why = 'the pass to ' + T.name + ' is covered'; this.tag(7, this.guardOf(T)); return false; }
        if (!this.pass(H, T)) return true; // turnover ends it
      } else if (a.k === 'ho') {
        if (H !== p) { o.why = p.name + ' does not have the ball'; return false; }
        var R = this.op(a.to); if (!R || R === p) return false; if (!expl[a.to] && !o.gen) o.caught = a.to;
        R.tx = p.x; R.ty = p.y; R.sp = 0.9; R.scrUntil = 0; R.scrPending = false; this.setPath(R, a.w || a.c);
        p.tx = p.x; p.ty = p.y; o.ho = { g: p, r: R };
      } else if (a.k === 'drv' || a.k === 'lay') {
        if (a.s === recv && !(o.late && o.late.s === a.s)) o.defer = a; // he gets the ball in this same step, then goes
        else if (H !== p) { o.why = p.name + ' does not have the ball'; return false; }
        else if (!this.doDrive(a, p)) return true;
      } else if (a.k === 'sh') {
        if (chain) o.endSh = a.s; // shot comes at the end of the step's action
        else { if (H !== p) { o.why = p.name + ' does not have the ball'; return false; } if (!o.gen && this.sc > 6 && this.shotInfo(p).ev < 0.45) { o.why = p.name + ' has no shot'; return false; } this.shoot(p); return true; }
      } else if (a.k === 'opt') {
        o.opt = { list: a.list || [], t: 0 };
      } else if (a.k === 'mv' || a.k === 'scr') {
        if (o.late && o.late.s === a.s) { o.late.then.push(a); continue; } // the passer moves once the ball is gone
        w = h2w(off, a.x, a.y); p.tx = clamp(w.x, 1.5, 48.5); p.ty = clamp(w.y, 1.5, 92.5); p.sp = a.k === 'mv' ? 0.92 : 0.85; p.scrUntil = 0; p.scrPending = a.k === 'scr'; this.setPath(p, a.w || a.c);
        if (a.k === 'mv' && p !== H && dist(p.x, p.y, p.tx, p.ty) > 8) {
          var cg = this.guardOf(p), toRim = pd(p, hoop(off)) - dist(p.tx, p.ty, hoop(off).x, hoop(off).y) > 5;
          if (cg && pd(cg, p) < 8) { var pr0 = this.d.ppRule[p.slot] || this.d.pp[p.slot] || this.d.press, late = (this.d.spots || []).some(function (z) { return z.k === 'wall' && dist(p.tx, p.ty, z.x, z.y) < 5; }) ? -0.2 : 0.1 + (this.o.fooled ? 0.1 : 0) - (this.o.jumped === 'screen' && !this.o.gen ? 0.14 : 0) + (this.o.fresh && !this.o.gen ? 0.12 : 0) - 0.05 * (this.o.gen ? 0 : this.o.read) + (p.r.oiq - cg.r.diq) / 250 + (toRim && (this.d.deny[p.slot] || pr0 === 'tight') ? 0.22 : 0) - (pr0 === 'sag' && toRim ? 0.1 : 0); cg.reactUntil = this.t + clamp(late, 0.03, 0.5); }
        }
        movers.push(p);
      }
    }
    o.bt = this.t; o.movers = movers; o.minT = 0.3; if (!o.gen && o.tr) { o.tr.ran = Math.max(o.tr.ran, i + 1); o.trT = this.t; }
    return true;
  };

  Sim.prototype.runBeats = function () {
    var o = this.o, el = this.t - o.bt, all = true, k, H = this.holder(), hp = hoop(this.offTeam);
    if (o.ho) { // handoff: the ball changes hands when the receiver brushes past, and the giver acts as a screen
      var hg = o.ho.g, hr = o.ho.r;
      if (pd(hg, hr) < 2.8) {
        o.ho = null; this.ball.h = hr.i; hr.dribbled = true; hg.scrUntil = this.t + 1.0;
        var gd = this.guardOf(hr); if (gd) this.applyScreen(gd, hg, hr, hr, this.d.style === 'zone');
        this.ev(hg.name + ' hands off to ' + hr.name + '.', 'play'); o.bt = this.t - 0.2; H = hr;
        if (!(o.defer && o.defer.s === hr.slot)) { hr.tx = hr.x; hr.ty = hr.y; hr.path = null; return; }
      } else { if (el > 3.4) { o.ho = null; o.why = 'the handoff never got there'; this.breakPlay(); } return; }
    }
    if (o.late) { // lead pass: released so the ball and the cutter get to the spot together
      var L = o.late, Pp = this.op(L.s), Tt = this.op(L.to), pgo = Pp.driving || Pp.lay, pleft = pgo ? dist(Pp.x, Pp.y, Pp.tx, Pp.ty) : 0, tleft = dist(Tt.x, Tt.y, Tt.tx, Tt.ty);
      var lead = Math.max(1.5, dist(Pp.x, Pp.y, Tt.tx, Tt.ty) * 0.3), ready = (pleft < 1.5 && tleft <= lead && !Tt.scrPending) || el > 5;
      if (!ready) return;
      if (Pp.lay) { Pp.lay = false; if (Pp === H && pd(Pp, hp) < 6.8 && this.shotInfo(Pp).ev >= 0.78) { o.late = null; o.opt = null; this.shoot(Pp); return; } }
      if (H !== Pp) { o.late = null; o.why = Pp.name + ' does not have the ball'; this.breakPlay(); return; }
      if (this.passRisk(H, Tt) > 0.3 - 0.035 * o.read + (o.fresh ? 0.05 : 0) - (o.jumped === 'pass' ? 0.1 : 0) + (o.fooled ? 0.04 : 0)) { if (!L.t) L.t = this.t; if (this.t - L.t < 0.7 && this.sc > 3) return; o.late = null; o.why = 'the pass to ' + Tt.name + ' is covered'; this.tag(7, this.guardOf(Tt)); this.breakPlay(); return; }
      o.late = null; Pp.driving = false;
      if (!this.pass(H, Tt)) return;
      for (k = 0; k < L.then.length; k++) { var la = L.then[k], lw = h2w(this.offTeam, la.x, la.y); Pp.tx = clamp(lw.x, 1.5, 48.5); Pp.ty = clamp(lw.y, 1.5, 92.5); Pp.sp = 0.92; Pp.scrPending = la.k === 'scr'; this.setPath(Pp, la.w || la.c); if (o.movers.indexOf(Pp) < 0) o.movers.push(Pp); }
      o.bt = this.t - 0.1; return;
    }
    if (o.defer) { // the new ball handler goes straight into his drive, no pause
      if (H && H.slot === o.defer.s) { var da = o.defer; o.defer = null; if (!this.doDrive(da, H)) return; o.bt = this.t; return; }
      if (el > 3.4) { o.defer = null; this.breakPlay(); } return;
    }
    for (k = 0; k < o.movers.length; k++) { var p = o.movers[k]; if (dist(p.x, p.y, p.tx, p.ty) > 1.3) all = false; if (p.scrPending) all = false; }
    var cap = 3.2; for (k = 0; k < o.movers.length; k++) if (o.movers[k].path) cap = Math.max(cap, o.movers[k].path.len / 9 + 1.2);
    if (this.ball.fly && el < 6) return; // let the catch happen before the step is judged
    if ((all && el >= o.minT) || el > Math.min(cap, 6)) {
      o.movers.forEach(function (q) { q.driving = false; });
      // end of the step, in order: finish the layup, take the drawn shot, then look at the options
      for (k = 0; k < o.movers.length; k++) { var m = o.movers[k]; if (m.lay) { m.lay = false; if (m === H && pd(m, hp) < 6.8 && (this.sc <= 5 || this.shotInfo(m).ev >= 0.78)) { o.opt = null; this.shoot(m); return; } } } // a layup goes up only if it is there
      if (o.endSh >= 0 && H && H.slot === o.endSh) { o.endSh = -1; if (o.gen || this.sc <= 6 || this.shotInfo(H).ev >= 0.45) { o.opt = null; this.shoot(H); return; } }
      o.endSh = -1;
      if (o.caught >= 0 && H && H.slot === o.caught && !o.opt) { // caught it with nothing drawn next: finish if it is clearly there
        var ci = this.shotInfo(H), atRim = pd(H, hp) < 7;
        if (atRim ? ci.ev >= 1.02 : (ci.ev >= 1.1 && o.beats && o.bi >= o.beats.length - 1)) { o.caught = -1; this.tag(6, H); this.ev(H.name + ' is open and ' + (atRim ? 'goes straight up.' : 'lets it fly.'), 'play'); this.shoot(H); return; }
      }
      o.caught = -1;
      if (o.opt) { if (!o.opt.t) o.opt.t = this.t; if (this.tryOptions()) return; if (this.t - o.opt.t < 0.45) return; o.opt = null; }
      o.bi++;
      if (!o.beats || o.bi >= o.beats.length) { if (!o.gen && o.tr) { o.tr.done = true; o.trT = this.t; } o.beats = null; o.think = 0.22; if (!o.gen) o.pendingRead = true; o.gen = false; return; }
      if (!this.startBeat(o.bi)) this.breakPlay();
    }
  };
  Sim.prototype.breakPlay = function () {
    var o = this.o;
    if (!o.gen && o.tr && !o.tr.why && !o.tr.done) { o.tr.why = o.why || 'the defense took it away'; o.tr.at = o.bi + 1; }
    if (!o.gen) this.ev('The play breaks down' + (o.why ? ': ' + o.why + '.' : '.'), 'i'); o.why = '';
    o.beats = null; o.gen = false; o.think = 0.3; o.pendingRead = false; o.ho = null; o.opt = null; o.defer = null; o.endSh = -1;
    this.offs().forEach(function (q) { q.driving = false; q.scrPending = false; });
  };

  Sim.prototype.loadPlay = function (i) {
    var o = this.o, play = o.plays[i], off = this.offTeam, self = this;
    o.pi = i; o.phase = 'reset'; o.reset = { t: this.t, passed: false };
    this.offs().forEach(function (q) { var w = h2w(off, play.setup[q.slot][0], play.setup[q.slot][1]); q.tx = w.x; q.ty = w.y; q.sp = 0.8; q.scrUntil = 0; q.scrPending = false; q.driving = false; });
    o.tr = { name: play.name, n: play.beats.length, ran: 0, why: '', at: 0, shot: false, done: false }; this.trace.push(o.tr);
    this.ev('Running ' + play.name + '.', 'play');
    if (o.jumped) this.ev('The defense was sitting on this exact play' + (o.jumped === 'pass' ? ' and is in the passing lanes.' : o.jumped === 'screen' ? ' and is already around the screens.' : ' and is glued to the shooter.'), 'i');
    else if (o.read) this.ev(o.read > 1 ? 'The defense is sitting on it: they have seen this call too often.' : 'The defense has seen this call before.', 'i');
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

  Sim.prototype.advance = function (dt) { // the inbound: in to the ball handler, then everyone is set
    var o = this.o, off = this.offTeam, H = this.holder(), I = this.op(o.inb), hd = this.op(o.handler);
    if (!o.inbPassed) {
      if (this.t - o.t0 < 0.65) return;
      o.inbPassed = true; o.safe = true; this.pass(I, hd); o.safe = false; o.passes = 0;
      var w = h2w(off, o.setup[I.slot][0], o.setup[I.slot][1]); I.tx = w.x; I.ty = w.y; I.sp = 0.9;
      this.ev(I.name + ' inbounds to ' + hd.name + '.', 'i'); return;
    }
    if (H && H !== hd) o.handler = H.slot;
    o.lastPass = null;
    if (dist(I.x, I.y, I.tx, I.ty) < 7 || this.t - o.t0 > 2.2) { o.phase = 'run'; o.think = 0.15; if (o.plays.length) this.loadPlay(0); }
  };

  Sim.prototype.updOffense = function (dt) {
    var o = this.o, H = this.holder();
    if (this.ball.fly || this.ball.reb || !H) return;
    if (H.stripAt && this.t >= H.stripAt) { var sb = this.P[H.stripBy]; H.stripAt = 0; if (H.driving && sb && pd(sb, H) < 3.6) { this.loseBall(sb.name + ' pokes it away from ' + H.name + '.', sb, 'Steal', 0, 0, 0.24); return; } }
    if (o.phase === 'adv') { this.advance(dt); return; }
    if (this.sc <= 4.2 && !o.forced) { o.forced = true; o.beats = null; o.ho = null; o.opt = null; o.defer = null; this.offs().forEach(function (q) { q.driving = false; }); o.phase = 'run'; o.think = Math.min(o.think, 0.05); o.free = true; }
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
    var d = this.d;
    d.deny = {}; d.ppRule = {}; d.ruleSwitch = false; d.ruleDbl = -1;
    for (var dk in d.pp) if (d.pp[dk] === 'deny') d.deny[dk] = true;
    if (H && d.dblOn === H.slot) d.ruleDbl = H.slot;
    if (H && d.spots) for (var ti = 0; ti < d.spots.length; ti++) if (d.spots[ti].k === 'trap' && dist(H.x, H.y, d.spots[ti].x, d.spots[ti].y) < 6.5) d.ruleDbl = H.slot; // the ball walked into a marked trap zone
    for (var ri = 0; ri < d.rules.length; ri++) this.applyOne(H, d.rules[ri]);
  };
  Sim.prototype.applyOne = function (H, r) {
    var d = this.d, hp = hoop(this.offTeam);
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
      if (d.dblBy >= 0) this.tag(5, this.dp(d.dblBy));
    }
    // help on a drive
    var helper = null;
    if (H && H.driving && (d.help === 'help' || zone)) {
      var gH = this.guardOf(H), hb = 16, u0 = unit(hp.x, hp.y, H.x, H.y), sx = hp.x + u0.x * 4.5, sy = hp.y + u0.y * 4.5;
      for (j = 0; j < 5; j++) { var q1 = this.dp(j); if (q1 === gH || j === d.dblBy || q1.stun > 0 || d.roles[j] === 'home') continue; var d1 = dist(q1.x, q1.y, sx, sy) * (d.roles[j] === 'help' ? 0.55 : 1); if (d1 < hb) { hb = d1; helper = q1; } }
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
      if (D.reactUntil > t) continue; // caught flat-footed by a cut: he has not moved yet
      if (d.mv[j] && d.mv[j].until > t) { tx = d.mv[j].x; ty = d.mv[j].y; }
      else if (D.trailUntil > t && H && !zone && this.op(d.assign[j]) === H) { u = unit(H.x, H.y, hp.x, hp.y); tx = H.x - u.x * 2.4 - u.y * 1.2; ty = H.y - u.y * 2.4 + u.x * 1.2; }
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
          var mb = dist(M.x, M.y, bx, by), hf = (d.roles[j] === 'home' ? 0.04 : d.roles[j] === 'help' ? 0.55 : d.help === 'help' ? 0.36 : 0.1) * clamp(mb / 22, 0.2, 1) * (pr === 'tight' || pr === 'contest' ? 0.5 : 1) * clamp(1.75 - M.r.three / 66, 0.3, 1.1);
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
    if (cov === 'switch' && D2 && D2 !== D) { var a = d.assign[D.slot]; d.assign[D.slot] = d.assign[D2.slot]; d.assign[D2.slot] = a; D.tx = S.x; D.ty = S.y; D2.tx = U.x; D2.ty = U.y; d.contest[D.slot] = t + 2.5; this.tag(2, D2); D2.imm[S.slot] = t + 2.8; this.nScr = (this.nScr || 0) + 1; return; }
    this.nScr = (this.nScr || 0) + 1; this.tag(cov === 'trap' ? 8 : 1, D);
    if (!onBall) D.stun = Math.max(D.stun, clamp(0.2 + (S.r.str - D.r.str) / 150, 0.1, 0.5));
    else if (cov === 'drop') { D.stun = Math.max(D.stun, 0.3); if (D2) { D2.mode = 'drop'; D2.modeUntil = t + 2.0; } }
    else if (cov === 'hedge') { D.stun = Math.max(D.stun, 0.25); if (D2) { D2.mode = 'hedge'; D2.modeUntil = t + 0.9; } }
    else if (cov === 'trap') { D.stun = Math.max(D.stun, 0.2); d.dbl = { o: U.slot, until: t + 2.6 }; d.dblBy = D2 ? D2.slot : -1; }
    else D.stun = Math.max(D.stun, 0.28);
  };
  Sim.prototype.screens = function (H, zone) {
    var t = this.t, s, u;
    for (s = 0; s < 5; s++) {
      var S = this.op(s); if (!(S.scrUntil > t)) continue;
      for (u = 0; u < 5; u++) {
        if (u === s) continue;
        var U = this.op(u); if (pd(U, S) > 4.2 || (U.vx * U.vx + U.vy * U.vy) < 16) continue;
        var G = this.guardOf(U); if (!G || pd(G, U) > 12) continue;
        var blk = segDist(S.x, S.y, G.x, G.y, U.x, U.y), near = pd(G, S);
        if (blk > 2.7 && near > 3.2) continue; // he has a clear line to his man: the screen missed him
        var s0 = G.stun, mS = (S.r.wgt || 215) * (1 + S.r.str / 200), mG = (G.r.wgt || 215) * (1 + G.r.str / 200);
        this.applyScreen(G, S, U, H, zone);
        if (G.stun > s0) { var sq = clamp(1.15 - Math.min(blk, near) / 2.7 * 0.6, 0.5, 1.15), mf = clamp(1 + (mS - mG) / 520, 0.8, 1.3); G.stun = s0 + (G.stun - s0) * sq * mf; }
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
        else { while (p.path.pts.length && dist(p.x, p.y, p.path.pts[0][0], p.path.pts[0][1]) < 1.2) p.path.pts.shift(); if (p.path.pts.length) { gx = p.path.pts[0][0]; gy = p.path.pts[0][1]; } else p.path = null; }
      }
      if (this.d && p.team === this.defTeam && p.stun <= 0) { // a set screen is a body: go around it, and lose a step doing it
        for (var si = 0; si < 5; si++) {
          var S = this.op(si); if (!(S.scrUntil > t)) continue;
          var sx = S.x - p.x, sy = S.y - p.y, sl = Math.sqrt(sx * sx + sy * sy); if (sl > 6.5 || sl < 0.01) continue;
          var px = gx - p.x, py = gy - p.y, pl = Math.sqrt(px * px + py * py); if (pl < 2.5 || sx * px + sy * py <= 0) continue;
          if (segDist(S.x, S.y, p.x, p.y, gx, gy) > 2.5) continue;
          var cr = px * sy - py * sx, nx2 = (cr > 0 ? py : -py) / pl, ny2 = (cr > 0 ? -px : px) / pl;
          var man = this.op(this.d.assign[p.slot]), prs = man ? (this.d.ppRule[man.slot] || this.d.pp[man.slot] || this.d.press) : 'normal', hpS = hoop(this.offTeam);
          var over = prs === 'tight' || prs === 'deny' || (prs !== 'sag' && man && man.r.three >= 82), c1x = S.x + nx2 * 3.2, c1y = S.y + ny2 * 3.2, c2x = S.x - nx2 * 3.2, c2y = S.y - ny2 * 3.2;
          var c1Under = dist(c1x, c1y, hpS.x, hpS.y) < dist(c2x, c2y, hpS.x, hpS.y), useC1 = over ? !c1Under : c1Under;
          gx = useC1 ? c1x : c2x; gy = useC1 ? c1y : c2y; v *= over ? 0.74 : 0.86; break;
        }
      }
      var dx = gx - p.x, dy = gy - p.y, l0 = Math.sqrt(dx * dx + dy * dy), ox = p.x, oy = p.y;
      var lf = dist(p.x, p.y, p.tx, p.ty), want = l0 > 0.05 ? Math.min(v, Math.max(2.5, lf * 7)) : 0, ka = 1 - Math.exp(-dt / ((p.team === this.offTeam ? 0.11 : 0.09) * clamp(1.25 - p.r.spd / 250 + ((p.r.wgt || 215) - 215) / 1200, 0.75, 1.35)));
      var cs0 = Math.sqrt((p.cvx || 0) * (p.cvx || 0) + (p.cvy || 0) * (p.cvy || 0));
      if (cs0 > 6 && l0 > 0.05 && ((p.cvx * dx + p.cvy * dy) / (cs0 * l0)) < -0.2) want *= 0.5; // reversing at speed: he has to plant and stop before he can go the other way
      var wx = l0 > 0.05 ? dx / l0 * want : 0, wy = l0 > 0.05 ? dy / l0 * want : 0;
      p.cvx = (p.cvx || 0) + (wx - (p.cvx || 0)) * ka; p.cvy = (p.cvy || 0) + (wy - (p.cvy || 0)) * ka;
      var stp = Math.sqrt(p.cvx * p.cvx + p.cvy * p.cvy) * dt;
      if (l0 <= 0.05 || v === 0) { p.cvx *= 0.6; p.cvy *= 0.6; }
      else if (stp >= l0) { p.x = gx; p.y = gy; }
      else { p.x += p.cvx * dt; p.y += p.cvy * dt; }
      var l = dist(p.x, p.y, p.tx, p.ty);
      p.x = clamp(p.x, 0.8, 49.2); p.y = clamp(p.y, 0.8, 93.2);
      p.ox = ox; p.oy = oy;
      if (p.scrPending && l < 1) { p.scrPending = false; p.scrUntil = t + 2.6; }
    }
    for (var a2 = 0; a2 < 10; a2++) for (var b2 = a2 + 1; b2 < 10; b2++) { // push overlapping bodies apart; a set screener holds his ground
      var A = this.P[a2], B = this.P[b2], ddx = B.x - A.x, ddy = B.y - A.y, dd = Math.sqrt(ddx * ddx + ddy * ddy);
      if (dd >= 2.1 || dd < 0.001) continue;
      var push = (2.1 - dd) * 0.5, wa = A.scrUntil > t ? 0 : 1, wb = B.scrUntil > t ? 0 : 1; if (wa + wb === 0) continue;
      var mA = (A.r.wgt || 215) * (1 + A.r.str / 200), mB = (B.r.wgt || 215) * (1 + B.r.str / 200), fa = wa * mB, fb = wb * mA, sA = fa / (fa + fb), sB = fb / (fa + fb);
      var ux2 = ddx / dd, uy2 = ddy / dd; A.x -= ux2 * push * 2 * sA; A.y -= uy2 * push * 2 * sA; B.x += ux2 * push * 2 * sB; B.y += uy2 * push * 2 * sB;
    }
    for (i = 0; i < 10; i++) { p = this.P[i]; p.x = clamp(p.x, 0.8, 49.2); p.y = clamp(p.y, 0.8, 93.2); p.vx = (p.x - p.ox) / dt; p.vy = (p.y - p.oy) / dt; }
  };

  Sim.prototype.updBall = function () {
    var b = this.ball, f = b.fly, t = this.t;
    if (f) {
      var u = clamp((t - f.t0) / f.dur, 0, 1);
      if (f.type === 'pass') { var T = this.P[f.to]; f.tx = T.x; f.ty = T.y; }
      if (f.type === 'lost' && f.by >= 0) { f.tx = this.P[f.by].x; f.ty = this.P[f.by].y; }
      b.x = f.fx + (f.tx - f.fx) * u; b.y = f.fy + (f.ty - f.fy) * u; b.z = f.type === 'shot' ? Math.sin(u * Math.PI) * 9 + u * 3 : f.type === 'pass' ? 3 + Math.sin(u * Math.PI) * Math.min(6, dist(f.fx, f.fy, f.tx, f.ty) / 7) : 1;
      if (u >= 1) {
        if (f.type === 'lost') { this.turnover(f.txt, f.by >= 0 ? this.P[f.by] : null, f.label); }
        else if (f.type === 'pass') { b.fly = null; b.h = f.to; b.z = 0; this.P[f.to].dribbled = false; this.o.think = Math.max(this.o.think, 0.28); }
        else {
          var sh = this.P[f.shooter];
          this.hot = this.hot || {};
          if (f.make) {
            this.hot[sh.i] = (this.hot[sh.i] || 0) + 1; if (this.hot[sh.i] >= 2) this.tag(14, sh);
            this.score[this.offTeam] += f.pts; this.box[sh.i][0] += f.pts; this.box[sh.i][3]++; if (this.astBy >= 0) this.box[this.offTeam * 5 + this.astBy][2]++;
            this.ev(sh.name + (f.pts === 3 ? ' hits the three' : f.label === 'at the rim' ? ' scores at the rim' : f.label === 'in the paint' ? ' scores in the paint' : ' hits the jumper') + (f.open ? ', wide open.' : f.over ? (f.over.charAt(0) === '>' ? ', right through ' + f.over.slice(1) + '.' : ' over the smaller ' + f.over + '.') : '.'), 'score');
            this.finish('make', f.pts, true);
          } else {
            this.hot[sh.i] = 0;
            this.ev(f.blocked ? f.blocked + ' blocks ' + sh.name + '!' : sh.name + ' misses the ' + (f.pts === 3 ? 'three.' : f.label === 'jumper' ? 'jumper.' : 'shot ' + f.label + '.'), 'miss');
            var hpR = hoop(this.offTeam), angR = this.rand() * Math.PI * 2, rrR = (f.pts === 3 ? 3.5 : 2) + this.rand() * 5, ox0 = f.blocked ? f.fx + (hpR.x - f.fx) * 0.25 : hpR.x, oy0 = f.blocked ? f.fy + (hpR.y - f.fy) * 0.25 : hpR.y;
            var rbx = clamp(ox0 + Math.cos(angR) * rrR, 2, 48), rby = clamp(oy0 + Math.abs(Math.sin(angR)) * rrR * (this.offTeam === 0 ? -1 : 1) * (f.blocked && this.rand() < 0.5 ? -1 : 1), 1.5, 92.5), selfR = this;
            b.fly = null; b.reb = { at: t + 0.72, t0: t, fx: ox0, fy: oy0, x: rbx, y: rby, z0: f.blocked ? 7 : 10 }; b.z = b.reb.z0;
            this.P.forEach(function (q) { var isOff = q.team === selfR.offTeam, inIt = isOff ? selfR.o.crash[q.slot] : !selfR.d.leak[q.slot]; if (inIt) { q.tx = q.tx + (rbx - q.tx) * 0.7; q.ty = q.ty + (rby - q.ty) * 0.7; q.sp = 1; } });
          }
        }
      }
      return;
    }
    if (b.reb) { if (b.reb.x != null) { var ur = clamp((t - b.reb.t0) / (b.reb.at - b.reb.t0), 0, 1); b.x = b.reb.fx + (b.reb.x - b.reb.fx) * ur; b.y = b.reb.fy + (b.reb.y - b.reb.fy) * ur; b.z = b.reb.z0 * (1 - ur) * (1 - ur) + Math.sin(ur * Math.PI) * 3.5 + 1; } if (t >= b.reb.at) this.resolveRebound(); return; }
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
    if (!(this.ball.fly && this.ball.fly.type === 'lost')) this.updDefense(dt);
    this.move(dt);
    if (this.sc <= 0 && !this.done && !this.ball.reb && !(this.ball.fly && this.ball.fly.type === 'shot')) this.turnover('Shot clock violation.', null, 'Shot clock');
  };

  // ---------- live calls ----------
  Sim.prototype.call = function (team, c) {
    if (this.done || !this.o) return false;
    var o = this.o, d = this.d, t = this.t, H = this.holder(), off = this.offTeam;
    if (team === off) {
      if (c.k === 'off') { o.plays = []; o.free = true; o.pendingRead = false; if (o.phase === 'reset') o.phase = 'run'; if (o.beats && !o.gen) { o.beats = null; o.think = 0.2; } o.ho = null; o.opt = null; this.ev('Play called off. Freelance.', 'call'); return true; }
      if (c.k === 'pnr') { if (c.a === c.b || c.a == null || c.b == null) return false; if (o.phase === 'adv') { o.plays = []; } if (o.phase === 'reset') o.phase = 'run'; o.liveQ = { a: c.a, b: c.b }; if (o.beats && !this.ball.fly) { o.beats = null; o.ho = null; o.opt = null; } this.tag(13, this.op(c.b)); this.ev('Coach calls a pick and roll: ' + this.op(c.a).name + ' and ' + this.op(c.b).name + '.', 'call'); return true; }
      if (c.k === 'cut') { var p = this.op(c.s); if (!p || p === H) return false; var hh = w2h(off, p.x, p.y), w = h2w(off, hh.hx > 0 ? 2.5 : -2.5, 7); p.tx = w.x; p.ty = w.y; p.sp = 1; p.scrUntil = 0; p.scrPending = false; if (!o.beats) o.think = Math.max(o.think, 0.55); this.tag(9, p); this.ev(p.name + ' cuts to the rim.', 'call'); return true; }
      return false;
    }
    if (c.k === 'match') { var k = d.assign.indexOf(c.o); if (k < 0 || c.d == null) return false; d.assign[k] = d.assign[c.d]; d.assign[c.d] = c.o; this.tag(2, this.dp(c.d)); this.ev(this.dp(c.d).name + ' switches onto ' + this.op(c.o).name + '.', 'call'); return true; }
    if (c.k === 'double') { d.dbl = { o: c.o, until: t + 6 }; d.dblBy = -1; this.ev('Defense sends a double at ' + this.op(c.o).name + '.', 'call'); return true; }
    if (c.k === 'contest') { d.contest[c.d] = t + 3.5; this.tag(10, this.dp(c.d)); this.ev(this.dp(c.d).name + ' crowds his man.', 'call'); return true; }
    if (c.k === 'move') { d.mv[c.d] = { x: clamp(c.x, 1, 49), y: clamp(c.y, 1, 93), until: t + 3.5 }; return true; }
    if (c.k === 'watch') { d.watch[c.d] = { o: c.o, until: t + 5 }; this.tag(11, this.dp(c.d)); this.ev(this.dp(c.d).name + ' shades toward ' + this.op(c.o).name + '.', 'call'); return true; }
    if (c.k === 'steal') {
      var D = this.dp(c.d); if (!D) return false;
      if (H && !this.ball.fly && pd(D, H) < 6) {
        var ps = clamp(0.11 + (D.r.stl - H.r.hnd) / 200 + (H.driving ? 0.03 : 0), 0.03, 0.32);
        if (this.rand() < ps) { this.loseBall(D.name + ' goes for the steal and gets it!', D, 'Steal', 0, 0, 0.24); }
        else if (this.rand() < 0.15) { var made = 0; for (var q = 0; q < 2; q++) if (this.rand() < H.r.ft) made++; this.score[off] += made; this.ev(D.name + ' reaches in. Foul. ' + H.name + ' makes ' + made + ' of 2.', made ? 'score' : 'miss'); this.finish('ft', made, true); }
        else { D.stun = 1.0; this.ev(D.name + ' gambles for the steal and misses.', 'call'); }
      } else { d.gamble[c.d] = t + 2.5; this.tag(12, D); this.ev(D.name + ' jumps the passing lane.', 'call'); }
      return true;
    }
    return false;
  };

  // compact state for drawing and for sending to the other phone
  Sim.prototype.frame = function () {
    var a = [Math.round(this.sc * 10), Math.round(this.ball.x * 10), Math.round(this.ball.y * 10), Math.round(this.ball.z * 10), this.ball.h], t = this.t;
    for (var i = 0; i < 10; i++) { var p = this.P[i]; a.push(Math.round(p.x * 10), Math.round(p.y * 10), (p.scrUntil > t ? 1 : 0) + (p.stun > 0 ? 2 : 0)); }
    for (var j = 0; j < 5; j++) a.push(this.d && this.d.style !== 'zone' ? this.d.assign[j] : -1);
    a.push(this.offTeam);
    var o = this.o, ph = !o ? 0 : o.phase === 'adv' ? 0 : o.phase === 'reset' ? 1 : (o.beats && !o.gen) ? 2 : 3;
    a.push(o && (ph === 1 || ph === 2) ? o.pi : -1, o && ph === 2 ? o.bi : 0, ph);
    var tg = (this.tags || []).filter(function (q) { return t - q.t < 1.4; });
    for (var k = 0; k < 3; k++) { var q = tg[k]; a.push(q ? q.c : 0, q ? q.i : 0, q ? Math.round((t - q.t) * 10) : 0); }
    a.push(Math.round(t * 100)); // slot 53: replaced by the host's own clock before sending
    var sf = this.ball.fly && this.ball.fly.type === 'shot' && this.lastShot ? this.lastShot : null; a.push(sf ? sf.i : -1, sf ? Math.round(sf.pm * 100) : 0); // a shot in the air: who took it and how good the look was
    return a;
  };

  var E = { Sim: Sim, h2w: h2w, w2h: w2h, hoop: hoop, CW: CW, CL: CL, RIMY: RIMY };
  root.BBEngine = E;
  if (typeof module !== 'undefined') module.exports = E;
})(typeof window !== 'undefined' ? window : globalThis);
