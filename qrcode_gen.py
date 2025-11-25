#!/usr/bin/env python3
import argparse
import os
import sys
from urllib.parse import urlparse

import segno


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="qrcode-gen",
        description="Generate a PNG QR code from a URL or any text.",
        formatter_class=argparse.RawTextHelpFormatter,
        epilog=(
            "Examples:\n"
            "  python qrcode_gen.py 'https://example.com'\n"
            "  python qrcode_gen.py 'https://example.com' -o ./out/example.png\n"
            "  python qrcode_gen.py 'hello world' --fg '#222' --bg '#fff' -s 10\n"
            "  python qrcode_gen.py 'https://example.com' -e H --border 2\n"
        ),
    )
    parser.add_argument("text", help="The URL or text to encode into the QR code")
    parser.add_argument(
        "-o",
        "--output",
        help="Output PNG file path. Defaults to a name derived from text.",
    )
    parser.add_argument(
        "-s",
        "--scale",
        type=int,
        default=8,
        help="Pixel scale factor (default: 8)",
    )
    parser.add_argument(
        "-e",
        "--ecc",
        choices=["L", "M", "Q", "H"],
        default="M",
        help="Error correction level (L, M, Q, H). Default: M",
    )
    parser.add_argument("--fg", default="#000000", help="Foreground color (default: #000000)")
    parser.add_argument("--bg", default="#FFFFFF", help="Background color (default: #FFFFFF)")
    parser.add_argument(
        "--border",
        type=int,
        default=4,
        help="Quiet zone size in modules (default: 4)",
    )
    return parser.parse_args()


def safe_filename_from_text(text: str) -> str:
    parsed = urlparse(text)
    base = "qrcode"
    if parsed.scheme and parsed.netloc:
        base = parsed.netloc or base
    else:
        # Use first 24 safe chars from text
        safe = "".join(c for c in text if c.isalnum() or c in ("-", "_"))
        base = (safe[:24] or base)
    return f"{base}.png"


def ensure_png_path(path: str) -> str:
    root, ext = os.path.splitext(path)
    return path if ext.lower() == ".png" else f"{root}.png"


def main() -> int:
    args = parse_args()
    text = args.text.strip()
    if not text:
        print("Error: input text is empty", file=sys.stderr)
        return 2
    if args.scale <= 0:
        print("Error: scale must be a positive integer", file=sys.stderr)
        return 2
    if args.border < 0:
        print("Error: border must be zero or a positive integer", file=sys.stderr)
        return 2
    output = args.output or safe_filename_from_text(text)
    output = ensure_png_path(output)
    out_dir = os.path.dirname(output)
    if out_dir:
        try:
            os.makedirs(out_dir, exist_ok=True)
        except Exception as exc:
            print(f"Error: cannot create output directory '{out_dir}': {exc}", file=sys.stderr)
            return 2
    parsed = urlparse(text)
    if parsed.scheme and not parsed.netloc:
        print("Warning: input looks like a malformed URL; proceeding as plain text", file=sys.stderr)
    try:
        qr = segno.make(text, error=args.ecc)
        qr.save(
            output,
            scale=args.scale,
            border=args.border,
            dark=args.fg,
            light=args.bg,
        )
        print(f"Wrote {output}")
        return 0
    except Exception as exc:
        print(f"Failed to generate QR code: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
