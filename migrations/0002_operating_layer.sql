CREATE TABLE IF NOT EXISTS auth_credentials (
  id UUID PRIMARY KEY,
  identity_id TEXT NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  credential_type TEXT NOT NULL,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  transports JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS auth_challenges (
  id UUID PRIMARY KEY,
  identity_id TEXT REFERENCES identities(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  challenge TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS request_nonces (
  nonce TEXT PRIMARY KEY,
  identity_id TEXT NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS domain_modules (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  domain_kind TEXT NOT NULL,
  description TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS domain_action_templates (
  id UUID PRIMARY KEY,
  domain_id TEXT NOT NULL REFERENCES domain_modules(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  label TEXT NOT NULL,
  schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_terms JSONB NOT NULL DEFAULT '{}'::jsonb,
  risk_level TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(domain_id, action_type)
);

CREATE TABLE IF NOT EXISTS domain_actions (
  id UUID PRIMARY KEY,
  domain_id TEXT NOT NULL REFERENCES domain_modules(id) ON DELETE CASCADE,
  template_id UUID REFERENCES domain_action_templates(id) ON DELETE SET NULL,
  actor TEXT NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  pact_id UUID NOT NULL REFERENCES pacts(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'created',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ledger_assets (
  id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  decimals INTEGER NOT NULL DEFAULT 0,
  sandbox BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ledger_accounts (
  id UUID PRIMARY KEY,
  owner TEXT NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL REFERENCES ledger_assets(id),
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner, asset_id, label)
);

CREATE TABLE IF NOT EXISTS payment_intents (
  id UUID PRIMARY KEY,
  payer_account_id UUID NOT NULL REFERENCES ledger_accounts(id),
  payee_account_id UUID NOT NULL REFERENCES ledger_accounts(id),
  pact_id UUID NOT NULL REFERENCES pacts(id),
  amount BIGINT NOT NULL CHECK (amount > 0),
  asset_id TEXT NOT NULL REFERENCES ledger_assets(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'executed', 'rejected')),
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  executed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ledger_transfers (
  id UUID PRIMARY KEY,
  payment_intent_id UUID REFERENCES payment_intents(id),
  asset_id TEXT NOT NULL REFERENCES ledger_assets(id),
  amount BIGINT NOT NULL CHECK (amount > 0),
  debit_account_id UUID NOT NULL REFERENCES ledger_accounts(id),
  credit_account_id UUID NOT NULL REFERENCES ledger_accounts(id),
  status TEXT NOT NULL DEFAULT 'posted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY,
  transfer_id UUID REFERENCES ledger_transfers(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES ledger_accounts(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('debit', 'credit')),
  amount BIGINT NOT NULL CHECK (amount > 0),
  asset_id TEXT NOT NULL REFERENCES ledger_assets(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_profiles (
  id UUID PRIMARY KEY,
  identity_id TEXT NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  model TEXT NOT NULL,
  capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES agent_profiles(id) ON DELETE CASCADE,
  mandate_id UUID NOT NULL REFERENCES mandates(id),
  pact_id UUID REFERENCES pacts(id),
  action TEXT NOT NULL,
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  output JSONB NOT NULL DEFAULT '{}'::jsonb,
  policy_decision TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS policy_rules (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  effect TEXT NOT NULL CHECK (effect IN ('allow', 'deny', 'needs_review')),
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  condition JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY,
  event_type TEXT NOT NULL,
  actor TEXT REFERENCES identities(id) ON DELETE SET NULL,
  subject_id TEXT NOT NULL,
  decision TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO ledger_assets (id, symbol, name, decimals, sandbox, metadata)
VALUES ('asset:omn', 'OMN', 'OMNIA Sandbox Unit', 0, true, '{"purpose":"sandbox settlement"}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO domain_modules (id, label, domain_kind, description, enabled, capabilities)
VALUES
  ('economy', 'Economy', 'civilization', 'Trade, value exchange, settlement, risk and market actions.', true, '{"actions":["trade.create","payment.request"],"requires_payment":true}'),
  ('knowledge', 'Knowledge', 'civilization', 'Learning, research, provenance, claims and knowledge rights.', true, '{"actions":["knowledge.claim","learning.path"],"privacy":"public_or_private"}'),
  ('health', 'Health', 'civilization', 'Consent, care coordination and privacy-preserving health actions.', true, '{"actions":["consent.grant","care.request"],"raw_medical_data":false}'),
  ('governance', 'Governance', 'civilization', 'Proposals, votes, delegation and institutional accountability.', true, '{"actions":["proposal.create","vote.cast"],"audit":"mandatory"}'),
  ('energy', 'Energy', 'civilization', 'Energy usage, production, credits and climate-positive incentives.', true, '{"actions":["usage.report","credit.issue"],"asset":"energy_credit"}'),
  ('link', 'Link', 'civilization', 'Human relationships, consent, communication and creative exchange.', true, '{"actions":["relationship.consent","creative.license"],"surveillance":false}'),
  ('space', 'Space', 'civilization', 'Places, resources, territory, infrastructure and physical-world state.', true, '{"actions":["place.register","resource.claim"],"geospatial":true}'),
  ('transport', 'Transport', 'civilization', 'Movement of goods, routing, chain of custody and delivery.', true, '{"actions":["shipment.create","custody.transfer"],"tracking":true}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO domain_action_templates (id, domain_id, action_type, label, schema, default_terms, risk_level)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'economy', 'trade.create', 'Create trade action', '{"required":["amount","asset"]}', '{"settlement":"omnia_sandbox","asset":"OMN"}', 'medium'),
  ('22222222-2222-4222-8222-222222222222', 'knowledge', 'knowledge.claim', 'Register knowledge claim', '{"required":["claim","source"]}', '{"license":"attribution","royalty":"future"}', 'low'),
  ('33333333-3333-4333-8333-333333333333', 'health', 'consent.grant', 'Grant health consent', '{"required":["scope","duration"]}', '{"raw_medical_data":false,"revocable":true}', 'high'),
  ('44444444-4444-4444-8444-444444444444', 'governance', 'proposal.create', 'Create governance proposal', '{"required":["proposal","jurisdiction"]}', '{"debate_window":"30d","audit":"public"}', 'medium'),
  ('55555555-5555-4555-8555-555555555555', 'energy', 'usage.report', 'Report energy usage', '{"required":["source","amount"]}', '{"verification":"meter_oracle","carbon":"tracked"}', 'medium'),
  ('66666666-6666-4666-8666-666666666666', 'link', 'relationship.consent', 'Record relationship consent', '{"required":["scope","counterparty"]}', '{"surveillance":false,"revocable":true}', 'low'),
  ('77777777-7777-4777-8777-777777777777', 'space', 'place.register', 'Register place or resource', '{"required":["subject","location"]}', '{"rights":"community_visible","history":"tracked"}', 'medium'),
  ('88888888-8888-4888-8888-888888888888', 'transport', 'shipment.create', 'Create shipment', '{"required":["origin","destination","cargo"]}', '{"custody":"tracked","delivery":"verified"}', 'medium')
ON CONFLICT (domain_id, action_type) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_auth_credentials_identity ON auth_credentials(identity_id);
CREATE INDEX IF NOT EXISTS idx_auth_challenges_identity ON auth_challenges(identity_id);
CREATE INDEX IF NOT EXISTS idx_domain_actions_domain ON domain_actions(domain_id);
CREATE INDEX IF NOT EXISTS idx_domain_actions_created_at ON domain_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_accounts_owner ON ledger_accounts(owner);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON payment_intents(status);
CREATE INDEX IF NOT EXISTS idx_payment_intents_created_at ON payment_intents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_account ON ledger_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_agent ON agent_runs(agent_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_subject ON audit_events(subject_id);
