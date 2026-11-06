# /// script
# requires-python = ">=3.11"
# dependencies = ["python-chess==1.999", "zstandard==0.25.0"]
# ///
"""Bounded chronological sample from a public CC0 Lichess monthly archive.

Only complete games are processed. No personal token, username sampling, or
opening-explorer access. Counts describe this sample, not all of Lichess.
"""
import argparse
import datetime
import io
import json
import re
import urllib.request
from pathlib import Path

import chess.pgn
import zstandard

ROOT = ["e2e4", "e7e5", "g1f3", "b8c6", "d2d4", "e5d4", "f1c4"]
OPENING = "scotch"
OUTPUT = "data/public-sample.json"


def parse_candidate(text):
    headers = dict(re.findall(r'^\[(\w+) "([^"\n]*)"\]', text, re.M))
    try:
        ratings = [int(headers[k]) for k in ("WhiteElo", "BlackElo")]
        seconds, increment = map(int, headers["TimeControl"].split("+"))
    except (KeyError, ValueError):
        return None
    if not (all(1800 <= r <= 2200 for r in ratings) and 480 <= seconds + 40 * increment < 1500):
        return None
    # Cheap prefilter only. The exact legal UCI prefix below determines inclusion.
    body = text.split("\n\n", 1)[-1]
    opening_markers = {"caro": ("c6",), "vienna": ("Nc3", "Nf6", "f4"), "scotch": ("Bc4", "exd4")}
    if not all(marker in body[:1500] for marker in opening_markers[OPENING]):
        return None
    game = chess.pgn.read_game(io.StringIO(text))
    if game is None or game.errors:
        return None
    moves = [move.uci() for move in game.mainline_moves()]
    if moves[:len(ROOT)] != ROOT:
        return None
    return {"url": headers.get("Site"), "date": headers.get("UTCDate"), "ratings": ratings,
            "timeControl": headers["TimeControl"], "result": headers.get("Result"), "moves": moves[:40]}


def main():
    global ROOT, OPENING, OUTPUT
    parser = argparse.ArgumentParser()
    parser.add_argument("--month", default="2026-09")
    parser.add_argument("--max-games", type=int, default=2_000_000)
    parser.add_argument("--target", type=int, default=600)
    parser.add_argument("--opening", choices=["scotch", "caro", "vienna"], default="scotch")
    args = parser.parse_args()
    OPENING = args.opening
    if OPENING == "caro":
        ROOT = ["e2e4", "c7c6"]
        OUTPUT = "data/caro/public-sample.json"
    elif OPENING == "vienna":
        ROOT = ["e2e4", "e7e5", "b1c3", "g8f6", "f2f4"]
        OUTPUT = "data/vienna/public-sample.json"
    if not re.fullmatch(r"20\d{2}-(0[1-9]|1[0-2])", args.month):
        raise ValueError("Month must be YYYY-MM")
    url = f"https://database.lichess.org/standard/lichess_db_standard_rated_{args.month}.pgn.zst"
    request = urllib.request.Request(url, headers={"User-Agent": "Openboard-study/0.1 public-data-sample"})
    found, seen, first_date, last_date = [], 0, None, None
    stop = "archive-end"
    # The validated month is inserted into a fixed HTTPS origin, never an arbitrary URL.
    with urllib.request.urlopen(request, timeout=90) as response:  # noqa: S310
        archive_etag = response.headers.get("ETag")
        archive_size = response.headers.get("Content-Length")
        with (
            zstandard.ZstdDecompressor().stream_reader(response) as reader,
            io.TextIOWrapper(reader, encoding="utf-8") as stream,
        ):
            block = []
            for line in stream:
                if line.startswith('[Event "') and block:
                    text = "".join(block)
                    seen += 1
                    date = re.search(r'^\[UTCDate "([^"\n]*)"\]', text, re.M)
                    if date:
                        first_date = first_date or date[1]
                        last_date = date[1]
                    candidate = parse_candidate(text)
                    if candidate:
                        found.append(candidate)
                    if seen % 100_000 == 0:
                        print(f"scanned={seen} opening_matches={len(found)}", flush=True)
                    if len(found) >= args.target or seen >= args.max_games:
                        stop = "target-matches" if len(found) >= args.target else "max-games"
                        break
                    block = []
                block.append(line)
            else:
                if block:
                    seen += 1
                    candidate = parse_candidate("".join(block))
                    if candidate:
                        found.append(candidate)
    if not found:
        raise RuntimeError("No qualifying opening games; do not invent a dataset")
    data = {"source": url, "license": "CC0", "collectedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "archiveETag": archive_etag, "archiveCompressedBytes": archive_size,
            "scannedGames": seen, "matchedGames": len(found), "firstScannedDate": first_date,
            "lastScannedDate": last_date, "stopReason": stop,
            "filters": {"bothPlayerRatings": [1800, 2200], "estimatedDurationSeconds": [480, 1500],
                        "durationDefinition": "base seconds + 40 * increment; upper bound exclusive", "rootUCI": ROOT},
            "limitations": ["Chronological prefix sample, not random or site-wide",
                            "Lichess rating proxy only; no exact Chess.com normalization",
                            "Exact selected opening move order; transposed entries are excluded",
                            "Stopping policy can concentrate dates; counts apply only to retained games"],
            "games": found}
    Path(OUTPUT).parent.mkdir(parents=True, exist_ok=True)
    Path(OUTPUT).write_text(json.dumps(data, indent=2) + "\n")
    print(f"PUBLIC_SAMPLE_OK scanned={seen} matched={len(found)}", flush=True)


if __name__ == "__main__":
    main()
