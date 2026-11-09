# Chess In One Move

A chess puzzle game. You get a position that is one move from checkmate. Find the move. Every puzzle has exactly one mating move, and the selection favors positions where plenty of tempting checks and captures are not mate.

## Play

- Download `ChessInOneMove.html` and open it in any modern browser (PC or phone). It is one self-contained file: no install, no internet needed.
- Or play online via GitHub Pages: https://xenodorian.github.io/ChessInOneMove/ (if Pages is enabled for the repo).

## How puzzles were chosen

1. Source: the Lichess puzzle database (CC0), filtered to puzzles tagged `mateIn1`.
2. The player's position is the puzzle FEN after applying the first move in `Moves`.
3. chess.js enumerates all legal moves and finds every move that gives checkmate. Only positions with exactly one mating move are kept, and that move must match the Lichess solution.
4. Each position gets a difficulty score from: non-mating checks available, captures available, number of legal moves, piece count, and bonuses for hard-to-see mates (underpromotion, castling, en passant, discovered or double check, knight/pawn/king mates). Quiet-looking queen mates are scored lower.
5. Only puzzles with popularity >= 90 and >= 1000 plays (105,111 candidate rows; 2,765 had several mates and were dropped, 102,346 had exactly one) are used. The top 2400 by score ship, split into four levels.

Rebuild: `python3 tools/filter_mate1.py lichess_db_puzzle.csv.zst mate1.csv`, then `node tools/build_puzzles.js mate1.csv data/puzzles.json`, then `node tools/build_site.js`.

## Licenses and credits

This project is GPL-3.0-or-later (see `LICENSE`).

- chessground (board UI): GPL-3.0-or-later
- chess.js: BSD-2-Clause
- Puzzle data: Lichess, CC0
- Piece sets (from Lichess lila `public/piece`): cburnett and merida (GPLv2+), chessnut (Apache-2.0), fantasy and celtic (MIT, Maurizio Monge), rhosgfx (CC0)
