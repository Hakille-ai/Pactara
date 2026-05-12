CREATE TABLE IF NOT EXISTS world_scenarios (
  id UUID PRIMARY KEY,
  actor TEXT NOT NULL REFERENCES identities(id) ON DELETE RESTRICT,
  domain_id TEXT NOT NULL REFERENCES domain_modules(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scenario_runs (
  id UUID PRIMARY KEY,
  scenario_id UUID NOT NULL REFERENCES world_scenarios(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'completed',
  impact_score INTEGER NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'low',
  recommended_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_objects JSONB NOT NULL DEFAULT '{}'::jsonb,
  output JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS runtime_commands (
  id UUID PRIMARY KEY,
  actor TEXT NOT NULL REFERENCES identities(id) ON DELETE RESTRICT,
  domain_id TEXT NOT NULL REFERENCES domain_modules(id) ON DELETE RESTRICT,
  intent TEXT NOT NULL,
  target TEXT NOT NULL,
  command_text TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'completed',
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  pact_id UUID REFERENCES pacts(id) ON DELETE SET NULL,
  workflow_id UUID REFERENCES domain_workflows(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_crews (
  id UUID PRIMARY KEY,
  actor TEXT NOT NULL REFERENCES identities(id) ON DELETE RESTRICT,
  label TEXT NOT NULL,
  objective TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  policy_decision TEXT NOT NULL DEFAULT 'allow',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_crew_members (
  id UUID PRIMARY KEY,
  crew_id UUID NOT NULL REFERENCES agent_crews(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agent_profiles(id) ON DELETE RESTRICT,
  mandate_id UUID NOT NULL REFERENCES mandates(id) ON DELETE RESTRICT,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crew_runs (
  id UUID PRIMARY KEY,
  crew_id UUID NOT NULL REFERENCES agent_crews(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'completed',
  policy_decision TEXT NOT NULL DEFAULT 'allow',
  requires_review BOOLEAN NOT NULL DEFAULT FALSE,
  output JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS civilization_signals (
  id UUID PRIMARY KEY,
  domain_id TEXT NOT NULL REFERENCES domain_modules(id) ON DELETE RESTRICT,
  actor TEXT REFERENCES identities(id) ON DELETE SET NULL,
  signal_type TEXT NOT NULL,
  severity INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_world_scenarios_status_created ON world_scenarios (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_world_scenarios_domain_created ON world_scenarios (domain_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_world_scenarios_actor_created ON world_scenarios (actor, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scenario_runs_scenario_created ON scenario_runs (scenario_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scenario_runs_status_created ON scenario_runs (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_runtime_commands_status_created ON runtime_commands (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_runtime_commands_domain_created ON runtime_commands (domain_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_runtime_commands_actor_created ON runtime_commands (actor, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_crews_status_created ON agent_crews (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_crews_actor_created ON agent_crews (actor, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_crew_members_crew ON agent_crew_members (crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_runs_status_created ON crew_runs (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crew_runs_crew_created ON crew_runs (crew_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_civilization_signals_status_created ON civilization_signals (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_civilization_signals_domain_created ON civilization_signals (domain_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_civilization_signals_actor_created ON civilization_signals (actor, created_at DESC);
