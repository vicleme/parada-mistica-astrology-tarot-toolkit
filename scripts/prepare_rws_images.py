#!/usr/bin/env python3
"""Turn the Rider-Waite-Smith (1909, "Pam-A") scans downloaded from Wikimedia Commons
into images/riderwaite/1.jpg ... 78.jpg, in the card order used by decks/riderwaite.js.

Expected Commons file names (spaces or underscores both work, case-insensitive):
  Major Arcana : "RWS Tarot 00 Fool.jpg" ... "RWS Tarot 21 World.jpg"
  Minor Arcana : Cups01.jpg..Cups14.jpg, Pents01..14, Wands01..14, Swords01..14
                 (01 = Ace ... 10 = Ten, 11 = Page, 12 = Knight, 13 = Queen, 14 = King)

Deck order in the repo: 22 Major Arcana, then Cups, Pentacles, Wands, Swords.

Usage:
  python scripts/prepare_rws_images.py DOWNLOADS_DIR [--out images/riderwaite] [--height 720] [--dry-run]

Needs Pillow (pip install pillow). Nothing is overwritten unless the 78 cards were all found.
"""
import argparse
import re
import sys
from pathlib import Path

SUITS = ["Cups", "Pents", "Wands", "Swords"]   # order used by decks/riderwaite.js


def find_files(folder: Path):
    found = {}
    for p in folder.iterdir():
        if not p.is_file() or p.suffix.lower() not in (".jpg", ".jpeg", ".png", ".webp"):
            continue
        name = p.stem.replace("_", " ").strip()
        m = re.match(r"(?i)^rws tarot (\d{2})\b", name)
        if m and int(m.group(1)) <= 21:
            found[("major", int(m.group(1)))] = p
            continue
        m = re.match(r"(?i)^(cups|pents|wands|swords)\s*(\d{2})$", name)
        if m and 1 <= int(m.group(2)) <= 14:
            found[(m.group(1).capitalize(), int(m.group(2)))] = p
    return found


def expected_order():
    order = [("major", n) for n in range(22)]
    for suit in SUITS:
        order += [(suit, n) for n in range(1, 15)]
    return order


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("downloads", type=Path)
    ap.add_argument("--out", type=Path, default=Path("images/riderwaite"))
    ap.add_argument("--height", type=int, default=720, help="max height in px (default 720)")
    ap.add_argument("--dry-run", action="store_true", help="only show the mapping")
    args = ap.parse_args()

    if not args.downloads.is_dir():
        sys.exit(f"Folder not found: {args.downloads}")
    found = find_files(args.downloads)
    order = expected_order()
    missing = [k for k in order if k not in found]

    for i, key in enumerate(order, 1):
        print(f"{i:>2}.jpg <- {found[key].name if key in found else '*** MISSING ***'}")
    if missing:
        sys.exit(f"\n{len(missing)} card(s) not found: {missing}. Nothing was written.")
    if args.dry_run:
        print("\nDry run: all 78 cards found.")
        return

    from PIL import Image  # imported here so --help works without Pillow
    args.out.mkdir(parents=True, exist_ok=True)
    for i, key in enumerate(order, 1):
        with Image.open(found[key]) as im:
            im = im.convert("RGB")
            if im.height > args.height:
                w = round(im.width * args.height / im.height)
                im = im.resize((w, args.height), Image.LANCZOS)
            im.save(args.out / f"{i}.jpg", "JPEG", quality=88, optimize=True)
    print(f"\nWrote 78 images to {args.out}/")


if __name__ == "__main__":
    main()
