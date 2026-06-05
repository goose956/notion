-- Add 'removed' to the deploy_status enum so app_workspaces can be soft-deleted
-- when a user removes a workflow from Browse Workflows.
-- ALTER TYPE … ADD VALUE cannot run inside a transaction, so it is intentionally
-- outside one here.  IF NOT EXISTS makes it safe to re-run.
ALTER TYPE "deploy_status" ADD VALUE IF NOT EXISTS 'removed';
