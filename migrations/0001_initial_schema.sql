CREATE TABLE IF NOT EXISTS identities (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  kind TEXT NOT NULL,
  public_key TEXT NOT NULL UNIQUE,
  private_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pacts (
  id UUID PRIMARY KEY,
  actor TEXT NOT NULL REFERENCES identities(id),
  intent TEXT NOT NULL,
  object JSONB NOT NULL,
  target TEXT NOT NULL,
  terms JSONB NOT NULL,
  consent JSONB NOT NULL,
  proof JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  signature TEXT,
  hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'expired', 'revoked', 'invalid'))
);

CREATE TABLE IF NOT EXISTS proofs (
  id UUID PRIMARY KEY,
  pact_id UUID REFERENCES pacts(id) ON DELETE CASCADE,
  proof_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mandates (
  id UUID PRIMARY KEY,
  principal TEXT NOT NULL REFERENCES identities(id),
  agent TEXT NOT NULL REFERENCES identities(id),
  scope JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS genomes (
  id UUID PRIMARY KEY,
  subject TEXT NOT NULL,
  origin JSONB NOT NULL,
  history JSONB NOT NULL,
  rights JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS revocations (
  id UUID PRIMARY KEY,
  pact_id UUID NOT NULL UNIQUE REFERENCES pacts(id) ON DELETE CASCADE,
  revoked_by TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_log (
  id UUID PRIMARY KEY,
  event_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pacts_actor ON pacts(actor);
CREATE INDEX IF NOT EXISTS idx_pacts_target ON pacts(target);
CREATE INDEX IF NOT EXISTS idx_pacts_status ON pacts(status);
CREATE INDEX IF NOT EXISTS idx_pacts_expires_at ON pacts(expires_at);
CREATE INDEX IF NOT EXISTS idx_event_log_created_at ON event_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_log_subject_id ON event_log(subject_id);

