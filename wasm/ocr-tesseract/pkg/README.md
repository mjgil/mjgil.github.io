# OCR Tesseract

This folder implements the Tesseract-only OCR path for the `rust-wasm` collection.

Architecture:

- Rust/WASM owns the UI, state, and browser integration.
- `ocr-bridge.js` manages a dedicated worker lifecycle.
- `ocr-worker.js` runs Tesseract.js inside a Web Worker while the Rust app stays focused on UI and state.

Current scope:

- Image OCR only
- Worker-side preprocessing: upscale, contrast, threshold, invert
- Lazy language loading for a small set of common Tesseract language packs
- Transcript download as plain text

Out of scope in this folder:

- PDF rendering and OCR
- Server fallback

Build:

```bash
cd /home/m/git/rust-wasm/ocr-tesseract
wasm-pack build --target web
python3 -m http.server
```

Then open `http://localhost:8000`.

Notes:

- The worker currently loads `tesseract.js@5` from jsDelivr and lets Tesseract fetch language data on demand.
- If you want fully local assets later, replace the CDN dependency in [ocr-worker.js](/home/m/git/rust-wasm/ocr-tesseract/ocr-worker.js) with self-hosted copies and wire a local language path.
