# envmatrix

Compare and edit multiple `.env` files side-by-side in a browser-based matrix view.

Each value is hashed to a color, so identical values across environments share a color and divergences pop out at a glance. Edits in the UI are written back to the original files, preserving comments, blank lines, and key order.

## Install / Run

```bash
# one-shot, no install
npx envmatrix .env.local .env.dev .env.prod

# global
npm install -g envmatrix
envmatrix .env.local .env.dev .env.prod

# read-only HTML report (no server, shareable)
npx envmatrix .env.local .env.dev .env.prod --export report.html
```

Default mode starts a tiny local server, opens your browser, and lets you edit values, add new keys, and delete keys. Saves write back to the original files.

## Features

- **Color-coded hash cells** — same value across files = same color
- **Toggle SHA / values** — values masked by default
- **Filter** — search by key, "differs only", "missing in some env"
- **Edit / add / delete** — round-trips back to disk preserving file structure
- **Status pill per row** — `same` / `differs` / `partial`
- **Zero runtime dependencies**

## Why

Existing tools (`dotenv-diff`, `EnvDiff`) compare `.env` against `.env.example` for consistency checks. None give you an N-way visual matrix across `local`, `dev`, `prod` with editing.

## License

MIT
