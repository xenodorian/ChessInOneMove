import fs from 'fs';
import { Chess } from 'chess.js';
const P = JSON.parse(fs.readFileSync('data/puzzles.json', 'utf8'));
let bad = 0; const ids = new Set(); const tiers = {}; const fl = {};
for (const p of P) {
  const g = new Chess(p.fen); const mates = [];
  for (const m of g.moves({ verbose: true })) { const t = new Chess(p.fen); t.move(m.san); if (t.isCheckmate()) mates.push(m.from + m.to + (m.promotion || '')); }
  const side = g.turn() === 'w' ? 'white' : 'black';
  if (mates.length !== 1 || mates[0] !== p.mate || side !== p.turn || ids.has(p.id)) { bad++; console.log('BAD', p.id, mates); }
  ids.add(p.id); tiers[p.tier] = (tiers[p.tier] || 0) + 1; p.flags.forEach(f => fl[f] = (fl[f] || 0) + 1);
}
console.log({ total: P.length, bad, tiers, flags: fl });
process.exit(bad ? 1 : 0);
