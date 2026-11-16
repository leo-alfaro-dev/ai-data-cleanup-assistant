// A full run on the sample makes 6 requests and a file at every cap about 14, so this lets one
// visitor start a few runs, with retries, per window.
export const HOSTED_REQUESTS_PER_WINDOW = 50;
export const HOSTED_WINDOW_MS = 10 * 60 * 1000;
