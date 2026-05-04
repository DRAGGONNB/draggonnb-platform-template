-- Phase 14.3 — approve_request_atomic() stored proc
-- Pattern 3 from research.md: pg_advisory_xact_lock + FOR UPDATE belt+suspenders (CONTEXT C4)
CREATE OR REPLACE FUNCTION approve_request_atomic(
  p_approval_id           uuid,
  p_approver_user_id      uuid,
  p_decision              text,    -- 'approved' | 'rejected'
  p_rejection_reason_code text DEFAULT NULL,
  p_rejection_reason_text text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row         approval_requests;
  v_run_attempt integer;
BEGIN
  -- Advisory transactional lock keyed on approval_id (released at COMMIT/ROLLBACK)
  PERFORM pg_advisory_xact_lock(hashtext(p_approval_id::text));

  -- Acquire row lock with 30s expiry grace
  SELECT * INTO v_row
  FROM approval_requests
  WHERE id = p_approval_id
    AND status = 'pending'
    AND (expires_at > now() - INTERVAL '30 seconds')
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Already actioned OR expired beyond grace — idempotent return with current status
    RETURN jsonb_build_object(
      'result', 'already_actioned',
      'approval_id', p_approval_id,
      'current_status', (SELECT status FROM approval_requests WHERE id = p_approval_id)
    );
  END IF;

  IF p_decision = 'approved' THEN
    UPDATE approval_requests
    SET status = 'approved', updated_at = now()
    WHERE id = p_approval_id;

    SELECT COALESCE(MAX(run_attempt), 0) + 1 INTO v_run_attempt
    FROM approval_jobs WHERE approval_request_id = p_approval_id;

    INSERT INTO approval_jobs (approval_request_id, run_attempt, handler_path, payload)
    VALUES (p_approval_id, v_run_attempt, v_row.product || '.' || v_row.action_type, COALESCE(v_row.action_payload, '{}'::jsonb));

    UPDATE approval_requests
    SET handler_run_count = handler_run_count + 1
    WHERE id = p_approval_id;
  ELSIF p_decision = 'rejected' THEN
    UPDATE approval_requests
    SET status = 'rejected',
        rejection_reason_code = p_rejection_reason_code,
        rejection_reason = p_rejection_reason_text,
        updated_at = now()
    WHERE id = p_approval_id;
  ELSE
    RAISE EXCEPTION 'Invalid decision: %', p_decision;
  END IF;

  RETURN jsonb_build_object(
    'result', 'ok',
    'decision', p_decision,
    'approval_id', p_approval_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION approve_request_atomic(uuid, uuid, text, text, text) TO authenticated, service_role;
