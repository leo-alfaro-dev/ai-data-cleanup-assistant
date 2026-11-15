// A record rarely appears more than a few times; more rows on one value means the value is
// shared (a catch-all inbox, a switchboard), and merging them would delete real rows.
export const MAX_ROWS_PER_RECORD = 10;
