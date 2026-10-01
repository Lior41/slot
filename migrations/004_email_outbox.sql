CREATE TABLE email_outbox (
 id text PRIMARY KEY,
 workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
 booking_id uuid NOT NULL REFERENCES bookings ON DELETE CASCADE,
 slot_id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('CONFIRMATION','CHANGE','CANCELLATION','REMINDER')),
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','SENT','FAILED','SKIPPED')),
 attempts integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),
 first_attempt_at timestamptz, next_attempt_at timestamptz NOT NULL DEFAULT now(), sent_at timestamptz
);
CREATE INDEX email_outbox_pending ON email_outbox(status,next_attempt_at);
CREATE FUNCTION queue_booking_email() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE kind text;
BEGIN
 IF (SELECT demo FROM workspaces WHERE id=NEW.workspace_id) THEN RETURN NEW; END IF;
 IF NEW.status='CONFIRMED' AND OLD.status<>'CONFIRMED' THEN kind:='CONFIRMATION';
 ELSIF NEW.status='CONFIRMED' AND NEW.slot_id<>OLD.slot_id THEN kind:='CHANGE';
 ELSIF NEW.status='CANCELLED' AND OLD.status='CONFIRMED' THEN kind:='CANCELLATION';
 ELSE RETURN NEW; END IF;
 INSERT INTO email_outbox(id,workspace_id,booking_id,slot_id,kind)
 VALUES(NEW.id::text||':'||kind||':'||extract(epoch FROM NEW.updated_at)::text,NEW.workspace_id,NEW.id,NEW.slot_id,kind)
 ON CONFLICT DO NOTHING;
 RETURN NEW;
END $$;
CREATE TRIGGER booking_email AFTER UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION queue_booking_email();
