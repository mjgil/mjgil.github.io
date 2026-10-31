# Architecture

## Homepage Structure

- `index.html` is the top-level static homepage for `mjgil.com`.
- The `Web & AI` section is a manually ordered list of featured project and repository links.
- New priority items are added at the top of the `Web & AI` list to control display order.
- Featured repository links may include a short inline description inside the label text when that helps distinguish related projects.
- The `Social Media and Contact` section contains personal profile and contact links.

## WASM Hub

- `wasm/index.html` is the generated landing page for browser-based Rust and WebAssembly projects. Its maintained template, app registry, build policy, packaging, and publishing commands live in `mjgil/publish-wasm` (`~/git/publish-wasm`).
- The homepage links to that hub at `https://mjgil.com/wasm`.
- `wasm/html-to-markdown/` contains the static release bundle for the Rust HTML-to-Markdown converter. App source lives in `mjgil/html-to-markdown` (`~/git/html-to-markdown`); its build command delegates to `publish-wasm`.
- `publish-wasm` builds and browser-checks selected apps, stages only their public directories, and regenerates the hub. Plain WASM apps keep matching bindings and binaries in a content-hashed `pkg/<hash>/` directory. `publish-wasm.json` records the source commit and bundle hash.
- The Pages checkout contains deployable output. Commit and push its reviewed changes to use the existing Pages hosting workflows; those workflows do not compile the WASM apps.
