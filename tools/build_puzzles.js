// Usage: node tools/build_puzzles.js /tmp/work/mate1.csv data/puzzles.json
import fs from 'fs';
import { Chess } from 'chess.js';
const [src, dst] = process.argv.slice(2);
const lines = fs.readFileSync(src, 'utf8').split('\n');
const hdr = lines.shift().split(',');
const ix = n => hdr.indexOf(n);
const stats = { rows: 0, bad: 0, multi: 0, single: 0 };
const out = [];
const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
for (const line of lines) {
  if (!line) continue;
  const c = line.split(',');
  stats.rows++;
  const pop = +c[ix('Popularity')], plays = +c[ix('NbPlays')];
  if (pop < 90 || plays < 1000) continue;
  const fen0 = c[ix('FEN')], mv = c[ix('Moves')].split(' ');
  try {
    const g = new Chess(fen0);
    const m0 = g.move({ from: mv[0].slice(0, 2), to: mv[0].slice(2, 4), promotion: mv[0][4] });
    const fen = g.fen();
    const moves = g.moves({ verbose: true });
    const mates = [];
    for (const m of moves) { const t = new Chess(fen); t.move(m.san); if (t.isCheckmate()) mates.push(m); }
    if (mates.length !== 1) { stats.multi++; continue; }
    const mm = mates[0];
    if (mv[1] !== mm.from + mm.to + (mm.promotion || '')) { stats.bad++; continue; }
    stats.single++;
    let checks = 0, caps = 0, bigCaps = 0;
    for (const m of moves) {
      if (m === mm) continue;
      if (m.san.includes('+')) checks++;
      if (m.captured) { caps++; if (VAL[m.captured] >= 5) bigCaps++; }
    }
    const flags = mm.flags;
    const fl = [];
    if (mm.promotion && mm.promotion !== 'q') fl.push('underpromotion');
    else if (mm.promotion) fl.push('promotion');
    if (/[kq]/.test(flags)) fl.push('castling');
    if (flags.includes('e')) fl.push('enpassant');
    if (mm.piece === 'p') fl.push('pawn');
    if (mm.piece === 'n') fl.push('knight');
    if (mm.piece === 'k') fl.push('king');
    if (mm.captured) fl.push('capture');
    // double / discovered check: count checkers after mate
    const t = new Chess(fen); t.move(mm.san);
    const kingSq = t.board().flat().find(s => s && s.type === 'k' && s.color === t.turn()).square;
    const checkers = t.attackers ? t.attackers(kingSq, g.turn()) : [];
    if (checkers.length > 1) fl.push('double');
    else if (checkers.length === 1 && checkers[0] !== mm.to) fl.push('discovered');
    const pieces = fen.split(' ')[0].replace(/[^a-zA-Z]/g, '').length;
    let score = checks * 4 + caps * 1.5 + bigCaps * 3 + moves.length * 0.25 + pieces * 0.3;
    if (fl.includes('underpromotion')) score += 25;
    if (fl.includes('castling')) score += 30;
    if (fl.includes('enpassant')) score += 30;
    if (fl.includes('double')) score += 10;
    if (fl.includes('discovered')) score += 12;
    if (fl.includes('knight') || fl.includes('pawn') || fl.includes('king')) score += 6;
    if (mm.piece === 'q' && !mm.captured) score -= 6; // obvious queen mates
    out.push({ id: c[ix('PuzzleId')], fen, mate: mm.from + mm.to + (mm.promotion || ''), san: mm.san,
      last: mv[0], turn: g.turn() === 'w' ? 'white' : 'black', rating: +c[ix('Rating')], score: +score.toFixed(1),
      checks, caps, moves: moves.length, flags: fl });
  } catch (e) { stats.bad++; }
}
out.sort((a, b) => b.score - a.score);
console.log(stats, 'candidates', out.length);
const N = 2400, top = out.slice(0, N);
// tiers by rank within shipped set
top.forEach((p, i) => { p.tier = i < N * 0.25 ? 4 : i < N * 0.5 ? 3 : i < N * 0.75 ? 2 : 1; });
console.log('score range', top[0].score, top.at(-1).score);
fs.writeFileSync(dst, JSON.stringify(top));
