-- Phase 11. Single-purpose migration per OPS-05. Run-level ENUM types only.

CREATE TYPE run_status AS ENUM (
  'pending',
  'executing',
  'completed',
  'failed',
  'killed'
);

CREATE TYPE run_item_status AS ENUM (
  'pending',
  'sent',
  'failed',
  'skipped',
  'verified'
);
