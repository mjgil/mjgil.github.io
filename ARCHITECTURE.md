# Architecture

## Homepage Structure

- `index.html` is the top-level static homepage for `mjgil.com`.
- The `Web & AI` section is a manually ordered list of featured project and repository links.
- New priority items are added at the top of the `Web & AI` list to control display order.
- Featured repository links may include a short inline description inside the label text when that helps distinguish related projects.
- The `Social Media and Contact` section contains personal profile and contact links.

## WASM Hub

- `wasm/index.html` is the landing page for browser-based Rust and WebAssembly projects.
- The homepage links to that hub at `https://mjgil.com/wasm`.

## Job Agent Documentation

- `job-agent/index.html` is the public operator and technical documentation for MJGIL, Inc's MalcomJobAssistant agent at `https://mjgil.com/job-agent/`.
- `job-agent/ips.json` publishes its dedicated User-Agent, contact, and fixed outgoing IPv4 prefix for agent verification.
- Both files are static GitHub Pages assets with no build step or additional dependencies. They contain public agent identity information, not applicant records or credentials.
- Publishing documentation does not imply vendor verification or destination-site access approval.
