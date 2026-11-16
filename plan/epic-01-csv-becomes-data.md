# Epic 1: A CSV becomes data

**Outcome:** drop a CSV and see its facts (rows, columns, delimiter), parsed off the main thread and proven on the production build.

**Why it matters:** this is the walking skeleton. It crosses every layer once (engine, worker, store, UI, e2e) with the least code possible, so the riskiest piece of infrastructure, the Web Worker in a production build, is proven before anything is built on it.

**Show after this epic:** a 50 MB file loads with a progress bar while the page stays responsive.

## T1.1: Parse CSV files into an immutable dataset

**After:** T0.1

**Build**

- `src/lib/brand.ts`: `Brand<Value, Name>`.
- `src/engine/dataset/dataset.ts`: `RowId`, `ColumnKey`, `Column`, `Row`, `Dataset`, `SourceFormat` (delimiter, line break, byte order mark, encoding), `StructureNotes` (ragged rows, blank lines skipped).
- `src/engine/dataset/decodeText.ts`: bytes to text. Tries UTF-8 strictly and falls back to Windows-1252, which is what Excel writes on Windows.
- `src/engine/dataset/parseCsv.ts`: text to `{ ok: true; dataset } | { ok: false; reason }`.
- `src/engine/dataset/loadFailure.ts`: the `LoadFailureReason` union (`empty`, `noDataRows`, `tooLarge`, `notCsv`, `unreadable`).
- `src/engine/dataset/toRowNumber.ts`: `RowId` to the number a spreadsheet shows, where the header is row 1.

**Decisions**

- Papa Parse with `header: false`. The first row is the header; cells stay strings exactly as parsed, with no trimming and no type conversion.
- The delimiter is detected among comma, semicolon, tab and pipe. The byte order mark, line break and encoding are remembered for export.
- Ragged rows are normalized, never dropped: a short row is padded with empty cells, a long row adds unnamed columns. Both are recorded in `StructureNotes`.
- Zero-length lines are skipped and counted.
- Headers are kept as written, empty and repeated ones included. Columns are identified by position.
- `RowId` is the row's index in the file, so it never changes for the life of the dataset.

**Done when**

- Specs cover: comma, semicolon and tab files; a quoted delimiter, a quoted line break and an escaped quote; a byte order mark; CRLF line breaks; a short and a long ragged row; empty and repeated headers; a header-only file; empty input; values keeping their surrounding spaces; a Windows-1252 file with accents decoding correctly.
- `yarn verify` passes.

## T1.2: Add Button and ProgressBar primitives

**After:** T0.1

**Build**

- `src/components/Button.tsx`: variants `primary`, `secondary`, `ghost`, `danger` with `tv`; accepts `disabled`; standard `Props` and `className` handling.
- `src/components/ProgressBar.tsx`: `role="progressbar"` with `aria-valuenow`, and a label.

**Decisions**

- Only the two primitives T1.3 needs. Other primitives are created by the task that first uses them (`VisibleValue` in T5.1, `Badge` in T5.2, `Modal` in T5.5, `Kbd` in T8.2), each with the API that task needs and no more.

**Done when**

- Component specs: a disabled button does not fire; the progress bar exposes its value and label to assistive technology.
- Screenshots of each variant.

## T1.3: Load a CSV in a Web Worker and show its facts

**After:** T1.1, T1.2

**Build**

- `src/workers/dataset.worker.ts`: `defineWorker` with
  - `load(file)`: size guard, read bytes, `decodeText`, reject files that are not text (`notCsv`: a zip header means an Excel file), `parseCsv`, keep the dataset in the worker, return its facts. Reports progress per stage and stops between stages when canceled.
  - `rows({ offset, limit })`: a slice of rows for the page.
- `src/workers/getDatasetWorker.ts`: the lazy client. `createWorker` receives the native `new Worker(new URL('./dataset.worker.ts', import.meta.url), { type: 'module' })`.
- `src/features/workspace/state/workspaceStore.ts`: `phase` as a union (`empty`, `loading` with progress, `ready` with facts and `rowChunks`, `failed` with a reason); actions `loadFile(file)` and `reset()`.
- `src/features/workspace/components/`: `FileDropzone` (drop, picker, keyboard), `LoadProgress`, `DatasetFacts` (file name, rows × columns, delimiter, encoding when it is not UTF-8), `LoadFailure`.
- `src/features/workspace/loadFailureCopy.ts`: `Record<LoadFailureReason, string>`.
- `src/lib/formatCount.ts`: thousands separators for row, column and cell counts.
- `e2e/fixtures/people.csv`: a small hand-written synthetic file.

**Decisions**

- The page never reads the file. The `File` goes to the worker as is.
- `MAX_FILE_BYTES` is 50 MB; a larger file fails with `tooLarge` before anything is read.
- After `load`, the page pulls rows in chunks of 10,000 into `rowChunks`, first chunk first (D4). No array of rows is ever copied or spread.
- Loading a new file cancels the load in flight, and anything the old load returns afterwards is discarded.
- An Excel file gets a message that says to export it as CSV.

**Done when**

- Store spec with a fake worker: the happy path; each failure reason; a second load cancels the first, and a held response from the first never lands.
- e2e on the production build: choose the fixture and its facts appear; choose a non-CSV file and the failure message appears. This run is the proof that the worker starts in production.
- Screenshots at 1440px, 1280px and 390px: empty, loading, ready, failed.
- `yarn verify` and `yarn integrations` pass.
