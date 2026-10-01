CREATE TABLE IF NOT EXISTS workspaces (
 id uuid PRIMARY KEY, name text NOT NULL, timezone text NOT NULL DEFAULT 'Asia/Jerusalem',
 demo boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz
);
CREATE TABLE people (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
 name text NOT NULL, email text NOT NULL, role text NOT NULL CHECK(role IN ('COACH','CLIENT')),
 password_hash text, UNIQUE(workspace_id,email), UNIQUE(workspace_id,id)
);
CREATE TABLE auth_sessions (
 token_hash text PRIMARY KEY, workspace_id uuid NOT NULL, person_id uuid NOT NULL,
 expires_at timestamptz NOT NULL, FOREIGN KEY(workspace_id,person_id) REFERENCES people(workspace_id,id) ON DELETE CASCADE
);
CREATE TABLE services (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
 name text NOT NULL CHECK(length(name) BETWEEN 3 AND 80), description text NOT NULL DEFAULT '',
 duration integer NOT NULL CHECK(duration BETWEEN 15 AND 120), buffer integer NOT NULL CHECK(buffer BETWEEN 0 AND 60),
 capacity integer NOT NULL CHECK(capacity BETWEEN 1 AND 20), price integer NOT NULL CHECK(price BETWEEN 0 AND 100000),
 active boolean NOT NULL DEFAULT true, UNIQUE(workspace_id,id)
);
CREATE TABLE availability (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL, coach_id uuid NOT NULL,
 weekday integer NOT NULL CHECK(weekday BETWEEN 1 AND 7), start_min integer NOT NULL CHECK(start_min BETWEEN 0 AND 1439),
 end_min integer NOT NULL CHECK(end_min BETWEEN 1 AND 1440), CHECK(end_min>start_min),
 FOREIGN KEY(workspace_id,coach_id) REFERENCES people(workspace_id,id) ON DELETE CASCADE
);
CREATE TABLE absences (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL, coach_id uuid NOT NULL, starts_at timestamptz NOT NULL,
 ends_at timestamptz NOT NULL, reason text NOT NULL, CHECK(ends_at>starts_at),
 FOREIGN KEY(workspace_id,coach_id) REFERENCES people(workspace_id,id) ON DELETE CASCADE
);
CREATE TABLE slots (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL, service_id uuid NOT NULL, coach_id uuid NOT NULL,
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, blocked_until timestamptz NOT NULL,
 capacity integer NOT NULL CHECK(capacity BETWEEN 1 AND 20), price integer NOT NULL CHECK(price>=0),
 cancelled boolean NOT NULL DEFAULT false, CHECK(ends_at>starts_at AND blocked_until>=ends_at),
 FOREIGN KEY(workspace_id,service_id) REFERENCES services(workspace_id,id) ON DELETE CASCADE,
 FOREIGN KEY(workspace_id,coach_id) REFERENCES people(workspace_id,id) ON DELETE CASCADE,
 UNIQUE(workspace_id,id)
);
CREATE INDEX slots_upcoming ON slots(workspace_id,starts_at);
CREATE TABLE bookings (
 id uuid PRIMARY KEY, workspace_id uuid NOT NULL, slot_id uuid NOT NULL, person_id uuid NOT NULL,
 status text NOT NULL CHECK(status IN ('HOLD','CONFIRMED','CANCELLED','EXPIRED','ATTENDED','NO_SHOW')),
 payment text NOT NULL CHECK(payment IN ('PENDING','DEMO_PAID','STRIPE_PAID','REFUND_REQUIRED','NOT_REQUIRED')),
 expires_at timestamptz, price integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 stripe_session text UNIQUE, FOREIGN KEY(workspace_id,slot_id) REFERENCES slots(workspace_id,id) ON DELETE CASCADE,
 FOREIGN KEY(workspace_id,person_id) REFERENCES people(workspace_id,id) ON DELETE CASCADE,
 CHECK(status<>'HOLD' OR expires_at IS NOT NULL)
);
CREATE INDEX bookings_capacity ON bookings(workspace_id,slot_id,status);
CREATE TABLE payment_events (id text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE audit (
 id bigserial PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces ON DELETE CASCADE,
 actor_id uuid, action text NOT NULL, resource_id uuid, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE rate_limits (key text PRIMARY KEY, hits integer NOT NULL, reset_at timestamptz NOT NULL);

-- All mutating domain operations take the same workspace row lock. These guards
-- also protect capacity and schedule against accidental direct application writes.
CREATE FUNCTION check_slot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM 1 FROM workspaces WHERE id=NEW.workspace_id FOR UPDATE;
 IF NOT NEW.cancelled AND EXISTS(SELECT 1 FROM slots s WHERE s.workspace_id=NEW.workspace_id AND s.coach_id=NEW.coach_id AND s.id<>NEW.id AND NOT s.cancelled AND s.starts_at<NEW.blocked_until AND s.blocked_until>NEW.starts_at) THEN
  RAISE EXCEPTION 'SCHEDULE_OVERLAP' USING ERRCODE='P0001';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER slot_guard BEFORE INSERT OR UPDATE ON slots FOR EACH ROW EXECUTE FUNCTION check_slot();

CREATE FUNCTION check_booking() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cap integer; blocked boolean; used integer;
BEGIN
 PERFORM 1 FROM workspaces WHERE id=NEW.workspace_id FOR UPDATE;
 IF NEW.status IN ('HOLD','CONFIRMED','ATTENDED','NO_SHOW') AND (NEW.status<>'HOLD' OR NEW.expires_at>now()) THEN
  SELECT capacity,cancelled INTO cap,blocked FROM slots WHERE id=NEW.slot_id AND workspace_id=NEW.workspace_id;
  IF cap IS NULL OR blocked THEN RAISE EXCEPTION 'SLOT_UNAVAILABLE' USING ERRCODE='P0001'; END IF;
  SELECT count(*) INTO used FROM bookings b WHERE b.slot_id=NEW.slot_id AND b.id<>NEW.id AND (b.status IN ('CONFIRMED','ATTENDED','NO_SHOW') OR (b.status='HOLD' AND b.expires_at>now()));
  IF used>=cap THEN RAISE EXCEPTION 'CAPACITY_REACHED' USING ERRCODE='P0001'; END IF;
  IF EXISTS(SELECT 1 FROM bookings b WHERE b.slot_id=NEW.slot_id AND b.person_id=NEW.person_id AND b.id<>NEW.id AND (b.status IN ('CONFIRMED','ATTENDED','NO_SHOW') OR (b.status='HOLD' AND b.expires_at>now()))) THEN
   RAISE EXCEPTION 'ALREADY_BOOKED' USING ERRCODE='P0001';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER booking_guard BEFORE INSERT OR UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION check_booking();
