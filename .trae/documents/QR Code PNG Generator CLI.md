## Overview
- Create a simple command-line tool that takes a URL (or any text) and outputs a PNG QR code.
- Keep dependencies minimal and ensure cross-platform usage.

## Implementation Choice
- Default: Python using `segno` (pure-Python, no Pillow required, high-quality PNG output).
- Alternative: Node.js using `qrcode` if you prefer a Node-based CLI.

## Python Plan
- Files:
  - `pyproject.toml` (or `requirements.txt`) declaring `segno`.
  - `qrcode_gen.py` as the CLI entry point.
- Dependency: `segno`.
- Rationale: Fast, reliable QR generation, supports error correction, scaling, and colors out of the box.

## CLI Design
- Usage examples:
  - `python qrcode_gen.py "https://example.com"`
  - `python qrcode_gen.py "https://example.com" -o ./out/example.png`
  - Options:
    - `-o, --output` PNG path (defaults to `qrcode.png` or derived from text).
    - `-s, --scale` pixel scaling factor (default: 8).
    - `-e, --ecc` error correction level: `L`, `M`, `Q`, `H` (default: `M`).
    - `--fg` foreground color (default: `#000000`).
    - `--bg` background color (default: `#FFFFFF`).
    - `--border` quiet zone size in modules (default: 4).
- Behavior:
  - When `--output` is omitted, generate a safe file name from the URL/text and ensure `.png` extension.

## Validation & Errors
- Accept any non-empty string; if it looks like a URL, basic validation via `urllib.parse`.
- Helpful error messages for empty input, invalid scale/ecc, unwritable output path.
- Exit with non-zero status on errors.

## PNG Generation Details
- Use `segno.make(text, error=ecc)` to produce QR matrix.
- Save with `qr.save(output, scale=scale, border=border, dark=fg, light=bg)`.
- Ensure deterministic output; no external calls.

## Testing & Verification
- Generate sample: `python qrcode_gen.py "https://example.com" -o sample.png`.
- Verify file creation, PNG format header, and dimensions reflect `scale` and `border`.
- Optional: Add a tiny smoke test script to assert file exists and is non-zero size.

## Node.js Alternative (Optional)
- Files:
  - `package.json` with `qrcode` and `commander`.
  - `bin/qrcode-gen.js` with a CLI similar to the Python plan.
- Usage: `node bin/qrcode-gen.js "https://example.com" -o out.png -s 8 -e M`.

## Delivery
- Implement the Python version first for minimal setup.
- Provide concise instructions to install deps (`pip install segno`) and run.
- If you prefer Node, I’ll implement that variant instead.