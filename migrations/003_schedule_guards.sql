-- The application locks the workspace first. Database guards also reject
-- invalid direct writes; this is not a replacement for server authorization.
CREATE FUNCTION check_slot_terms() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE tz text; local_start timestamp; local_end timestamp; used integer;
BEGIN
 SELECT timezone INTO tz FROM workspaces WHERE id=NEW.workspace_id FOR UPDATE;
 IF NEW.cancelled THEN RETURN NEW; END IF;
 local_start := NEW.starts_at AT TIME ZONE tz;
 local_end := NEW.blocked_until AT TIME ZONE tz;
 IF local_start::date<>local_end::date OR NOT EXISTS (
  SELECT 1 FROM availability a WHERE a.workspace_id=NEW.workspace_id AND a.coach_id=NEW.coach_id
  AND a.weekday=extract(isodow FROM local_start)
  AND a.start_min<=extract(hour FROM local_start)*60+extract(minute FROM local_start)
  AND a.end_min>=extract(hour FROM local_end)*60+extract(minute FROM local_end)
 ) THEN RAISE EXCEPTION 'OUTSIDE_WORKING_WINDOW' USING ERRCODE='P0001'; END IF;
 IF EXISTS (SELECT 1 FROM absences a WHERE a.workspace_id=NEW.workspace_id AND a.coach_id=NEW.coach_id AND a.starts_at<NEW.blocked_until AND a.ends_at>NEW.starts_at)
 THEN RAISE EXCEPTION 'COACH_UNAVAILABLE' USING ERRCODE='P0001'; END IF;
 SELECT count(*) INTO used FROM bookings b WHERE b.slot_id=NEW.id AND (b.status IN ('CONFIRMED','ATTENDED','NO_SHOW') OR (b.status='HOLD' AND b.expires_at>now()));
 IF used>NEW.capacity THEN RAISE EXCEPTION 'CAPACITY_REACHED' USING ERRCODE='P0001'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER slot_terms_guard BEFORE INSERT OR UPDATE ON slots FOR EACH ROW EXECUTE FUNCTION check_slot_terms();

CREATE FUNCTION check_absence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM 1 FROM workspaces WHERE id=NEW.workspace_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM slots s WHERE s.workspace_id=NEW.workspace_id AND s.coach_id=NEW.coach_id AND NOT s.cancelled AND s.starts_at<NEW.ends_at AND s.blocked_until>NEW.starts_at)
 THEN RAISE EXCEPTION 'SCHEDULE_OVERLAP' USING ERRCODE='P0001'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER absence_guard BEFORE INSERT OR UPDATE ON absences FOR EACH ROW EXECUTE FUNCTION check_absence();
