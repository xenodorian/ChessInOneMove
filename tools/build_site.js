// Builds one self-contained HTML file: site/index.html and ChessInOneMove.html
import fs from 'fs';
import path from 'path';
import { build } from 'esbuild';
const sets = fs.readdirSync('assets/pieces');
const names = { P: 'pawn', N: 'knight', B: 'bishop', R: 'rook', Q: 'queen', K: 'king' };
let pieceCss = '';
for (const s of sets) {
  for (const c of ['w', 'b']) for (const k of Object.keys(names)) {
    const svg = fs.readFileSync(path.join('assets/pieces', s, c + k + '.svg'));
    const uri = 'data:image/svg+xml;base64,' + svg.toString('base64');
    pieceCss += `.set-${s} piece.${c === 'w' ? 'white' : 'black'}.${names[k]}{background-image:url("${uri}")}\n`;
  }
}
const read = f => fs.readFileSync(f, 'utf8');
const css = read('node_modules/chessground/assets/chessground.base.css') + '\n' + pieceCss + '\n' + read('src/style.css');
const res = await build({ entryPoints: ['src/app.js'], bundle: true, minify: true, format: 'iife', write: false, loader: { '.json': 'json' }, target: 'es2019' });
const js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Chess In One Move</title><meta name="theme-color" content="#161512">
<!-- Chess In One Move. GPL-3.0-or-later. Uses chessground (GPL-3.0+), chess.js (BSD-2), Lichess puzzle data (CC0), piece sets: see README. -->
<style>${css}</style></head><body>
<div class="app">
<header><h1>Chess In One <span>Move</span></h1><div class="sub">One mate. No second chances for your streak. <span id="puzzcount"></span> puzzles.</div></header>
<div class="boardwrap" id="boardwrap"><div id="board"></div><div id="promo" hidden></div></div>
<aside class="panel">
<div class="turn" id="turn"></div><div class="tag" id="tierTag"></div>
<div class="msg" id="msg"></div>
<div class="btns"><button id="hint">Hint</button><button id="reveal">Show solution</button><button id="skip">Skip</button><button id="next" class="primary" hidden>Next puzzle</button></div>
<div class="stats"><div><b id="streak">0</b><span>Streak</span></div><div><b id="best">0</b><span>Best</span></div><div><b id="solved">0</b><span>Solved</span></div></div>
<div class="row"><label for="tier">Level</label><select id="tier"></select></div>
<div class="row"><label for="pieces">Pieces</label><select id="pieces"></select></div>
<div class="row"><label for="theme">Board</label><select id="theme"></select></div>
<div class="foot">Puzzle <a id="pid" target="_blank" rel="noopener">-</a> from the Lichess puzzle database (CC0).</div>
</aside></div>
<script>${js}</script></body></html>`;
fs.mkdirSync('site', { recursive: true });
fs.writeFileSync('site/index.html', html);
fs.writeFileSync('ChessInOneMove.html', html);
console.log('built', (html.length / 1024).toFixed(0) + ' KB');
