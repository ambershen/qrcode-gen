## Goal
Enable users to upload a logo and automatically place it in the center of the generated QR code while keeping the code scannable.

## UI Changes
1. Add a logo upload input that accepts `image/png`, `image/jpeg`, and `image/svg+xml`.
2. Add controls:
   - Size slider (10–30% of QR width, default 18%).
   - Padding slider for the safe white/contrast box behind the logo (0–8%, default 4%).
   - Rounded-corner toggle for the logo backdrop.
3. Show basic file info and allow clearing the logo.
4. Keep existing Generate/Save/Copy actions intact.

## State & Defaults
- New state in `src/pages/Home.tsx`:
  - `logoDataUrl: string | null`
  - `logoSizeRatio: number` (default `0.18`)
  - `logoPaddingRatio: number` (default `0.04`)
  - `logoRounded: boolean` (default `true`)
- When a logo is present, set QR error correction to `H`; otherwise use current/default.

## Generation Flow
1. Validate input URL as today.
2. Generate base QR via `QRCode.toDataURL` with options:
   - `width/height` from current settings (e.g., 256), `margin` unchanged.
   - `color.dark`/`color.light` as today (respect theme).
   - `errorCorrectionLevel: 'H'` when `logoDataUrl` is set.
3. If no logo, use the QR data URL directly.
4. If logo exists, compose on a canvas:
   - Decode the QR data URL to an `Image` or `createImageBitmap`.
   - Decode the logo data URL; handle non-square images by fitting into a square.
   - Compute center box size: `boxSize = qrSize * logoSizeRatio`; `padding = qrSize * logoPaddingRatio`.
   - Draw a contrast backdrop (white for dark QR / dark for light QR) with optional rounded corners.
   - Draw the logo centered on top of the backdrop.
   - Export `canvas.toDataURL('image/png')` and set as `qrCodeDataUrl`.

## Canvas Composition Details
- Use an offscreen `<canvas>` sized to the QR image; draw QR first.
- Backdrop for scannability:
  - Fill a rounded rect at center with `fillStyle` set to contrasting color to surrounding modules (usually white) and opacity 1.
  - Ensure the backdrop area does not exceed ~25% of QR area.
- Logo draw:
  - Scale to fit within `boxSize - 2*padding`, maintain aspect ratio.
  - Support PNG/JPG; for SVG, use the uploaded data URL directly (browser will rasterize) and fall back if decoding fails.

## Edge Cases & Constraints
- Clamp size slider to safe range (10–30%).
- If logo decoding fails, fall back to plain QR and show a warning toast.
- Preserve transparency in PNG logos; ensure the backdrop provides contrast.
- Non-square logos are letterboxed within the square box.

## Performance & UX
- Mark `isGenerating` during composition; disable controls briefly.
- Prefer `createImageBitmap` when available for faster decoding; otherwise `Image`.
- Debounce re-generation when changing sliders to avoid jank.

## Download & Copy
- “Save” downloads the composed PNG (with logo when present).
- “Copy” continues to copy the input URL (unchanged) unless you want a new action to copy the image; can add later.

## Validation
- Verify with multiple logos (light/dark backgrounds, transparent PNG, large JPG, simple SVG).
- Manually scan with a phone across zoom levels.
- Check that QR remains scannable at default ratios; adjust defaults if needed.

## Non-Goals (Now)
- Do not modify the CLI generator; this addition is for the web page only.
- Advanced stylings (custom shapes/gradients) are out of scope for this change.

## Files to Update
- `src/pages/Home.tsx`: add new UI controls, state, and compose logic.
- Optionally `src/components/*` if you prefer to extract a small `LogoControls` component later.

If this plan looks good, I will implement the UI controls and the canvas composition helper, wire them into the existing generate flow, and validate scanning behavior end-to-end.