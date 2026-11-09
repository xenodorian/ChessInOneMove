import { Chess } from 'chess.js';
import { Chessground } from 'chessground';
import PUZZLES from '../data/puzzles.json';

const $ = id => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem('c1m_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('c1m_' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
};
const TIER_NAMES = { 0: 'All', 1: 'Warm-up', 2: 'Tricky', 3: 'Devious', 4: 'Brutal' };
const state = {
  tier: store.get('tier', 0), set: store.get('set', 'cburnett'), theme: store.get('theme', 'brown'),
  seen: store.get('seen', []), streak: store.get('streak', 0), best: store.get('best', 0),
  solved: store.get('solved', 0), puzzle: null, locked: false, tries: 0, hinted: false,
};
let cg = null, chess = null;

function applyLook() {
  const root = $('boardwrap');
  root.className = 'boardwrap set-' + state.set + ' theme-' + state.theme;
}
function pickPuzzle() {
  const pool = PUZZLES.filter(p => state.tier === 0 || p.tier === state.tier);
  let fresh = pool.filter(p => !state.seen.includes(p.id));
  if (!fresh.length) { state.seen = state.seen.filter(id => !pool.some(p => p.id === id)); fresh = pool; }
  return fresh[Math.floor(Math.random() * fresh.length)];
}
function destsOf(c) {
  const d = new Map();
  for (const m of c.moves({ verbose: true })) {
    if (!d.has(m.from)) d.set(m.from, []);
    d.get(m.from).push(m.to);
  }
  return d;
}
function setMsg(text, cls) { const m = $('msg'); m.textContent = text; m.className = 'msg ' + (cls || ''); }
function updateStats() {
  $('streak').textContent = state.streak; $('best').textContent = state.best; $('solved').textContent = state.solved;
}
function loadPuzzle() {
  const p = pickPuzzle(); state.puzzle = p; state.locked = false; state.tries = 0; state.hinted = false;
  state.seen.push(p.id); store.set('seen', state.seen.slice(-3000));
  chess = new Chess(p.fen);
  const color = p.turn;
  const cfg = {
    fen: p.fen, orientation: color, turnColor: color, check: chess.inCheck() ? color : false,
    lastMove: [p.last.slice(0, 2), p.last.slice(2, 4)],
    movable: { free: false, color, dests: destsOf(chess), showDests: false, events: { after: onMove } },
    draggable: { showGhost: true }, premovable: { enabled: false }, highlight: { lastMove: false, check: true },
    animation: { enabled: true, duration: 200 }, coordinates: true,
  };
  if (!cg) cg = Chessground($('board'), cfg); else cg.set(cfg);
  cg.setShapes([]);
  $('turn').textContent = (color === 'white' ? 'White' : 'Black') + ' to move';
  $('tierTag').textContent = TIER_NAMES[p.tier] + ' (rated ' + p.rating + ')';
  $('next').hidden = true; $('reveal').hidden = false; $('hint').hidden = false;
  setMsg('Find the one move that gives checkmate.', '');
  $('pid').textContent = p.id; $('pid').href = 'https://lichess.org/training/' + p.id;
  document.body.classList.remove('won', 'lost');
}
function isPromo(from, to) {
  const pc = chess.get(from);
  return pc && pc.type === 'p' && (to[1] === '8' || to[1] === '1');
}
function onMove(from, to) {
  if (state.locked) return;
  if (isPromo(from, to)) { askPromo(from, to); return; }
  judge(from, to, undefined);
}
function askPromo(from, to) {
  const color = state.puzzle.turn, box = $('promo'); box.innerHTML = '';
  for (const t of ['q', 'r', 'b', 'n']) {
    const b = document.createElement('button');
    b.className = 'promo-btn ' + 'set-' + state.set; b.dataset.role = t;
    b.innerHTML = '<piece class="' + color + ' ' + ({ q: 'queen', r: 'rook', b: 'bishop', n: 'knight' })[t] + '"></piece>';
    b.onclick = () => { box.hidden = true; judge(from, to, t); };
    box.appendChild(b);
  }
  box.hidden = false;
}
function judge(from, to, promo) {
  const p = state.puzzle;
  const uci = from + to + (promo || '');
  const test = new Chess(p.fen);
  let mv; try { mv = test.move({ from, to, promotion: promo }); } catch (e) { mv = null; }
  if (mv && test.isCheckmate()) { win(mv, test); return; }
  state.tries++;
  const why = !mv ? 'Illegal move.' : test.inCheck() ? 'That is check, but not mate.' : 'Not checkmate.';
  document.body.classList.add('lost');
  setTimeout(() => document.body.classList.remove('lost'), 400);
  if (state.streak > 0) { state.streak = 0; store.set('streak', 0); updateStats(); }
  setMsg(why + ' Try again.', 'bad');
  setTimeout(() => { cg.set({ fen: p.fen, turnColor: p.turn, check: chess.inCheck() ? p.turn : false, lastMove: [p.last.slice(0, 2), p.last.slice(2, 4)], movable: { color: p.turn, dests: destsOf(chess) } }); }, 350);
}
function win(mv, after) {
  state.locked = true;
  if (state.tries === 0) { state.streak++; state.best = Math.max(state.best, state.streak); }
  state.solved++;
  store.set('streak', state.streak); store.set('best', state.best); store.set('solved', state.solved);
  updateStats();
  cg.set({ fen: after.fen(), turnColor: after.turn() === 'w' ? 'white' : 'black', check: after.turn() === 'w' ? 'white' : 'black', lastMove: [mv.from, mv.to], movable: { color: undefined, dests: new Map() } });
  const pretty = (state.puzzle.flags || []).filter(f => ['underpromotion', 'castling', 'enpassant', 'double', 'discovered'].includes(f));
  setMsg('Checkmate! ' + mv.san + (state.tries ? ' (after ' + state.tries + ' wrong ' + (state.tries === 1 ? 'try' : 'tries') + ')' : ' on the first try.') + (pretty.length ? ' Trick: ' + pretty.join(', ') + '.' : ''), 'good');
  document.body.classList.add('won');
  $('next').hidden = false; $('reveal').hidden = true; $('hint').hidden = true;
}
function reveal() {
  if (state.locked) return;
  const p = state.puzzle;
  state.locked = true; state.streak = 0; store.set('streak', 0); updateStats();
  const from = p.mate.slice(0, 2), to = p.mate.slice(2, 4);
  cg.set({ movable: { color: undefined, dests: new Map() } });
  cg.setShapes([{ orig: from, dest: to, brush: 'green' }]);
  setMsg('Solution: ' + p.san + '#', 'info');
  $('next').hidden = false; $('reveal').hidden = true; $('hint').hidden = true;
}
function hint() {
  if (state.locked) return;
  const from = state.puzzle.mate.slice(0, 2);
  cg.setShapes([{ orig: from, brush: 'yellow' }]);
  state.streak = 0; store.set('streak', 0); updateStats();
  state.tries++; setMsg('Hint: the highlighted piece delivers mate.', 'info');
}
function fillSelect(id, opts, cur, onchange) {
  const s = $(id); s.innerHTML = '';
  for (const [v, l] of opts) { const o = document.createElement('option'); o.value = v; o.textContent = l; s.appendChild(o); }
  s.value = String(cur); s.onchange = () => onchange(s.value);
}
function init() {
  fillSelect('tier', [[0, 'All levels'], [1, 'Warm-up'], [2, 'Tricky'], [3, 'Devious'], [4, 'Brutal']], state.tier, v => { state.tier = +v; store.set('tier', state.tier); loadPuzzle(); });
  fillSelect('pieces', [['cburnett', 'Classic'], ['merida', 'Merida'], ['chessnut', 'Chessnut'], ['fantasy', 'Fantasy'], ['celtic', 'Celtic'], ['rhosgfx', 'Modern']], state.set, v => { state.set = v; store.set('set', v); applyLook(); });
  fillSelect('theme', [['brown', 'Walnut'], ['green', 'Forest'], ['blue', 'Ocean'], ['slate', 'Slate'], ['rose', 'Rose']], state.theme, v => { state.theme = v; store.set('theme', v); applyLook(); });
  $('next').onclick = loadPuzzle; $('reveal').onclick = reveal; $('hint').onclick = hint; $('skip').onclick = () => { if (!state.locked) { state.streak = 0; store.set('streak', 0); updateStats(); } loadPuzzle(); };
  $('puzzcount').textContent = PUZZLES.length;
  applyLook(); updateStats(); loadPuzzle();
}
init();
