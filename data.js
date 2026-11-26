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

  // Advanced stats, basketball-reference.com. Name|MP|TS%|FTr|DRB%|TRB%|AST%|STL%|BLK%|TOV%|USG%|OBPM|DBPM|BPM
  var ADV27 = ['Luka Dončić|579|.621|.408|19.5|10.6|39.9|2.4|1.7|14.7|40.4|7.7|0.1|7.8','Shai Gilgeous-Alexander|610|.583|.347|10.0|6.4|25.3|1.1|3.0|7.3|37.0|7.7|0.1|7.8','Victor Wembanyama|549|.630|.329|33.7|21.6|20.9|2.1|11.1|8.4|36.5|11.5|5.1|16.6',
    'Giannis Antetokounmpo|518|.641|.537|32.5|21.7|30.9|1.4|3.7|12.8|32.8|7.2|1.7|8.9','Stephen Curry|263|.719|.475|14.3|7.8|29.5|1.7|0.4|8.1|34.0|12.4|1.5|13.9','Jayson Tatum|552|.576|.414|19.2|10.7|34.6|1.1|2.4|11.8|33.2|5.9|1.0|6.9',
    'Jalen Brunson|621|.548|.313|7.6|5.0|30.9|1.1|0.8|7.7|32.4|4.2|-0.6|3.7','Tyrese Maxey|649|.633|.398|9.2|5.0|25.7|1.5|1.3|9.6|27.2|4.6|-0.5|4.1','Jamal Murray|591|.655|.381|12.4|7.4|24.4|1.5|2.7|11.0|26.1|5.9|-0.1|5.8',
    'Anthony Davis|578|.608|.352|23.1|16.1|11.1|1.8|2.9|8.9|29.3|3.9|-0.3|3.6','Donovan Mitchell|613|.606|.323|12.5|7.2|24.7|2.0|1.5|12.3|29.3|3.6|-0.7|2.9','Deni Avdija|524|.630|.508|18.6|11.0|32.9|1.6|1.3|14.1|29.4|5.9|1.6|7.6',
    'Scottie Barnes|413|.543|.273|17.1|11.8|25.9|2.6|3.2|11.9|31.9|2.8|0.4|3.2','Austin Reaves|423|.658|.434|8.3|5.5|21.3|1.6|1.0|15.4|26.6|3.2|-1.7|1.5','Nikola Jokić|590|.613|.272|25.0|16.8|40.3|2.0|2.4|14.6|27.8|6.0|2.4|8.4',
    'Devin Booker|588|.590|.376|7.0|4.3|24.9|1.7|0.8|10.4|28.7|2.5|-1.1|1.3','Ty Jerome|417|.602|.258|9.9|6.7|29.9|1.9|0.7|11.5|32.5|6.1|-0.4|5.7','Darius Acuff Jr.|659|.505|.197|9.8|5.3|34.6|1.0|0.5|13.5|32.5|0.2|-3.4|-3.2',
    'Cooper Flagg|566|.595|.436|17.0|10.3|33.0|2.6|1.9|13.0|29.6|4.8|1.5|6.3','Cade Cunningham|522|.576|.343|14.1|8.0|40.7|1.9|2.4|13.4|30.5|4.3|0.9|5.2','Franz Wagner|621|.550|.285|18.4|11.0|40.7|1.6|1.0|14.2|30.8|2.1|-0.5|1.6',
    'Pascal Siakam|550|.594|.336|17.1|10.4|19.2|1.5|0.3|9.1|28.1|2.4|-0.4|1.9','Tyler Herro|564|.599|.297|11.5|7.3|25.7|1.6|0.7|11.6|28.0|4.6|-1.7|2.9','Alperen Şengün|558|.622|.427|19.7|16.0|34.5|1.4|2.6|13.8|26.5|7.1|1.6|8.7',
    'Julius Randle|570|.605|.455|15.4|10.5|24.3|1.5|0.6|16.5|27.6|1.7|-2.2|-0.5','Zion Williamson|557|.651|.552|11.6|9.1|14.1|2.6|1.6|10.9|24.2|3.2|-0.7|2.5','Kevin Durant|635|.649|.523|17.7|9.5|16.1|0.7|2.6|14.2|24.5|3.0|-0.2|2.9',
    'Jaylen Brown|531|.578|.324|14.9|9.9|16.9|1.8|1.2|10.8|27.0|1.4|-0.7|0.7','Nickeil Alexander-Walker|539|.562|.233|8.1|5.9|13.6|1.9|1.0|9.3|26.5|1.0|-1.0|0.1','Kyrie Irving|464|.568|.172|9.4|6.6|25.3|1.9|1.3|7.3|27.4|4.4|-0.1|4.3',
    'Karl-Anthony Towns|554|.649|.363|35.1|23.2|22.2|1.6|2.6|15.2|25.6|5.1|2.8|8.0','RJ Barrett|477|.538|.310|17.5|11.0|20.4|0.6|1.5|9.0|26.5|1.4|-1.7|-0.3','Damian Lillard|538|.581|.439|10.0|5.8|22.5|1.2|0.5|10.5|28.1|3.7|-0.8|2.9',
    'Brandon Miller|469|.490|.179|12.2|8.1|16.6|1.7|2.4|11.4|32.4|-0.1|-1.4|-1.5','Norman Powell|383|.583|.466|9.1|5.2|12.9|2.2|0.4|10.1|27.8|0.6|-1.3|-0.7','Darius Garland|559|.597|.286|6.3|3.7|33.6|0.9|0.8|18.5|28.0|1.7|-3.5|-1.7',
    'Joel Embiid|449|.526|.536|23.3|15.3|19.7|1.2|2.9|12.5|29.9|-0.8|-0.5|-1.2','Keyonte George|595|.565|.420|12.5|6.6|34.5|1.2|0.6|15.8|27.6|1.1|-1.0|0.1','Paul George|455|.589|.178|16.3|9.9|23.5|3.5|1.4|12.5|27.8|3.1|2.5|5.6',
    'Zach LaVine|528|.633|.310|11.2|6.5|13.1|1.5|1.5|13.8|24.0|1.9|-1.1|0.8','Jaden McDaniels|647|.655|.174|14.0|10.1|17.1|1.7|2.4|12.3|20.5|2.5|2.7|5.1','Bam Adebayo|557|.614|.557|18.6|14.1|16.5|2.9|2.1|8.7|21.7|3.3|0.6|3.9',
    'James Harden|622|.596|.475|13.3|7.3|24.7|1.2|1.4|16.0|23.4|1.6|-1.6|0.0','Jalen Johnson|478|.534|.355|24.6|14.1|29.5|1.5|1.4|16.1|25.1|-0.2|1.3|1.0','Michael Porter Jr.|524|.585|.358|23.0|12.5|9.0|1.8|1.2|11.2|23.9|0.6|-1.8|-1.2',
    'Yaxel Lendeborg|572|.568|.371|16.5|12.9|18.6|1.7|2.4|15.7|26.5|0.5|-0.5|0.0','Caleb Wilson|308|.525|.253|15.9|10.9|9.8|2.8|2.5|13.0|27.7|-0.2|-1.4|-1.7','Desmond Bane|555|.613|.167|10.3|6.2|14.0|1.7|1.3|11.9|21.8|0.9|-1.0|-0.2',
    'Dylan Harper|475|.588|.245|14.2|9.0|22.0|1.4|0.4|8.2|22.6|2.4|0.6|3.0','Ayo Dosunmu|604|.627|.148|11.2|7.2|16.9|1.9|0.9|14.4|22.1|0.7|1.9|2.6','Kyshawn George|647|.590|.181|12.3|7.3|20.7|1.0|3.0|14.9|22.8|0.5|-0.8|-0.2',
    'Lauri Markkanen|247|.567|.283|18.6|11.8|10.6|1.0|1.9|8.6|24.0|2.4|-0.9|1.5','Naz Reid|540|.473|.169|26.1|14.6|14.5|1.4|1.9|11.7|28.1|-2.5|-0.9|-3.4','Immanuel Quickley|480|.541|.263|11.8|6.3|28.1|1.4|0.2|7.6|23.1|2.3|-1.2|1.1',
    'Duncan Robinson|366|.658|.307|6.2|3.3|10.3|2.2|0.5|6.5|20.3|2.4|0.3|2.6','LaMelo Ball|539|.536|.134|13.5|8.3|30.7|2.8|0.5|17.0|28.7|0.0|1.7|1.7','Ajay Mitchell|480|.549|.223|11.0|6.8|19.5|1.8|1.3|8.9|25.7|-0.2|0.2|0.0',
    'Davion Mitchell|608|.632|.250|6.7|4.0|34.9|1.6|1.6|16.0|18.9|2.6|-1.2|1.3','LeBron James|490|.570|.313|21.8|11.6|32.0|1.7|1.7|13.4|23.0|2.1|1.3|3.4','Trae Young|658|.555|.560|7.6|4.1|37.6|1.9|0.3|15.6|22.7|0.9|-2.0|-1.1',
    'Evan Mobley|384|.647|.328|17.2|12.4|16.7|0.9|3.2|10.3|19.3|4.0|-0.2|3.8','Stephon Castle|575|.541|.200|13.5|9.3|30.9|1.6|0.6|13.5|24.8|2.2|0.2|2.4','AJ Dybantsa|516|.500|.333|17.1|11.3|13.9|1.7|0.9|12.2|23.9|-2.5|-1.3|-3.8',
    'Cameron Boozer|494|.551|.318|24.8|16.6|24.3|1.3|2.3|16.9|24.7|1.4|0.8|2.2','Amen Thompson|589|.610|.403|14.5|12.2|14.5|1.4|2.3|11.3|19.7|2.0|0.0|2.0','OG Anunoby|509|.573|.463|12.5|8.8|8.8|1.6|2.6|12.7|20.7|-1.5|0.9|-0.6',
    'Saddiq Bey|582|.563|.265|12.7|8.2|13.3|1.2|0.9|5.2|20.8|2.2|-2.2|0.0','Jeremiah Fears|585|.518|.230|14.4|9.2|29.8|1.8|1.4|16.1|25.3|-0.8|-1.7|-2.5','Andrew Nembhard|463|.567|.288|7.0|3.7|32.8|0.8|0.4|15.6|21.8|0.2|-1.7|-1.5','Darryn Peterson|574|.512|.247|11.2|8.0|21.9|1.8|2.0|11.1|24.7|-0.3|0.1|-0.2'];
  // 2025-26 full season, same columns. Missing players had no qualifying season (rookies, long injuries).
  var ADV26 = ['Luka Dončić|2289|.616|.443|22.5|12.7|40.5|2.2|1.4|12.8|38.1|8.0|1.3|9.3','Shai Gilgeous-Alexander|2259|.665|.465|11.7|7.0|35.0|2.0|2.3|8.7|33.4|8.7|3.0|11.7','Victor Wembanyama|1866|.626|.417|33.9|21.2|17.6|1.7|9.4|10.8|32.4|6.5|4.2|10.7',
    'Giannis Antetokounmpo|1039|.658|.597|27.4|19.2|38.7|1.6|2.3|13.2|37.0|7.7|1.8|9.5','Stephen Curry|1329|.637|.277|11.7|6.5|27.0|1.8|1.2|11.9|32.5|6.3|-1.0|5.4','Jalen Brunson|2590|.580|.285|9.4|5.3|31.3|1.1|0.3|9.5|30.4|4.0|-0.9|3.1',
    'Tyrese Maxey|2661|.588|.278|11.0|5.9|28.9|2.4|1.9|9.2|29.4|5.0|0.5|5.4','Jamal Murray|2652|.622|.287|12.0|7.0|31.1|1.2|1.0|10.0|27.9|5.5|-1.4|4.1','Donovan Mitchell|2342|.613|.306|12.4|7.4|27.9|2.1|0.8|11.1|32.2|5.2|-0.2|5.1',
    'Deni Avdija|2199|.600|.573|19.0|11.2|32.2|1.1|1.7|16.0|29.3|3.7|0.6|4.3','Scottie Barnes|2681|.577|.264|19.3|12.7|26.3|2.1|4.2|14.3|23.4|1.9|2.3|4.2','Austin Reaves|1762|.641|.487|13.3|8.0|24.0|1.6|1.1|14.0|26.7|3.4|-0.6|2.8',
    'Nikola Jokić|2265|.670|.424|30.4|20.7|50.3|2.0|2.2|15.3|30.4|10.1|4.1|14.2','Devin Booker|2146|.585|.434|10.7|6.4|30.2|1.2|0.8|12.3|32.2|3.2|-1.0|2.2','Cooper Flagg|2344|.548|.286|17.0|10.5|21.5|1.7|2.3|10.7|26.9|1.0|0.4|1.4',
    'Cade Cunningham|2172|.564|.321|15.2|9.2|45.2|2.0|2.5|14.8|30.5|4.8|1.5|6.3','Franz Wagner|1019|.588|.391|14.8|9.7|18.2|1.5|1.0|8.9|27.0|2.6|-0.2|2.5','Pascal Siakam|2057|.562|.327|17.4|10.9|19.9|1.6|1.0|9.5|30.1|1.8|-1.0|0.7',
    'Tyler Herro|1033|.602|.210|14.6|7.9|19.7|1.0|1.0|10.2|24.7|2.4|-0.4|2.0','Alperen Şengün|2398|.569|.335|19.4|14.8|28.9|1.8|3.0|15.0|26.6|2.7|1.5|4.2','Julius Randle|2610|.585|.411|16.5|11.2|23.1|1.6|0.6|13.2|26.5|1.5|0.0|1.5',
    'Zion Williamson|1841|.644|.576|13.5|10.3|17.7|1.6|1.7|11.1|25.7|3.5|-0.6|2.9','Kevin Durant|2840|.641|.339|14.8|8.3|20.7|1.1|2.3|13.5|27.1|4.4|0.1|4.5','Jaylen Brown|2443|.573|.347|18.1|11.1|25.9|1.5|1.1|12.7|36.2|3.5|-0.1|3.3',
    'Nickeil Alexander-Walker|2603|.610|.257|9.1|5.6|15.8|1.9|1.5|10.9|23.9|1.6|-0.4|1.2','Karl-Anthony Towns|2322|.619|.403|31.7|21.4|14.7|1.4|1.8|13.3|25.9|2.7|0.6|3.3','RJ Barrett|1726|.585|.342|16.3|9.9|16.8|1.2|1.1|9.5|25.8|1.0|-0.7|0.2',
    'Brandon Miller|1968|.574|.214|14.0|9.2|17.8|1.7|2.1|12.5|28.1|1.7|-0.1|1.6','Norman Powell|1717|.609|.355|11.0|6.1|12.5|1.7|0.7|9.7|27.2|1.8|-0.3|1.6','Darius Garland|1344|.582|.182|7.4|4.5|34.9|1.6|0.6|15.2|27.4|2.2|-2.4|-0.2',
    'Joel Embiid|1201|.605|.481|20.0|13.3|21.7|0.8|3.6|11.4|33.5|5.1|-0.2|4.9','Keyonte George|1786|.609|.429|10.9|6.0|28.4|1.5|0.8|13.7|27.9|3.0|-2.1|0.9','Paul George|1135|.570|.216|17.1|9.4|17.7|2.6|1.3|10.2|23.3|1.0|0.7|1.7',
    'Zach LaVine|1224|.614|.260|9.4|4.9|11.2|1.1|0.8|10.8|23.7|0.6|-2.2|-1.5','Jaden McDaniels|2316|.611|.218|10.9|7.4|12.2|1.7|2.7|12.9|18.5|-0.9|0.6|-0.3','Bam Adebayo|2365|.551|.369|25.7|16.1|14.1|1.7|1.8|8.3|25.0|1.5|0.4|2.0',
    'James Harden|2438|.610|.467|13.6|7.9|34.7|1.6|1.1|15.3|28.6|4.6|-0.8|3.9','Jalen Johnson|2532|.581|.311|27.8|15.9|33.5|1.7|1.1|14.9|27.0|2.8|1.4|4.2','Michael Porter Jr.|1689|.595|.237|21.7|12.6|18.2|1.6|0.7|10.3|30.5|4.2|-1.2|3.0',
    'Desmond Bane|2756|.607|.287|9.8|6.8|19.3|1.5|1.2|10.8|23.3|1.6|-0.2|1.4','Dylan Harper|1558|.574|.181|12.1|8.1|24.7|1.7|1.4|12.3|21.8|0.3|1.1|1.4','Ayo Dosunmu|1881|.630|.194|10.7|6.8|19.6|1.5|0.8|10.6|20.2|1.3|-0.3|1.0',
    'Kyshawn George|1391|.559|.227|15.9|9.5|22.4|1.6|2.7|16.5|22.8|-0.5|-0.6|-1.2','Lauri Markkanen|1443|.608|.333|15.7|10.8|10.1|1.4|1.4|6.4|28.1|4.6|-2.0|2.6','Naz Reid|2007|.565|.141|20.8|13.1|12.4|1.8|3.4|12.0|22.1|-0.1|1.0|0.9',
    'Immanuel Quickley|2231|.577|.229|12.5|7.2|26.4|2.0|0.2|9.3|21.1|1.9|0.6|2.4','Duncan Robinson|2113|.629|.158|9.2|5.4|10.1|1.0|1.0|6.7|15.8|0.8|-0.1|0.8','LaMelo Ball|2017|.546|.144|15.5|9.7|42.6|2.1|0.8|13.2|32.0|4.8|-0.1|4.7',
    'Ajay Mitchell|1473|.585|.275|10.6|7.0|20.1|2.3|1.2|10.9|21.8|0.3|1.6|1.9','Davion Mitchell|2000|.582|.122|8.0|4.8|29.1|1.6|0.5|16.1|13.6|-1.3|0.4|-0.9','LeBron James|1989|.594|.344|18.3|10.7|34.1|1.8|1.6|14.5|27.2|3.3|0.2|3.5',
    'Evan Mobley|2074|.596|.346|22.7|15.5|16.8|1.1|5.2|11.0|22.6|1.8|1.2|3.0','Stephon Castle|2038|.575|.470|13.5|9.5|34.5|1.8|0.8|18.0|24.9|1.0|0.9|1.9','Amen Thompson|2953|.594|.374|14.0|11.5|20.4|2.0|1.5|13.5|20.0|1.6|1.0|2.6',
    'OG Anunoby|2224|.620|.275|13.4|8.8|9.2|2.3|2.2|12.0|19.7|0.9|1.1|2.0','Saddiq Bey|2246|.579|.305|13.5|9.6|11.9|1.4|0.3|5.8|21.6|2.3|-1.8|0.5','Jeremiah Fears|2112|.525|.245|12.4|7.7|19.9|2.2|1.3|13.8|25.5|-1.4|-1.3|-2.7','Andrew Nembhard|1786|.564|.311|8.4|4.9|37.0|1.4|0.4|13.8|23.6|1.1|-1.9|-0.8'];
  // 2025-26 shooting, per game. Name|G|3P|3PA|3P%|2P%|FT%|FTA
  var SH26 = ['Luka Dončić|64|4.0|10.8|.366|.575|.780|10.1','Shai Gilgeous-Alexander|68|1.7|4.4|.386|.602|.879|9.0','Victor Wembanyama|64|1.9|5.5|.349|.590|.827|7.0','Giannis Antetokounmpo|36|0.4|1.3|.333|.647|.650|9.9','Stephen Curry|43|4.4|11.3|.393|.584|.923|5.1',
    'Jalen Brunson|74|2.6|7.1|.369|.522|.841|5.7','Tyrese Maxey|70|3.1|8.6|.367|.525|.892|6.0','Jamal Murray|75|3.3|7.5|.435|.517|.887|5.2','Donovan Mitchell|70|3.2|8.8|.364|.577|.865|6.1','Deni Avdija|66|1.9|6.0|.318|.547|.802|9.2',
    'Scottie Barnes|80|0.9|2.8|.304|.557|.815|3.7','Austin Reaves|51|2.3|6.4|.360|.588|.871|7.3','Nikola Jokić|65|1.7|4.5|.380|.636|.831|7.4','Devin Booker|64|1.9|5.8|.330|.512|.873|8.1','Cooper Flagg|70|1.0|3.5|.295|.513|.827|4.9',
    'Cade Cunningham|64|2.0|5.7|.342|.514|.812|6.0','Franz Wagner|34|1.4|4.1|.345|.533|.823|5.8','Pascal Siakam|62|1.7|4.7|.358|.527|.693|6.1','Tyler Herro|33|2.5|6.7|.378|.556|.917|3.3','Alperen Şengün|72|0.6|1.8|.305|.547|.691|5.2',
    'Julius Randle|79|1.4|4.4|.315|.547|.802|6.3','Zion Williamson|62|0.0|0.1|.250|.601|.716|7.5','Kevin Durant|78|2.4|5.8|.413|.572|.874|6.0','Jaylen Brown|71|2.0|5.7|.347|.523|.795|7.5','Nickeil Alexander-Walker|78|3.2|8.1|.399|.525|.902|3.9',
    'Karl-Anthony Towns|75|1.5|4.1|.368|.557|.858|5.5','RJ Barrett|57|1.7|5.0|.339|.572|.717|4.9','Brandon Miller|65|3.1|8.2|.383|.489|.892|3.4','Norman Powell|58|2.7|7.1|.380|.546|.827|5.5','Darius Garland|45|2.7|6.8|.396|.514|.861|2.7',
    'Joel Embiid|38|1.4|4.2|.333|.535|.854|8.8','Keyonte George|54|2.5|6.7|.371|.515|.892|7.0','Paul George|37|2.7|6.9|.392|.484|.820|3.0','Zach LaVine|39|2.5|6.5|.390|.556|.880|3.6','Jaden McDaniels|73|1.4|3.4|.412|.562|.835|2.4',
    'Bam Adebayo|73|1.7|5.5|.318|.509|.778|5.8','James Harden|70|3.1|8.2|.375|.495|.884|7.5','Jalen Johnson|72|1.7|4.7|.352|.541|.788|5.3','Michael Porter Jr.|52|3.4|9.3|.363|.567|.859|4.4','Desmond Bane|82|2.0|5.2|.391|.535|.908|4.2',
    'Ayo Dosunmu|69|1.8|4.1|.439|.563|.876|2.1','Kyshawn George|48|2.1|5.4|.381|.486|.802|2.7','Lauri Markkanen|42|2.7|7.7|.355|.559|.896|6.4','Naz Reid|77|2.1|5.8|.362|.556|.732|1.6','Immanuel Quickley|70|2.5|6.8|.374|.520|.821|3.0',
    'Duncan Robinson|77|2.9|7.0|.410|.605|.755|1.4','LaMelo Ball|72|3.8|10.3|.368|.464|.899|2.5','Ajay Mitchell|57|1.1|3.1|.347|.543|.870|2.8','Davion Mitchell|70|1.3|3.3|.395|.561|.646|0.9','LeBron James|60|1.3|4.1|.317|.586|.737|5.3',
    'Evan Mobley|65|1.0|3.2|.297|.626|.606|4.6','Stephon Castle|68|1.2|3.6|.332|.531|.734|5.6','Amen Thompson|79|0.3|1.5|.216|.573|.779|4.9','OG Anunoby|67|2.3|6.1|.386|.584|.828|3.3','Saddiq Bey|72|2.1|5.7|.367|.514|.841|4.1',
    'Jeremiah Fears|82|1.2|3.7|.330|.480|.789|3.0','Andrew Nembhard|57|1.9|5.2|.361|.495|.825|4.1'];
  // 2026-27 shot profile. Name|share of shots 0-3 ft|3-10|10-16|16 ft to 3P|FG% 0-3|3-10|10-16|16 ft to 3P|dunks
  var SHOT27 = ['Luka Dončić|.063|.170|.175|.065|.840|.529|.543|.462|0','Shai Gilgeous-Alexander|.146|.141|.298|.136|.695|.404|.483|.527|5','Victor Wembanyama|.360|.133|.099|.093|.803|.596|.371|.394|77','Giannis Antetokounmpo|.428|.260|.100|.089|.722|.657|.481|.500|49',
    'Stephen Curry|.081|.175|.063|.094|.615|.607|.600|.400|0','Jayson Tatum|.206|.118|.134|.115|.697|.368|.419|.378|9','Jalen Brunson|.144|.169|.200|.132|.569|.317|.521|.404|0','Tyrese Maxey|.256|.171|.078|.092|.720|.480|.348|.556|8',
    'Jamal Murray|.126|.189|.089|.174|.676|.588|.458|.404|3','Anthony Davis|.300|.300|.145|.126|.828|.441|.467|.333|25','Donovan Mitchell|.236|.186|.103|.063|.690|.518|.548|.526|3','Deni Avdija|.308|.270|.055|.021|.603|.563|.538|.400|2',
    'Scottie Barnes|.196|.249|.261|.131|.708|.557|.453|.406|14','Austin Reaves|.095|.291|.249|.016|.722|.655|.447|.000|3','Nikola Jokić|.167|.387|.153|.059|.729|.649|.341|.588|6','Devin Booker|.105|.154|.239|.189|.700|.591|.471|.463|5',
    'Ty Jerome|.050|.200|.242|.096|.833|.604|.517|.348|0','Darius Acuff Jr.|.088|.279|.125|.095|.515|.476|.383|.472|3','Cooper Flagg|.189|.258|.162|.103|.782|.427|.553|.367|21','Cade Cunningham|.172|.193|.201|.099|.702|.528|.473|.444|16',
    'Franz Wagner|.192|.402|.120|.030|.813|.463|.475|.300|3','Pascal Siakam|.245|.234|.175|.063|.714|.493|.500|.389|1','Tyler Herro|.188|.217|.098|.040|.596|.517|.444|.273|4','Alperen Şengün|.394|.360|.085|.025|.720|.424|.400|.500|21',
    'Julius Randle|.307|.228|.133|.025|.676|.382|.531|.333|8','Zion Williamson|.578|.343|.009|.013|.602|.570|.000|1.000|18','Kevin Durant|.112|.129|.307|.158|.926|.355|.459|.605|23','Jaylen Brown|.255|.195|.151|.108|.672|.469|.526|.407|10',
    'Nickeil Alexander-Walker|.219|.086|.089|.024|.578|.400|.385|.429|2','Kyrie Irving|.107|.176|.142|.073|.750|.500|.432|.421|0','Karl-Anthony Towns|.405|.155|.043|.043|.691|.528|.400|.400|13','RJ Barrett|.322|.230|.113|.025|.649|.455|.481|.667|5',
    'Damian Lillard|.120|.159|.060|.056|.500|.400|.533|.643|0','Brandon Miller|.103|.199|.129|.041|.679|.370|.343|.364|8','Norman Powell|.238|.155|.083|.067|.630|.533|.375|.385|0','Darius Garland|.072|.256|.136|.080|.722|.609|.471|.400|0',
    'Joel Embiid|.232|.173|.264|.141|.588|.342|.431|.452|5','Keyonte George|.095|.197|.190|.088|.654|.500|.423|.542|2','Paul George|.124|.124|.124|.120|.700|.467|.500|.276|3','Zach LaVine|.124|.195|.080|.128|.893|.500|.611|.414|11',
    'Jaden McDaniels|.276|.267|.128|.016|.731|.569|.581|.500|20','Bam Adebayo|.230|.306|.143|.071|.778|.683|.464|.286|16','James Harden|.164|.178|.078|.018|.472|.333|.471|.500|0','Jalen Johnson|.336|.253|.124|.023|.781|.382|.222|.200|26',
    'Michael Porter Jr.|.151|.151|.038|.085|.750|.406|.500|.500|8','Yaxel Lendeborg|.210|.306|.081|.040|.673|.500|.200|.200|12','Caleb Wilson|.272|.136|.093|.062|.682|.409|.133|.400|20','Desmond Bane|.084|.097|.070|.066|.579|.409|.438|.400|0',
    'Dylan Harper|.307|.226|.156|.057|.846|.458|.303|.250|10','Ayo Dosunmu|.342|.255|.037|.008|.735|.371|.333|.500|4','Kyshawn George|.204|.189|.133|.019|.673|.451|.472|.200|15','Lauri Markkanen|.106|.150|.080|.018|.500|.412|.222|.000|5',
    'Naz Reid|.132|.282|.107|.050|.649|.329|.400|.357|5','Immanuel Quickley|.069|.161|.189|.046|.467|.571|.439|.500|0','Duncan Robinson|.057|.121|.021|.021|.750|.412|.000|1.000|3','LaMelo Ball|.125|.184|.066|.015|.706|.440|.333|.250|2',
    'Ajay Mitchell|.278|.287|.188|.027|.565|.453|.571|.333|0','Davion Mitchell|.247|.211|.041|.036|.625|.537|.375|.714|1','LeBron James|.317|.240|.087|.077|.793|.341|.375|.429|10','Trae Young|.081|.192|.137|.081|.684|.289|.531|.211|0',
    'Evan Mobley|.394|.182|.058|.015|.741|.400|.250|.500|26','Stephon Castle|.183|.242|.123|.028|.543|.410|.452|.571|16','AJ Dybantsa|.274|.274|.123|.068|.700|.333|.370|.400|26','Cameron Boozer|.251|.246|.052|.024|.623|.385|.455|.200|10',
    'Amen Thompson|.505|.297|.078|.031|.722|.509|.200|.167|37','OG Anunoby|.316|.079|.062|.017|.625|.143|.182|.667|13','Saddiq Bey|.135|.180|.151|.049|.636|.386|.514|.417|8','Jeremiah Fears|.323|.245|.086|.048|.575|.439|.435|.385|8',
    'Andrew Nembhard|.124|.141|.164|.136|.545|.400|.483|.333|0','Darryn Peterson|.067|.307|.176|.026|.722|.463|.404|.286|5'];
  function table(rows, keys) { var m = {}; rows.forEach(function (l) { var f = l.split('|'), o = {}; keys.forEach(function (k, i) { o[k] = +f[i + 1]; }); m[f[0]] = o; }); return m; }
  var AK = ['mp', 'ts', 'ftr', 'drb', 'trb', 'ast', 'stl', 'blk', 'tov', 'usg', 'ob', 'db', 'bpm'];
  var A27 = table(ADV27, AK), A26 = table(ADV26, AK), S26 = table(SH26, ['g', 'm3', 'a3', 'p3', 'p2', 'ft', 'fta']);
  var Z27 = table(SHOT27, ['s0', 's1', 's2', 's3', 'f0', 'f1', 'f2', 'f3', 'dk']);

  var SIZE = { PG: 1, SG: 2, SF: 3, PF: 4, C: 5 };
  var SPD = { PG: 86, SG: 84, SF: 80, PF: 74, C: 66 };
  function cl(v) { return Math.max(40, Math.min(99, Math.round(v))); }
  // What the box score cannot see. [speed, strength, perimeter defense, interior defense]. These are judgment calls, not stats.
  var ADJ = { 'Tyrese Maxey': [9, 0, 0, 0], 'Shai Gilgeous-Alexander': [2, 0, 3, 0], 'Nikola Jokić': [-6, 0, -6, -10], 'Victor Wembanyama': [6, -10, 4, 0], 'Giannis Antetokounmpo': [10, 0, 6, 0],
    'Zion Williamson': [8, 4, -4, 0], 'Amen Thompson': [10, 0, 8, 0], 'Luka Dončić': [-12, 6, -6, 0], 'James Harden': [-10, 4, -5, 0], 'Stephen Curry': [-2, -2, -3, 0], 'LeBron James': [2, 8, 0, 0],
    'Joel Embiid': [-4, 0, 0, 3], 'Alperen Şengün': [-3, 0, -2, -3], 'Kevin Durant': [0, -6, 0, 0], 'Anthony Davis': [4, -2, 4, 4], 'Jalen Brunson': [-5, 3, -8, 0], 'Donovan Mitchell': [3, 0, 0, 0],
    'Kyrie Irving': [0, -2, -4, 0], 'Cooper Flagg': [3, 0, 4, 0], 'Scottie Barnes': [3, 0, 5, 0], 'Bam Adebayo': [6, 0, 8, 2], 'Evan Mobley': [6, -6, 6, 4], 'Trae Young': [0, -6, -10, 0], 'Duncan Robinson': [-3, -4, -6, 0],
    'Jaden McDaniels': [2, 0, 12, 0], 'OG Anunoby': [0, 4, 11, 0], 'Stephon Castle': [0, 2, 5, 0], 'Davion Mitchell': [2, 2, 9, 0], 'Nickeil Alexander-Walker': [0, 0, 5, 0], 'Damian Lillard': [-2, 0, -8, 0],
    'Tyler Herro': [0, -2, -8, 0], 'Darius Garland': [2, -6, -8, 0], 'Devin Booker': [0, 0, -3, 0], 'Austin Reaves': [-2, 0, -4, 0], 'Ayo Dosunmu': [3, 0, 3, 0], 'Jayson Tatum': [0, 2, 4, 0], 'Jaylen Brown': [3, 3, 4, 0],
    'Paul George': [0, 0, 3, 0], 'Keyonte George': [0, 0, -5, 0], 'Norman Powell': [0, 0, -4, 0], 'Zach LaVine': [3, 0, -6, 0], 'Michael Porter Jr.': [-3, 0, -6, 0], 'Lauri Markkanen': [0, 0, -3, 0],
    'Karl-Anthony Towns': [0, 0, -6, -8], 'Julius Randle': [0, 6, -5, 0], 'Franz Wagner': [0, 0, 2, 0], 'Deni Avdija': [0, 3, 2, 0], 'Jamal Murray': [0, 0, -3, 0], 'Naz Reid': [0, 0, 0, -4] };

  function rate(s, name) {
    var size = SIZE[s.pos], adj = ADJ[name] || [0, 0, 0, 0], c = A27[name], p = A26[name], sh = S26[name];
    var wc = c ? c.mp : 1, wp = p ? p.mp * 0.35 : 0;
    function v(k) { var cur = c ? c[k] : 0; return p ? (cur * wc + p[k] * wp) / (wc + wp) : cur; }
    var guard = s.pos === 'PG' ? 8 : s.pos === 'SG' ? 5 : s.pos === 'SF' ? 2 : 0, quick = size <= 3 ? 6 : size === 4 ? 2 : -4;
    // shooting splits: this season plus last season at 60 percent weight, pulled toward league average on small samples
    var ftm = s.fta * s.ft, fgm = (s.pts - s.m3 - ftm) / 2, fga = fgm / (s.fg || 0.45), a2 = Math.max(0.1, fga - s.a3), m2 = Math.max(0, fgm - s.m3);
    var g3a = s.a3 * s.g, g3m = s.m3 * s.g, g2a = a2 * s.g, g2m = m2 * s.g, gfa = s.fta * s.g, gfm = ftm * s.g, vol3 = s.a3;
    if (sh) { var k = sh.g * 0.6; g3a += sh.a3 * k; g3m += sh.m3 * k; g2a += 12 * k; g2m += 12 * k * sh.p2; gfa += sh.fta * k; gfm += sh.fta * k * sh.ft; vol3 = (s.a3 * s.g + sh.a3 * k) / (s.g + k); }
    var p3 = (g3m + 0.355 * 120) / (g3a + 120), p2 = (g2m + 0.53 * 100) / (g2a + 100), ft = (gfm + 0.78 * 40) / (gfa + 40);
    var usg = v('usg'), ast = v('ast'), tov = v('tov'), ob = v('ob'), db = v('db'), bpm = v('bpm'), ftr = v('ftr');
    var r = {
      ins: cl(54 + (p2 - 0.52) * 170 + ftr * 22 + usg * 0.38 + (size >= 4 ? 3 : 0)),
      mid: cl(49 + (ft - 0.75) * 120 + (p3 - 0.355) * 120 + usg * 0.6 + ob * 1.2 + (size <= 3 ? 3 : 0)),
      three: cl(60 + (p3 - 0.34) * 420 + Math.min(vol3, 10) * 1.6),
      ftr: cl(ft * 100),
      hnd: cl(50 + guard * 1.8 + usg * 0.55 + ast * 0.35 - Math.max(0, tov - 12) * 0.8 - (size >= 4 ? (size - 3) * 5 : 0)),
      pas: cl(42 + ast * 1.1 + ast / Math.max(6, tov) * 4),
      pd: cl(58 + db * 3.5 + v('stl') * 4.5 + quick + adj[2]),
      rim: cl(40 + v('blk') * 5.5 + size * 5 + db * 1.5 + v('drb') * 0.2 + adj[3]),
      stl: cl(45 + v('stl') * 17 + quick / 2),
      blk: cl(38 + v('blk') * 7 + size * 3),
      reb: cl(40 + v('trb') * 2.6),
      spd: cl(SPD[s.pos] + v('stl') * 1.5 - (v('trb') > 15 ? 3 : 0) + adj[0]),
      str: cl(50 + size * 6 + v('trb') * 0.55 + ftr * 10 - (s.pos === 'PG' ? 2 : 0) + adj[1]),
      oiq: cl(55 + ob * 3.2 + (v('ts') - 0.57) * 80 + ast / Math.max(6, tov) * 3),
      diq: cl(58 + db * 5 + (v('stl') + v('blk') / 2) * 2.5 + adj[2] * 0.5 + adj[3] * 0.3),
      cmp: cl(55 + (ft - 0.75) * 90 + usg * 0.5 + ob * 1.5 - Math.max(0, tov - 12) * 0.6),
      size: size, ft: ft, fta: s.fta
    };
    var z = Z27[name];
    if (z) { // where he actually shoots from this season, pulled toward league average when the sample is thin
      var tot = Math.max(1, fga * s.g), n0 = z.s0 * tot, n1 = z.s1 * tot, nm = (z.s2 + z.s3) * tot;
      var rimP = (z.f0 * n0 + 0.68 * 30) / (n0 + 30), flP = (z.f1 * n1 + 0.44 * 30) / (n1 + 30);
      var midP = ((z.f2 * z.s2 + z.f3 * z.s3) * tot + 0.42 * 40) / (nm + 40);
      var insZ = 54 + (rimP - 0.68) * 90 + (flP - 0.44) * 40 + z.s0 * 30 + ftr * 18 + usg * 0.3 + z.dk / s.g * 2 + (size >= 4 ? 2 : 0);
      var midZ = 44 + (midP - 0.42) * 110 + (z.s2 + z.s3) * 45 + (ft - 0.75) * 70 + usg * 0.35 + (size <= 3 ? 2 : 0);
      r.ins = cl(r.ins * 0.45 + insZ * 0.55); r.mid = cl(r.mid * 0.5 + midZ * 0.5);
    }
    r.ply = Math.round(r.hnd * 0.5 + r.pas * 0.5);
    var raw = r.ins * 0.14 + r.mid * 0.08 + r.three * 0.13 + r.hnd * 0.10 + r.pas * 0.08 + r.oiq * 0.08 + r.pd * 0.09 + r.rim * 0.07 + r.stl * 0.03 + r.blk * 0.03 + r.diq * 0.06 + r.reb * 0.06 + r.spd * 0.03 + r.str * 0.02;
    r.ovr = cl(0.5 * (55 + 1.85 * (raw - 60)) + 0.5 * (77 + bpm * 2.1)); // half skills, half box plus-minus so impact players rate like it
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
      beats: [[A('scr', 4, 3.5, 29)], [A('drv', 0, 9, 17), A('mv', 4, -1.5, 8), { k: 'opt', s: 0, list: [{ k: 'lay' }, { k: 'pass', to: 4 }, { k: 'sh' }] }]] },
    { id: 'ppop', name: 'Pick and pop', group: 'Pick and roll', note: '5 screens for 1, then steps out for a jumper.',
      setup: BB.FORM['High screen'], ball: 0,
      beats: [[A('scr', 4, 3.5, 29)], [A('drv', 0, 10, 18), A('mv', 4, -9, 27)]] },
    { id: 'horns', name: 'Horns', group: 'Pick and roll', note: 'Bigs at both elbows. 4 screens and rolls, 5 pops.',
      setup: BB.FORM['Horns'], ball: 0,
      beats: [[A('scr', 3, -3.5, 29)], [A('drv', 0, -9, 17), A('mv', 3, 1.5, 8), A('mv', 4, 7, 27), { k: 'opt', s: 0, list: [{ k: 'pass', to: 3 }, { k: 'pass', to: 4 }, { k: 'lay' }, { k: 'sh' }] }]] },
    { id: 'pin', name: 'Pin down', group: 'Off-ball screens', note: '5 screens down for 2, who comes up to the wing for a shot.',
      setup: [[0, 30], [-22.5, 6.5], [18.5, 22], [22.5, 6.5], [-12, 14]], ball: 0,
      beats: [[A('scr', 4, -18, 11)], [A('mv', 1, -17, 23.5)], [A('pass', 0, 1)], [A('sh', 1)]] },
    { id: 'flare', name: 'Flare screen', group: 'Off-ball screens', note: '4 screens away from the ball and 3 fades to the corner side for a three.',
      setup: [[-8, 30], [-20, 20], [10, 28], [16, 20], [-7.5, 9.5]], ball: 0,
      beats: [[A('scr', 3, 13, 25)], [A('mv', 2, 21, 17)], [A('pass', 0, 2)], [A('sh', 2)]] },
    { id: 'dho', name: 'Handoff', group: 'Handoffs', note: '1 passes to 5 at the elbow. 2 takes the handoff and goes straight to the rim in one step.',
      setup: [[0, 31], [19, 21], [-22.5, 6.5], [22.5, 6.5], [7, 21]], ball: 0,
      beats: [[A('pass', 0, 4), A('mv', 0, -14, 26)], [{ k: 'ho', s: 4, to: 1, w: [[14, 26]] }, { k: 'lay', s: 1, x: 1.5, y: 6.5, w: [[3, 15]] }], [A('mv', 4, 3, 7.5), { k: 'opt', s: 1, list: [{ k: 'pass', to: 4 }, { k: 'pass', to: 0 }, { k: 'sh' }] }]] },
    { id: 'weave', name: 'Handoff weave', group: 'Handoffs', note: 'Two handoffs across the top to get a guard going downhill.',
      setup: [[-10, 29], [10, 29], [-22.5, 6.5], [22.5, 6.5], [0, 18]], ball: 0,
      beats: [[{ k: 'drv', s: 0, x: 0, y: 28 }], [{ k: 'ho', s: 0, to: 1, w: [[6, 32]] }, { k: 'drv', s: 1, x: -9, y: 16, w: [[-8, 26]] }, A('mv', 4, 5, 8), { k: 'opt', s: 1, list: [{ k: 'lay' }, { k: 'pass', to: 4 }, { k: 'sh' }] }]] },
    { id: 'gng', name: 'Give and go', group: 'Cuts', note: '1 passes to the wing and cuts hard to the rim for the return pass.',
      setup: BB.FORM['5 out'], ball: 0,
      beats: [[A('pass', 0, 1), A('mv', 0, -2, 7)], [A('pass', 1, 0), A('sh', 0)]] },
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
      beats: [[A('drv', 0, 2, 11), { k: 'opt', s: 0, list: [{ k: 'lay' }, { k: 'pass', to: 1 }, { k: 'pass', to: 2 }, { k: 'pass', to: 3 }] }]] }
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
