# Aria2 Downloader

Aria2 Downloader is a Pasty plugin that detects downloadable links from clipboard items and submits them to an aria2 JSON-RPC server.

## Features

- Detects `text` clipboard items containing download links.
- Detects `path_reference` clipboard items for local torrent and metalink files.
- Shows a compact download form inside Pasty.
- Submits matched resources through aria2 JSON-RPC.
- Keeps the form open on submit failure so the RPC config can be corrected and retried.

## Supported Inputs

Text input is matched line by line. Each non-empty line must be a supported download value:

- `http://` and `https://` URLs
- `ftp://` URLs
- `magnet:` links
- `thunder://` links, decoded before submission when possible
- Bare BitTorrent v1 info hashes, converted to magnet links
- `sftp://`, `ftps://`, and `http+ftp://` aria2-style URLs
- Remote `.torrent`, `.metalink`, and `.meta4` URLs

Path references are matched when the copied file path ends with:

- `.torrent`
- `.metalink`
- `.meta4`

Embedded links inside prose are intentionally ignored. Copy the URL itself, or use one URL per line.

## Default aria2 RPC Config

The UI opens with these defaults:

- Address: `127.0.0.1`
- Port: `16800`
- RPC secret: `diOzvyOnub7g5yjo`
- Download directory: the current system user's `~/Downloads`

The values can be edited before submitting.

## aria2 Setup

Start aria2 with JSON-RPC enabled and a matching secret. Example:

```bash
aria2c --enable-rpc --rpc-listen-all=false --rpc-listen-port=16800 --rpc-secret=diOzvyOnub7g5yjo
```

If aria2 uses a different port, host, or secret, update the fields in the plugin UI before submitting.

## Development

Install dependencies:

```bash
npm install
```

Run tests:

```bash
npm test
```

Build runtime and UI assets:

```bash
npm run build
```

Preview the renderer UI:

```bash
npm run dev
```

## Pasty Installation

For local development, add this plugin root directory to Pasty Developer Plugins:

```text
/Users/huluwa/WorkSpace/Pasty Plugins/aira2-plugin
```

Pasty loads the built files declared in `manifest.json`:

- Runtime: `dist/runtime/index.cjs`
- UI root: `dist/ui`

After changing `manifest.json`, detector IDs, attachment types, or UI entries, rebuild and reload the plugin in Pasty.

## Plugin IDs

- Plugin ID: `plugin.pasty.aria2`
- Detector ID: `link-detector`
- Detector display name: `Aria2 Link Detector`
- Attachment renderer ID: `download-renderer`
- Attachment type: `plugin.pasty.aria2.download`
- Attachment display name: `Aria2 Download`

## Verification

Before committing, run:

```bash
npm test
npm run build
```

Both commands should pass.
