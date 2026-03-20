# OpenSearch Logs Viewer

A browser-based log explorer that lets you upload OpenSearch JSON exports and browse them in a [Discover](https://opensearch.org/docs/latest/dashboards/discover/index-discover/)-style interface — no running OpenSearch cluster required.

![Stack](https://img.shields.io/badge/React-19-61DAFB?logo=react) ![Stack](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript) ![Stack](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)

---

## Features

### File Management
- **Drag-and-drop or click-to-upload** OpenSearch JSON exports (up to 10 MB)
- Files are **persisted in `localStorage`** — they survive page refreshes
- Uploaded files are listed with name, hit count, file size, and upload time
- Click any file to open it; delete files individually with inline confirmation

### Discover Interface

| Area | What it does |
|---|---|
| **Field sidebar** | Lists all fields discovered across the loaded hits. Click `+` to add a field as a table column, `−` to remove it. Drag the right edge to resize. |
| **Histogram** | Bar chart of log volume over time, auto-bucketed by the span of the data (10 s → 1 day). Updates live as you filter. |
| **Log table** | Paginated (100 rows/page), sortable by any column. Click `▶` on a row to expand it. |
| **Expanded row** | Shows the `log` field in a block at the top, meta fields (`@timestamp`, `stream`, `_p`) as pills, and all other fields in a collapsible **Details** section. |

### Search — Lucene Syntax

The search bar supports a subset of Lucene query syntax:

```
# Plain text (matches any field)
opensearch

# Field-specific
kubernetes.pod_name:opensearch-data-0

# Exact phrase
"connection refused"

# Wildcard
kubernetes.container_image:choreo*

# Boolean operators
ERROR AND kubernetes.namespace_name:choreo-observability
WARN OR ERROR
NOT DEBUG

# Grouping
(ERROR OR WARN) AND kubernetes.pod_name:opensearch*

# Negate with minus
-stream:stderr
```

Matching terms are highlighted in the table and expanded row.

### Time Filter

Click the **calendar button** next to the search bar to open the time picker.

**Quick select** — relative ranges anchored to the *last log entry in the file* (not wall-clock time):

- Last 15 min / 30 min / 1 h / 3 h / 6 h / 12 h / 24 h / 7 d / 30 d
- The anchor timestamp is shown prominently so it's clear what "last 1 hour" means
- Each option shows the exact "from" time it would produce
- Options outside the file's actual data range are greyed out

**Paste / type range** — accepts timestamps in any of these formats:

```
Mar 19, 2026 @ 17:58:26.857   ← copy directly from the @timestamp column
2026-03-19T17:58:26.857Z
2026-03-19 17:58:26
```

Both **From** and **To** fields parse in real-time with a green ✓ / red ✗ indicator. Only one bound is required.

---

## Getting Started

### Prerequisites
- Node.js 18+

### Install & run

```bash
git clone <repo-url>
cd opensearch-logs-view
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Build for production

```bash
npm run build    # outputs to dist/
npm run preview  # serve the production build locally
```

---

## Exporting Logs from OpenSearch

The app expects a standard OpenSearch `_search` response (a JSON object with a top-level `hits.hits` array).

**Via the REST API:**

```bash
curl -X GET "https://<host>/_search?pretty" \
  -H "Content-Type: application/json" \
  -d '{
    "query": { "match_all": {} },
    "size": 500,
    "sort": [{ "@timestamp": { "order": "desc" } }]
  }' \
  > my-logs.json
```

**Via OpenSearch Dashboards:**

1. Open **Discover**, set your index pattern and time range
2. Open the browser DevTools → Network tab
3. Find the `_search` request made by Dashboards and copy the response body
4. Save it as a `.json` file and upload it here

---

## Tech Stack

| Package | Purpose |
|---|---|
| [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org) | UI framework |
| [Vite 8](https://vite.dev) | Build tool / dev server |
| [Recharts](https://recharts.org) | Histogram bar chart |
| [date-fns](https://date-fns.org) | Timestamp formatting, relative time math |
| CSS Modules | Scoped component styles, no CSS-in-JS |

State is managed with `React Context + useReducer` — no external state library.

---

## Project Structure

```
src/
├── types/opensearch.ts           # All TypeScript interfaces
├── context/
│   ├── FileContext.tsx            # Saved files + localStorage sync
│   └── DiscoverContext.tsx        # Search, columns, sort, time filter, pagination
├── utils/
│   ├── luceneSearch.ts            # Lucene query parser & evaluator
│   ├── filterHits.ts              # Applies Lucene query to flattened hits
│   ├── flattenSource.ts           # Flattens nested _source objects to dotted keys
│   ├── parseOpenSearchResponse.ts # Parses upload, caps hits, discovers fields
│   ├── buildHistogramBuckets.ts   # Groups hits into time buckets for the chart
│   └── localStorageUtils.ts       # Safe localStorage wrapper with quota handling
└── components/
    ├── GlobalHeader/              # Top nav bar
    ├── FileManager/               # Upload area + saved file list
    └── Discover/
        ├── DiscoverView.tsx       # Root layout; applies time + text filters
        ├── DiscoverToolbar.tsx    # Search bar + time picker + hit count
        ├── FieldSidebar/          # Resizable field list with add/remove columns
        ├── Histogram/             # Recharts bar chart
        ├── LogTable/              # Paginated table + expandable rows
        └── TimePicker/            # Quick select + paste/type range picker
```

---

## localStorage Notes

| Key | Contents |
|---|---|
| `osd_saved_files` | Array of uploaded file records, each storing up to 5,000 hits |
| `osd_discover_prefs` | Selected file ID, column preferences per file |

The browser's localStorage limit is typically **5 MB**. A warning is shown when usage approaches the limit. If a file cannot be saved due to quota, an error is displayed and the upload is rejected.

---

## Known Limitations

- **Offline only** — no live queries to an OpenSearch cluster
- **Hit cap** — up to 5,000 hits stored per file; larger exports are truncated with a warning
- **Lucene subset** — range queries (`field:[a TO b]`), fuzzy search (`~`), and relevance boosting (`^`) are not implemented
- **No auto-refresh** — "last 1 hour" is computed once at click time; there is no live rolling window
