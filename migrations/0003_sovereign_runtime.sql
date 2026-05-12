CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY,
  identity_id TEXT NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  issued_by TEXT NOT NULL DEFAULT 'dev',
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS policy_decisions (
  id UUID PRIMARY KEY,
  subject_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('allow', 'deny', 'needs_review')),
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workflow_templates (
  id UUID PRIMARY KEY,
  domain_id TEXT NOT NULL REFERENCES domain_modules(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  action_type TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_model JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(domain_id, action_type)
);

CREATE TABLE IF NOT EXISTS risk_assessments (
  id UUID PRIMARY KEY,
  subject_id TEXT NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  score INTEGER NOT NULL DEFAULT 0,
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS domain_workflows (
  id UUID PRIMARY KEY,
  domain_id TEXT NOT NULL REFERENCES domain_modules(id) ON DELETE CASCADE,
  template_id UUID REFERENCES workflow_templates(id) ON DELETE SET NULL,
  actor TEXT NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  target TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'needs_review', 'completed', 'cancelled')),
  current_step INTEGER NOT NULL DEFAULT 1,
  pact_id UUID REFERENCES pacts(id) ON DELETE SET NULL,
  risk_id UUID REFERENCES risk_assessments(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workflow_steps (
  id UUID PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES domain_workflows(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  label TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'completed', 'blocked')),
  output JSONB NOT NULL DEFAULT '{}'::jsonb,
  pact_id UUID REFERENCES pacts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(workflow_id, step_order)
);

CREATE TABLE IF NOT EXISTS workflow_reviews (
  id UUID PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES domain_workflows(id) ON DELETE CASCADE,
  reviewer TEXT NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('approve', 'reject', 'needs_changes')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ledger_holds (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES ledger_accounts(id) ON DELETE CASCADE,
  pact_id UUID NOT NULL REFERENCES pacts(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL CHECK (amount > 0),
  asset_id TEXT NOT NULL REFERENCES ledger_assets(id),
  status TEXT NOT NULL CHECK (status IN ('held', 'released', 'cancelled')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ledger_limits (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES ledger_accounts(id) ON DELETE CASCADE,
  daily_limit BIGINT,
  single_transfer_limit BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id)
);

CREATE TABLE IF NOT EXISTS token_issuance_events (
  id UUID PRIMARY KEY,
  asset_id TEXT NOT NULL REFERENCES ledger_assets(id),
  account_id UUID NOT NULL REFERENCES ledger_accounts(id) ON DELETE CASCADE,
  issuer TEXT NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL CHECK (amount > 0),
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_tasks (
  id UUID PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES agent_profiles(id) ON DELETE CASCADE,
  mandate_id UUID NOT NULL REFERENCES mandates(id),
  pact_id UUID REFERENCES pacts(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('ready', 'awaiting_approval', 'approved', 'running', 'completed', 'denied', 'failed')),
  policy_decision TEXT NOT NULL CHECK (policy_decision IN ('allow', 'deny', 'needs_review')),
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  approved_by TEXT REFERENCES identities(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_run_logs (
  id UUID PRIMARY KEY,
  task_id UUID REFERENCES agent_tasks(id) ON DELETE CASCADE,
  run_id UUID REFERENCES agent_runs(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reputation_scores (
  identity_id TEXT PRIMARY KEY REFERENCES identities(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  tier TEXT NOT NULL,
  factors JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reputation_events (
  id UUID PRIMARY KEY,
  identity_id TEXT NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  source_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_notifications (
  id UUID PRIMARY KEY,
  channel TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

INSERT INTO workflow_templates (id, domain_id, label, action_type, steps, risk_model)
VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'economy', 'Economy settlement workflow', 'trade.create', '["Draft intent","Assess risk","Create PACT","Attach proof","Ready for settlement"]', '{"amount_high":10000}'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'knowledge', 'Knowledge proof workflow', 'knowledge.claim', '["Describe claim","Attach source","Create proof","Publish memory"]', '{"sensitivity":"source"}'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'health', 'Health consent workflow', 'consent.grant', '["Define consent","Check sensitivity","Create consent PACT","Review revocation path"]', '{"raw_medical_data":false}'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'governance', 'Governance proposal workflow', 'proposal.create', '["Draft proposal","Open review","Create PACT","Audit decision"]', '{"public_audit":true}'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', 'energy', 'Energy credit workflow', 'usage.report', '["Report usage","Attach meter proof","Assess credit","Record impact"]', '{"oracle":"meter"}'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6', 'link', 'Relationship consent workflow', 'relationship.consent', '["Define scope","Confirm consent","Create PACT","Record audit"]', '{"surveillance":false}'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7', 'space', 'Place genome workflow', 'place.register', '["Describe place","Attach location","Create genome","Publish memory"]', '{"geospatial":true}'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8', 'transport', 'Shipment custody workflow', 'shipment.create', '["Define shipment","Assess custody","Create PACT","Track handoff"]', '{"chain_of_custody":true}')
ON CONFLICT (domain_id, action_type) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_auth_sessions_identity ON auth_sessions(identity_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_policy_decisions_subject ON policy_decisions(subject_id);
CREATE INDEX IF NOT EXISTS idx_policy_decisions_created_at ON policy_decisions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_policy_rules_action_resource ON policy_rules(action, resource);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_domain ON workflow_templates(domain_id);
CREATE INDEX IF NOT EXISTS idx_domain_workflows_domain ON domain_workflows(domain_id);
CREATE INDEX IF NOT EXISTS idx_domain_workflows_actor ON domain_workflows(actor);
CREATE INDEX IF NOT EXISTS idx_domain_workflows_status ON domain_workflows(status);
CREATE INDEX IF NOT EXISTS idx_domain_workflows_created_at ON domain_workflows(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow ON workflow_steps(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_reviews_workflow ON workflow_reviews(workflow_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_subject ON risk_assessments(subject_id);
CREATE INDEX IF NOT EXISTS idx_ledger_holds_account ON ledger_holds(account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_holds_status ON ledger_holds(status);
CREATE INDEX IF NOT EXISTS idx_token_issuance_account ON token_issuance_events(account_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent ON agent_tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX IF NOT EXISTS idx_agent_run_logs_task ON agent_run_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_reputation_events_identity ON reputation_events(identity_id);
CREATE INDEX IF NOT EXISTS idx_system_notifications_created_at ON system_notifications(created_at DESC);
