/* Sideline: player pool and playbook data.
   Player stats: 2026-27 NBA per-game numbers (basketball-reference.com, pulled Nov 26 2026).
   Ratings are derived from those box-score stats by the formulas in rate() below. */
(function (root) {
  'use strict';
  var BB = root.BB = root.BB || {};

  // Name|Team|Pos|G|MP|PTS|TRB|AST|STL|BLK|TOV|FG%|3P|3PA|3P%|FT%|FTA
  var RAW = [
    'Luka Dončić|LAL|PG|16|36.2|36.6|6.6|7.7|1.8|0.6|5.1|.460|4.8|13.2|.365|.865|10.2',
    'Shai Gilgeous-Alexander|OKC|PG|18|33.9|32.1|4.1|4.7|0.8|1.0|2.2|.480|2.4|6.6|.361|.819|8.3',
    'Victor Wembanyama|SAS|C|18|30.5|30.7|12.5|3.2|1.3|3.8|2.2|.543|2.1|6.7|.317|.778|7.0',
    'Giannis Antetokounmpo|MIA|PF|16|32.4|28.4|12.7|5.4|0.9|1.3|3.3|.603|0.5|2.1|.235|.656|9.6',
    'Stephen Curry|GSW|PG|10|26.3|27.8|3.7|3.9|0.9|0.1|1.7|.500|4.3|9.4|.457|.987|7.6',
    'Jayson Tatum|BOS|SF|16|34.5|27.3|6.8|6.8|0.8|0.8|3.2|.433|2.9|8.6|.343|.842|8.3',
    'Jalen Brunson|NYK|PG|18|34.5|26.1|3.1|5.9|0.7|0.3|2.0|.427|2.9|7.4|.396|.805|6.6',
    'Tyrese Maxey|PHI|PG|18|36.1|25.9|3.3|5.7|1.1|0.5|2.2|.497|2.6|6.8|.374|.872|6.9',
    'Jamal Murray|DEN|PG|16|36.9|25.8|4.8|5.7|1.1|1.1|2.4|.500|3.3|7.1|.456|.883|6.4',
    'Anthony Davis|WAS|PF|17|34.0|25.6|10.1|2.0|1.2|1.1|2.1|.535|0.8|2.4|.350|.817|6.4',
    'Donovan Mitchell|CLE|SG|18|34.1|25.0|4.6|5.1|1.4|0.6|2.9|.495|2.5|7.3|.344|.790|5.8',
    'Deni Avdija|POR|SF|16|32.8|24.9|6.6|6.1|1.1|0.4|3.3|.519|2.4|5.6|.433|.695|8.2',
    'Scottie Barnes|TOR|PF|12|34.4|24.8|7.0|5.0|1.8|1.1|3.1|.494|0.9|3.3|.275|.672|5.6',
    'Austin Reaves|LAL|SG|12|35.3|24.7|3.3|4.7|1.2|0.3|3.4|.513|2.3|5.5|.409|.915|6.8',
    'Nikola Jokić|DEN|C|16|36.9|24.6|10.9|8.9|1.5|0.9|3.4|.530|1.3|4.2|.299|.897|4.9',
    'Devin Booker|PHO|SG|17|34.6|24.5|2.6|5.4|1.2|0.3|2.4|.462|1.9|5.8|.327|.921|6.7',
    'Ty Jerome|MEM|PG|14|29.8|24.5|3.6|5.3|1.1|0.2|2.6|.477|2.8|7.6|.364|.909|4.7',
    'Darius Acuff Jr.|SAC|PG|18|36.6|24.4|3.4|7.3|0.8|0.2|3.8|.401|2.9|9.3|.315|.823|4.4',
    'Cooper Flagg|DAL|SF|17|33.3|24.3|6.3|6.7|1.8|0.6|3.1|.478|1.6|4.9|.321|.850|7.5',
    'Cade Cunningham|DET|PG|15|34.8|24.2|5.1|8.3|1.3|0.9|3.3|.467|1.9|6.1|.315|.830|6.3',
    'Franz Wagner|ORL|SF|17|36.5|24.2|7.0|8.1|1.2|0.4|3.6|.468|1.2|5.0|.235|.842|5.6',
    'Pascal Siakam|IND|PF|17|32.4|22.9|6.2|3.7|1.0|0.1|1.9|.507|1.8|4.8|.370|.729|5.6',
    'Tyler Herro|MIL|SG|18|31.3|22.3|4.4|4.6|1.1|0.2|2.4|.463|2.9|7.5|.393|.841|4.9',
    'Alperen Şengün|HOU|C|17|32.8|22.0|9.3|7.2|0.9|0.9|2.8|.549|1.1|2.2|.514|.713|6.4',
    'Julius Randle|BRK|PF|17|33.5|21.9|6.1|4.6|1.0|0.2|3.6|.490|1.6|4.7|.350|.795|6.9',
    'Zion Williamson|NOP|PF|17|32.8|21.9|5.4|2.6|1.8|0.5|2.1|.583|0.4|0.8|.462|.772|7.5',
    'Kevin Durant|HOU|SF|19|33.4|21.5|5.6|3.7|0.5|0.9|2.7|.508|1.6|4.1|.397|.881|7.1',
    'Jaylen Brown|PHI|SF|16|33.2|21.4|6.0|3.4|1.3|0.4|2.3|.490|1.8|4.6|.378|.714|5.3',
    'Nickeil Alexander-Walker|ATL|SG|17|31.7|21.3|3.5|2.9|1.3|0.4|1.9|.414|3.6|10.0|.359|.868|4.0',
    'Kyrie Irving|DAL|PG|15|30.9|21.3|3.7|4.7|1.2|0.4|1.5|.444|3.2|8.7|.366|.867|3.0',
    'Karl-Anthony Towns|NYK|C|17|32.6|21.2|13.6|4.2|1.0|0.8|2.9|.542|2.1|4.9|.417|.759|5.1',
    'RJ Barrett|TOR|SF|14|34.1|20.9|6.4|4.3|0.4|0.5|1.9|.473|1.5|5.3|.284|.608|5.3',
    'Damian Lillard|POR|PG|18|29.9|20.9|3.2|4.2|0.7|0.2|2.1|.391|3.1|9.1|.341|.908|6.6',
    'Brandon Miller|CHO|SF|15|31.3|20.9|4.5|2.6|1.1|0.7|2.7|.372|3.1|10.1|.303|.887|3.5',
    'Norman Powell|CHI|SG|13|29.5|20.8|2.8|2.4|1.4|0.2|2.0|.446|2.3|6.8|.341|.767|6.9',
    'Darius Garland|LAC|PG|17|32.9|20.7|2.1|6.4|0.6|0.3|3.9|.466|2.5|7.1|.358|.867|4.4',
    'Joel Embiid|PHI|C|14|32.1|20.4|8.9|4.1|0.8|1.0|2.8|.400|0.4|3.0|.143|.881|8.4',
    'Keyonte George|UTA|PG|18|33.1|20.4|4.0|6.8|0.8|0.2|3.4|.427|2.1|6.6|.322|.826|6.4',
    'Paul George|BOS|PF|15|30.3|20.4|5.5|4.1|2.1|0.4|2.5|.456|3.5|8.1|.426|.791|2.9',
    'Zach LaVine|SAC|SG|16|33.0|20.3|3.8|2.6|1.0|0.5|2.6|.496|2.6|6.7|.393|.843|4.4',
    'Jaden McDaniels|MIN|PF|19|34.1|19.2|6.4|3.8|1.2|0.9|2.1|.566|1.7|4.3|.407|.867|2.4',
    'Bam Adebayo|MIA|C|17|32.8|19.1|8.4|3.6|2.0|0.7|1.5|.524|0.8|3.1|.250|.754|6.9',
    'James Harden|CLE|PG|18|34.6|19.1|4.7|6.1|0.8|0.5|3.1|.403|2.8|7.3|.382|.894|6.3',
    'Jalen Johnson|ATL|PF|14|34.1|19.1|9.1|6.9|1.1|0.5|3.4|.447|0.9|4.1|.211|.805|5.5',
    'Michael Porter Jr.|BRK|SF|16|32.8|19.1|7.1|1.8|1.2|0.4|2.1|.438|2.9|8.0|.367|.753|5.1',
    'Yaxel Lendeborg|GSW|SF|18|31.8|19.0|7.4|3.6|1.1|0.8|3.1|.456|1.8|5.2|.355|.760|5.3',
    'Caleb Wilson|CHI|PF|10|30.8|18.9|6.2|1.9|1.8|0.9|2.7|.420|2.3|7.1|.324|.732|4.1',
    'Desmond Bane|ORL|SG|16|34.7|18.7|3.8|3.0|1.2|0.4|2.1|.441|4.2|9.7|.432|.842|2.4',
    'Dylan Harper|SAS|SG|15|31.7|18.4|5.4|4.5|0.9|0.1|1.4|.505|1.1|3.6|.315|.865|3.5',
    'Ayo Dosunmu|MIN|SG|19|31.8|18.1|4.3|3.5|1.3|0.3|2.4|.518|2.3|4.9|.457|.895|2.0',
    'Kyshawn George|WAS|SG|19|34.1|18.1|4.6|4.4|0.7|1.2|2.7|.474|2.6|6.5|.407|.776|2.6',
    'Lauri Markkanen|UTA|PF|8|30.9|18.0|6.8|2.0|0.6|0.6|1.5|.389|3.6|9.1|.397|.844|4.0',
    'Naz Reid|CHO|C|17|31.8|17.7|8.3|2.4|0.9|0.6|2.5|.382|2.5|7.2|.341|.660|2.9',
    'Immanuel Quickley|TOR|PG|15|32.0|17.5|3.5|6.0|0.9|0.1|1.3|.410|2.6|7.7|.336|.789|3.8',
    'Duncan Robinson|DET|SF|12|30.5|17.4|1.8|2.1|1.3|0.2|0.9|.450|3.9|9.1|.431|.837|3.6',
    'LaMelo Ball|MIN|PG|19|28.4|17.3|4.4|5.7|1.6|0.2|3.3|.407|3.3|9.2|.360|.769|2.1',
    'Ajay Mitchell|OKC|SG|17|28.2|17.2|3.6|3.5|1.1|0.4|1.5|.479|1.0|3.2|.315|.796|3.2',
    'Davion Mitchell|MIA|PG|17|35.8|17.2|2.6|8.7|1.2|0.6|2.6|.510|2.5|5.6|.442|.731|3.1',
    'LeBron James|PHI|PF|15|32.7|17.1|6.9|6.9|1.1|0.6|2.3|.485|1.2|3.8|.316|.758|4.1',
    'Trae Young|WAS|PG|19|34.6|17.1|2.6|8.9|1.3|0.1|2.8|.368|2.1|6.3|.328|.863|6.9',
    'Evan Mobley|CLE|PF|12|32.0|16.9|7.3|3.6|0.6|1.1|1.5|.555|1.9|4.0|.479|.622|3.8',
    'Stephon Castle|SAS|SG|19|30.3|16.7|5.3|6.3|1.0|0.2|2.4|.426|2.3|6.0|.377|.833|2.8',
    'AJ Dybantsa|WAS|SF|15|34.4|16.7|7.2|3.1|1.2|0.3|2.3|.420|0.9|3.8|.246|.726|4.9',
    'Cameron Boozer|MEM|PF|16|30.9|16.6|9.2|5.3|0.8|0.8|3.1|.417|1.8|5.6|.322|.896|4.2',
    'Amen Thompson|HOU|SF|18|32.7|16.4|7.1|3.3|0.9|0.8|1.7|.563|0.3|0.9|.353|.699|4.6',
    'OG Anunoby|NYK|PF|15|33.9|16.3|5.4|2.0|1.1|0.9|2.1|.401|2.0|6.2|.323|.878|5.5',
    'Saddiq Bey|NOP|SF|19|30.6|16.2|4.5|2.6|0.8|0.3|0.8|.429|2.3|6.3|.361|.846|3.4',
    'Jeremiah Fears|NOP|PG|19|30.8|16.2|5.1|5.6|1.2|0.4|3.0|.435|1.2|4.2|.288|.806|3.3',
    'Andrew Nembhard|IND|SG|14|33.1|16.1|2.3|7.6|0.6|0.1|2.6|.429|2.3|5.5|.416|.824|3.6',
    'Darryn Peterson|UTA|SG|19|30.2|15.9|4.5|4.0|1.1|0.6|1.9|.401|1.8|5.9|.310|.818|3.5'
  ];

  var SIZE = { PG: 1, SG: 2, SF: 3, PF: 4, C: 5 };
  var SPD = { PG: 86, SG: 84, SF: 80, PF: 74, C: 66 };
  function cl(v) { return Math.max(40, Math.min(99, Math.round(v))); }

  // Athletic nudges the box score cannot see: [speed, strength]. These are judgment calls, not stats.
  var ATH = { 'Tyrese Maxey': [9, 0], 'Shai Gilgeous-Alexander': [2, 0], 'Nikola Jokić': [-6, 0], 'Victor Wembanyama': [6, -10], 'Giannis Antetokounmpo': [10, 0],
    'Zion Williamson': [8, 4], 'Amen Thompson': [10, 0], 'Luka Dončić': [-12, 6], 'James Harden': [-10, 4], 'Stephen Curry': [-2, -2], 'LeBron James': [2, 8],
    'Joel Embiid': [-4, 0], 'Alperen Şengün': [-3, 0], 'Kevin Durant': [0, -6], 'Anthony Davis': [4, -2], 'Jalen Brunson': [-5, 3], 'Donovan Mitchell': [3, 0],
    'Kyrie Irving': [0, -2], 'Cooper Flagg': [3, 0], 'Scottie Barnes': [3, 0], 'Bam Adebayo': [6, 0], 'Evan Mobley': [6, -6], 'Trae Young': [0, -6], 'Duncan Robinson': [-3, -4] };

  function rate(s, name) {
    var size = SIZE[s.pos], ath = ATH[name] || [0, 0];
    var adj3 = (s.p3 * s.a3 + 0.345 * 3) / (s.a3 + 3);
    var guard = s.pos === 'PG' ? 8 : s.pos === 'SG' ? 5 : s.pos === 'SF' ? 2 : 0;
    var quick = size <= 3 ? 6 : size === 4 ? 2 : -4, astTo = s.ast / Math.max(1, s.tov);
    var r = {
      // scoring
      ins: cl(55 + (s.fg - 0.46) * 120 + s.fta * 1.6 + s.pts * 0.45 + (size >= 4 ? 3 : 0)),
      mid: cl(58 + (s.ft - 0.75) * 110 + (adj3 - 0.345) * 110 + s.pts * 0.55 + (size <= 3 ? 2 : 0)),
      three: cl(62 + (adj3 - 0.345) * 320 + Math.min(s.a3, 10) * 1.2),
      ftr: cl(s.ft * 100),
      // playmaking
      hnd: cl(52 + guard * 1.6 + s.ast * 2.2 + s.pts * 0.45 - s.tov - (size >= 4 ? (size - 3) * 5 : 0) + s.fta * 0.8),
      pas: cl(48 + s.ast * 5.2 + astTo * 3 + guard * 0.5),
      // defense
      pd: cl(56 + s.stl * 8 + quick + s.blk * 2 + s.mp * 0.2),
      rim: cl(40 + s.blk * 13 + size * 4 + s.trb * 0.8),
      stl: cl(40 + s.stl * 22 + quick),
      blk: cl(38 + s.blk * 16 + size * 4),
      reb: cl(45 + s.trb * 3.6 + size),
      // athleticism
      spd: cl(SPD[s.pos] + s.stl * 2 - (s.trb > 9 ? 3 : 0) + ath[0]),
      str: cl(50 + size * 6 + s.trb + s.fta * 0.8 - (s.pos === 'PG' ? 2 : 0) + ath[1]),
      // mental
      oiq: cl(55 + astTo * 4 + (s.fg - 0.45) * 70 + s.pts * 0.5 + s.mp * 0.25 - s.tov * 1.2),
      diq: cl(48 + (s.stl + s.blk) * 7 + s.trb * 0.6 + s.mp * 0.3),
      cmp: cl(50 + (s.ft - 0.7) * 80 + s.pts * 0.6 + s.mp * 0.3 - s.tov * 1.5),
      size: size, ft: s.ft, fta: s.fta
    };
    r.ply = Math.round(r.hnd * 0.5 + r.pas * 0.5);
    r.ovr = cl(55 + 1.85 * (-60 + r.ins * 0.14 + r.mid * 0.08 + r.three * 0.13 + r.hnd * 0.10 + r.pas * 0.08 + r.oiq * 0.08 + r.pd * 0.09 + r.rim * 0.07 + r.stl * 0.03 + r.blk * 0.03 + r.diq * 0.06 + r.reb * 0.06 + r.spd * 0.03 + r.str * 0.02));
    return r;
  }

  // attribute groups for display, 2K style
  BB.ATTRS = [
    ['Scoring', [['ins', 'Close shot'], ['mid', 'Mid-range'], ['three', 'Three-point'], ['ftr', 'Free throw']]],
    ['Playmaking', [['hnd', 'Ball handle'], ['pas', 'Pass accuracy']]],
    ['Defense', [['pd', 'Perimeter D'], ['rim', 'Interior D'], ['stl', 'Steal'], ['blk', 'Block'], ['reb', 'Rebounding']]],
    ['Athleticism', [['spd', 'Speed'], ['str', 'Strength']]],
    ['Mental', [['oiq', 'Offensive IQ'], ['diq', 'Defensive IQ'], ['cmp', 'Composure']]]
  ];

  BB.players = RAW.map(function (line, i) {
    var f = line.split('|');
    var s = {
      pos: f[2], g: +f[3], mp: +f[4], pts: +f[5], trb: +f[6], ast: +f[7], stl: +f[8], blk: +f[9], tov: +f[10],
      fg: +f[11], m3: +f[12], a3: +f[13], p3: +f[14], ft: +f[15], fta: +f[16]
    };
    var parts = f[0].split(' ');
    var last = parts.slice(1).join(' ').replace(/ (Jr\.|Sr\.|II|III)$/, '');
    return { id: i, name: f[0], last: last, team: f[1], pos: f[2], s: s, r: rate(s, f[0]) };
  });
  // disambiguate shared last names for court labels
  (function () {
    var seen = {};
    BB.players.forEach(function (p) { seen[p.last] = (seen[p.last] || 0) + 1; });
    BB.players.forEach(function (p) { p.tag = seen[p.last] > 1 ? p.name.charAt(0) + '. ' + p.last : p.last; });
  })();

  // Half-court coordinates: x from -25 (left) to 25 (right), y = feet from the baseline. Hoop at (0, 5.25).
  BB.FORM = {
    '5 out': [[0, 30], [-18.5, 22], [18.5, 22], [-22.5, 6.5], [22.5, 6.5]],
    '4 out 1 in': [[0, 30], [-18.5, 22], [18.5, 22], [22.5, 6.5], [-7.5, 9.5]],
    'Horns': [[0, 31], [-22.5, 6.5], [22.5, 6.5], [-8, 20], [8, 20]],
    'High screen': [[0, 31], [-19, 21], [22.5, 6.5], [-22.5, 6.5], [7, 19]]
  };

  function A(k, s, x, y) { return k === 'pass' ? { k: k, s: s, to: x } : k === 'sh' ? { k: k, s: s } : { k: k, s: s, x: x, y: y }; }

  // Preloaded plays. Slots 0-4 are lineup spots 1-5. A play that ends without a shot hands over to a read.
  BB.PLAYS = [
    { id: 'hpnr', name: 'High pick and roll', group: 'Pick and roll', note: '5 screens for 1 at the top, then rolls to the rim.',
      setup: BB.FORM['High screen'], ball: 0,
      beats: [[A('scr', 4, 3.5, 29)], [A('drv', 0, 9, 17), A('mv', 4, -1.5, 8)]] },
    { id: 'ppop', name: 'Pick and pop', group: 'Pick and roll', note: '5 screens for 1, then steps out for a jumper.',
      setup: BB.FORM['High screen'], ball: 0,
      beats: [[A('scr', 4, 3.5, 29)], [A('drv', 0, 10, 18), A('mv', 4, -9, 27)]] },
    { id: 'horns', name: 'Horns', group: 'Pick and roll', note: 'Bigs at both elbows. 4 screens and rolls, 5 pops.',
      setup: BB.FORM['Horns'], ball: 0,
      beats: [[A('scr', 3, -3.5, 29)], [A('drv', 0, -9, 17), A('mv', 3, 1.5, 8), A('mv', 4, 7, 27)], [{ k: 'opt', s: 0, list: [{ k: 'pass', to: 3 }, { k: 'pass', to: 4 }, { k: 'sh' }] }]] },
    { id: 'pin', name: 'Pin down', group: 'Off-ball screens', note: '5 screens down for 2, who comes up to the wing for a shot.',
      setup: [[0, 30], [-22.5, 6.5], [18.5, 22], [22.5, 6.5], [-12, 14]], ball: 0,
      beats: [[A('scr', 4, -18, 11)], [A('mv', 1, -17, 23.5)], [A('pass', 0, 1)], [A('sh', 1)]] },
    { id: 'flare', name: 'Flare screen', group: 'Off-ball screens', note: '4 screens away from the ball and 3 fades to the corner side for a three.',
      setup: [[-8, 30], [-20, 20], [10, 28], [16, 20], [-7.5, 9.5]], ball: 0,
      beats: [[A('scr', 3, 13, 25)], [A('mv', 2, 21, 17)], [A('pass', 0, 2)], [A('sh', 2)]] },
    { id: 'dho', name: 'Handoff', group: 'Handoffs', note: '1 passes to 5 at the elbow, 2 curls in for the handoff and attacks.',
      setup: [[0, 31], [19, 21], [-22.5, 6.5], [22.5, 6.5], [7, 21]], ball: 0,
      beats: [[A('pass', 0, 4), A('mv', 0, -14, 26)], [{ k: 'ho', s: 4, to: 1, c: [14, 26] }], [A('drv', 1, 0, 12), A('mv', 4, 3, 7.5)], [{ k: 'opt', s: 1, list: [{ k: 'sh' }, { k: 'pass', to: 4 }, { k: 'pass', to: 0 }] }]] },
    { id: 'weave', name: 'Handoff weave', group: 'Handoffs', note: 'Two handoffs across the top to get a guard going downhill.',
      setup: [[-10, 29], [10, 29], [-22.5, 6.5], [22.5, 6.5], [0, 18]], ball: 0,
      beats: [[{ k: 'drv', s: 0, x: 0, y: 28 }], [{ k: 'ho', s: 0, to: 1, c: [6, 32] }], [{ k: 'drv', s: 1, x: -9, y: 16, c: [-8, 26] }, A('mv', 4, 5, 8), A('mv', 0, 16, 25)], [{ k: 'opt', s: 1, list: [{ k: 'sh' }, { k: 'pass', to: 4 }, { k: 'pass', to: 0 }] }]] },
    { id: 'gng', name: 'Give and go', group: 'Cuts', note: '1 passes to the wing and cuts hard to the rim for the return pass.',
      setup: BB.FORM['5 out'], ball: 0,
      beats: [[A('pass', 0, 1), A('mv', 0, -2, 7)], [A('pass', 1, 0)], [A('sh', 0)]] },
    { id: 'back', name: 'Backdoor', group: 'Cuts', note: '2 steps out toward the ball, then cuts behind his defender.',
      setup: [[4, 31], [-19, 22], [18.5, 22], [22.5, 6.5], [-7, 19]], ball: 0,
      beats: [[A('pass', 0, 4), A('mv', 1, -21, 26)], [A('mv', 1, -3, 6.5)], [A('pass', 4, 1)], [A('sh', 1)]] },
    { id: 'post', name: 'Post entry', group: 'Post', note: 'Ball goes to 5 on the block. He works on his man, the rest space out.',
      setup: BB.FORM['4 out 1 in'], ball: 0,
      beats: [[A('pass', 0, 1)], [A('pass', 1, 4), A('mv', 0, 12, 27)], [{ k: 'drv', s: 4, x: -3, y: 6.5, post: 1 }]] },
    { id: 'iso', name: 'Clear out', group: 'Isolation', note: 'Everyone clears to one side and 3 goes one on one.',
      setup: [[8, 31], [22.5, 6.5], [-17, 23], [22, 17], [9, 6.5]], ball: 0,
      beats: [[A('pass', 0, 2)], [A('drv', 2, -3, 8)]] },
    { id: 'dnk', name: 'Drive and kick', group: 'Isolation', note: '1 attacks the paint from the top with four shooters spaced.',
      setup: BB.FORM['5 out'], ball: 0,
      beats: [[A('drv', 0, 2, 11)]] }
  ];
  BB.GROUPS = ['Pick and roll', 'Off-ball screens', 'Handoffs', 'Cuts', 'Post', 'Isolation'];

  // Concepts that can be dropped into a custom play. a and b are slots, st is the state at the insert point.
  BB.CONCEPTS = [
    { id: 'pnr', name: 'Pick and roll', pick: ['Ball handler', 'Screener'], make: function (a, b, st) {
        var p = st.pos[a], side = p[0] >= 0 ? -1 : 1;
        return [[A('scr', b, p[0] + side * 3.5, p[1] - 1.5)], [A('drv', a, p[0] * 0.3 + side * 8, Math.max(12, p[1] - 13)), A('mv', b, -side * 1.5, 8)]]; } },
    { id: 'pop', name: 'Pick and pop', pick: ['Ball handler', 'Screener'], make: function (a, b, st) {
        var p = st.pos[a], side = p[0] >= 0 ? -1 : 1;
        return [[A('scr', b, p[0] + side * 3.5, p[1] - 1.5)], [A('drv', a, p[0] * 0.3 + side * 9, Math.max(13, p[1] - 12)), A('mv', b, p[0] - side * 9, 27)]]; } },
    { id: 'pin', name: 'Pin down', pick: ['Shooter', 'Screener'], make: function (a, b, st) {
        var p = st.pos[a], out = [[A('scr', b, p[0] * 0.85, p[1] + 5)], [A('mv', a, p[0] * 0.8, Math.min(26, p[1] + 16))]];
        if (st.ball !== a && st.ball !== b) out.push([A('pass', st.ball, a)]);
        return out; } },
    { id: 'dho', name: 'Handoff', pick: ['Receiver', 'Passer with the ball'], make: function (a, b) {
        return [[{ k: 'ho', s: b, to: a }]]; } },
    { id: 'gng', name: 'Give and go', pick: ['Passer with the ball', 'Receiver'], make: function (a, b) {
        return [[A('pass', a, b), A('mv', a, 2, 7)], [A('pass', b, a)]]; } },
    { id: 'back', name: 'Backdoor cut', pick: ['Cutter', 'Passer with the ball'], make: function (a, b, st) {
        var p = st.pos[a];
        return [[A('mv', a, p[0] * 1.05, p[1] + 4)], [A('mv', a, p[0] > 0 ? 3 : -3, 6.5)], [A('pass', b, a)]]; } }
  ];

  BB.OFF_STYLES = [
    { id: 'motion', name: 'Motion', note: 'Pass, cut, screen away, take the open shot.' },
    { id: 'pnr', name: 'Pick and roll', note: 'A handler and a screener attack, three space out.' },
    { id: 'iso', name: 'Isolation', note: 'Clear out and let one scorer work.' },
    { id: 'post', name: 'Post up', note: 'Feed the big down low, play inside out.' },
    { id: 'dnk', name: 'Drive and kick', note: 'Attack the paint, kick out to shooters.' }
  ];
  BB.DEF_STYLES = [
    { id: 'man', name: 'Man', note: 'Everyone guards his matchup.' },
    { id: 'switch', name: 'Switch all', note: 'Swap matchups on every screen. No open shots, but mismatches.' },
    { id: 'zone', name: '2-3 zone', note: 'Pack the paint. Stops drives and post ups, gives up threes.' },
    { id: 'press', name: 'Full court press', note: 'Pressure the ball up the floor. Steals, or easy baskets if it breaks.' },
    { id: 'mix', name: 'Mix it up', note: 'A different look each possession, picked at random.' }
  ];

  if (typeof module !== 'undefined') module.exports = BB;
})(typeof window !== 'undefined' ? window : globalThis);
