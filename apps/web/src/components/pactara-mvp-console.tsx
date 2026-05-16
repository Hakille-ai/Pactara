"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import QRCode from "qrcode";
import {
  BadgeCheck,
  CheckCircle2,
  Copy,
  ExternalLink,
  Fingerprint,
  Globe2,
  KeyRound,
  QrCode,
  RefreshCw,
  ShieldCheck,
  SquarePen,
  XCircle,
} from "lucide-react";
import {
  API_BASE,
  BundleVerificationResponse,
  Identity,
  Pact,
  PactBundle,
  VerifyPactResponse,
  pactaraFetch,
  parseJsonField,
} from "@/lib/pactara-api";
import {
  ClientKeyMaterial,
  generateClientKeys,
  pactSigningPayload,
  signCanonicalValue,
} from "@/lib/pactara-crypto";
import { PactaraDashboard } from "@/components/pactara-dashboard";

type Locale = "fr" | "en";
type Stage = "identity" | "pact" | "sign" | "verify" | "export" | "revoke";

const keyStorage = "pactara.client.keys.v1";

const copy = {
  fr: {
    product: "PACTARA",
    title: "Console publique Identite + PACT",
    subtitle:
      "Creez une identite souveraine, signez un PACT cote navigateur, verifiez-le et exportez une preuve portable. La cle privee ne quitte pas cet appareil.",
    api: "API",
    identity: "Identite",
    pact: "PACT",
    sign: "Signer",
    verify: "Verifier",
    export: "Exporter",
    revoke: "Revoquer",
    labs: "Labs",
    back: "Retour MVP",
    label: "Nom public",
    kind: "Type",
    createIdentity: "Creer l'identite",
    regenerateKeys: "Regenerer les cles locales",
    localKeyReady: "Cle locale prete",
    intent: "Intention",
    target: "Cible",
    object: "Objet JSON",
    terms: "Termes JSON",
    consent: "Consentement JSON",
    proof: "Preuve JSON",
    createPact: "Creer le PACT",
    signPact: "Signer cote client",
    verifyPact: "Verifier le PACT",
    loadBundle: "Charger bundle",
    verifyBundle: "Verifier hors-ligne",
    revokePact: "Revoquer",
    reason: "Raison",
    copyBundle: "Copier bundle",
    success: "Operation reussie.",
    offline: "API indisponible",
    noPrivateKey: "Aucune cle privee n'est envoyee a l'API.",
  },
  en: {
    product: "PACTARA",
    title: "Public Identity + PACT Console",
    subtitle:
      "Create a sovereign identity, sign a PACT in the browser, verify it, and export portable proof. The private key never leaves this device.",
    api: "API",
    identity: "Identity",
    pact: "PACT",
    sign: "Sign",
    verify: "Verify",
    export: "Export",
    revoke: "Revoke",
    labs: "Labs",
    back: "Back to MVP",
    label: "Public name",
    kind: "Kind",
    createIdentity: "Create identity",
    regenerateKeys: "Regenerate local keys",
    localKeyReady: "Local key ready",
    intent: "Intent",
    target: "Target",
    object: "Object JSON",
    terms: "Terms JSON",
    consent: "Consent JSON",
    proof: "Proof JSON",
    createPact: "Create PACT",
    signPact: "Sign client-side",
    verifyPact: "Verify PACT",
    loadBundle: "Load bundle",
    verifyBundle: "Verify offline",
    revokePact: "Revoke",
    reason: "Reason",
    copyBundle: "Copy bundle",
    success: "Operation complete.",
    offline: "API unavailable",
    noPrivateKey: "No private key is sent to the API.",
  },
} satisfies Record<Locale, Record<string, string>>;

export function PactaraMvpConsole() {
  const [locale, setLocale] = useState<Locale>("fr");
  const t = copy[locale];
  const [showLabs, setShowLabs] = useState(false);
  const [stage, setStage] = useState<Stage>("identity");
  const [health, setHealth] = useState("checking");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [keys, setKeys] = useState<ClientKeyMaterial | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [pact, setPact] = useState<Pact | null>(null);
  const [verification, setVerification] = useState<VerifyPactResponse | null>(null);
  const [bundle, setBundle] = useState<PactBundle | null>(null);
  const [offline, setOffline] = useState<BundleVerificationResponse | null>(null);
  const [qr, setQr] = useState("");

  const [label, setLabel] = useState("Amadou PACTARA");
  const [kind, setKind] = useState("person");
  const [intent, setIntent] = useState("consent.sign");
  const [target, setTarget] = useState("pactara:public:counterparty");
  const [objectText, setObjectText] = useState('{"subject":"MVP public","scope":"identity+pact"}');
  const [termsText, setTermsText] = useState('{"validity":"30d","value":"no real-money value"}');
  const [consentText, setConsentText] = useState('{"mode":"explicit","revocable":true}');
  const [proofText, setProofText] = useState('{"source":"browser-client-signature"}');
  const [revokeReason, setRevokeReason] = useState("Consent ended");

  useEffect(() => {
    const preferred = navigator.language.toLowerCase().startsWith("fr") ? "fr" : "en";
    setLocale(preferred);
    const stored = localStorage.getItem(keyStorage);
    if (stored) setKeys(JSON.parse(stored) as ClientKeyMaterial);
    void refreshHealth();
  }, []);

  useEffect(() => {
    async function makeQr() {
      if (!bundle) {
        setQr("");
        return;
      }
      setQr(await QRCode.toDataURL(JSON.stringify(bundle), { margin: 1, width: 320 }));
    }
    void makeQr();
  }, [bundle]);

  const steps = useMemo(
    () => [
      ["identity", t.identity],
      ["pact", t.pact],
      ["sign", t.sign],
      ["verify", t.verify],
      ["export", t.export],
      ["revoke", t.revoke],
    ] as Array<[Stage, string]>,
    [t]
  );

  if (showLabs) {
    return (
      <div>
        <div className="border-b border-ink/10 bg-white px-4 py-3">
          <button className="secondary-button" onClick={() => setShowLabs(false)}>
            <ExternalLink size={16} />
            {t.back}
          </button>
        </div>
        <PactaraDashboard />
      </div>
    );
  }

  async function run<T>(action: () => Promise<T>, success = t.success) {
    try {
      setLoading(true);
      setMessage("");
      const result = await action();
      setMessage(success);
      return result;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unknown error");
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function refreshHealth() {
    try {
      const result = await pactaraFetch<{ status: string }>("/health");
      setHealth(result.status);
    } catch {
      setHealth(t.offline);
    }
  }

  async function createLocalKeys() {
    const next = await generateClientKeys();
    localStorage.setItem(keyStorage, JSON.stringify(next));
    setKeys(next);
    setMessage(t.localKeyReady);
  }

  async function createIdentity() {
    const keyMaterial = keys ?? (await generateClientKeys());
    localStorage.setItem(keyStorage, JSON.stringify(keyMaterial));
    setKeys(keyMaterial);
    const created = await run(() =>
      pactaraFetch<Identity>("/v1/identities", {
        method: "POST",
        body: JSON.stringify({ label, kind, public_key: keyMaterial.publicKey }),
      })
    );
    if (created) {
      setIdentity(created);
      setTarget(created.id);
      setStage("pact");
    }
  }

  async function createPact() {
    if (!identity) return;
    const created = await run(() =>
      pactaraFetch<Pact>("/v1/pacts", {
        method: "POST",
        body: JSON.stringify({
          actor: identity.id,
          intent,
          target,
          object: parseJsonField(objectText, {}),
          terms: parseJsonField(termsText, {}),
          consent: parseJsonField(consentText, {}),
          proof: parseJsonField(proofText, {}),
          expires_at: null,
        }),
      })
    );
    if (created) {
      setPact(created);
      setVerification(null);
      setBundle(null);
      setStage("sign");
    }
  }

  async function signPact() {
    if (!pact || !keys) return;
    const signed = await signCanonicalValue(keys.privateKey, pactSigningPayload(pact));
    const active = await run(() =>
      pactaraFetch<Pact>(`/v1/pacts/${pact.id}/sign`, {
        method: "POST",
        body: JSON.stringify({
          public_key: keys.publicKey,
          signature: signed.signature,
          hash: signed.hash,
        }),
      })
    );
    if (active) {
      setPact(active);
      setStage("verify");
    }
  }

  async function verifyPact() {
    if (!pact) return;
    const result = await run(() =>
      pactaraFetch<VerifyPactResponse>(`/v1/pacts/${pact.id}/verify`, { method: "POST" })
    );
    if (result) {
      setVerification(result);
      setStage("export");
    }
  }

  async function loadBundle() {
    if (!pact) return;
    const result = await run(() => pactaraFetch<PactBundle>(`/v1/pacts/${pact.id}/bundle`));
    if (result) setBundle(result);
  }

  async function verifyBundle() {
    if (!bundle) return;
    const result = await run(() =>
      pactaraFetch<BundleVerificationResponse>("/v1/bundles/verify", {
        method: "POST",
        body: JSON.stringify(bundle),
      })
    );
    if (result) setOffline(result);
  }

  async function revokePact() {
    if (!pact || !identity) return;
    await run(() =>
      pactaraFetch(`/v1/pacts/${pact.id}/revoke`, {
        method: "POST",
        body: JSON.stringify({ reason: revokeReason, revoked_by: identity.id }),
      })
    );
    await verifyPact();
  }

  return (
    <main className="min-h-screen bg-[#f7f8f5] px-4 py-5 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="grid gap-5 border-b border-ink/10 pb-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-3 text-sm font-semibold uppercase text-signal">
              <ShieldCheck size={18} />
              {t.product}
            </div>
            <h1 className="mt-3 max-w-4xl text-3xl font-semibold sm:text-5xl">{t.title}</h1>
            <p className="mt-3 max-w-3xl text-base text-ink/65">{t.subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="secondary-button" onClick={() => setLocale(locale === "fr" ? "en" : "fr")}>
              <Globe2 size={16} />
              {locale.toUpperCase()}
            </button>
            <button className="secondary-button" onClick={() => setShowLabs(true)}>
              <ExternalLink size={16} />
              {t.labs}
            </button>
            <button className="secondary-button" onClick={() => void refreshHealth()}>
              <RefreshCw size={16} />
              {t.api}: {health}
            </button>
          </div>
        </header>

        <nav className="grid grid-cols-2 gap-2 md:grid-cols-6">
          {steps.map(([id, labelText], index) => {
            const active = id === stage;
            const reached = steps.findIndex(([step]) => step === stage) >= index;
            return (
              <button
                key={id}
                onClick={() => setStage(id)}
                className={`flex h-12 items-center justify-center gap-2 rounded border text-sm font-medium ${
                  active
                    ? "border-ink bg-ink text-white"
                    : reached
                      ? "border-signal/30 bg-white text-ink"
                      : "border-ink/10 bg-white text-ink/45"
                }`}
              >
                {reached ? <CheckCircle2 size={15} /> : null}
                {labelText}
              </button>
            );
          })}
        </nav>

        {message ? (
          <div className="rounded border border-ink/10 bg-white px-4 py-3 text-sm shadow-panel">{message}</div>
        ) : null}

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded border border-ink/10 bg-white p-5 shadow-panel">
            {stage === "identity" ? (
              <Panel icon={Fingerprint} title={t.identity}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t.label}>
                    <input className="input" value={label} onChange={(event) => setLabel(event.target.value)} />
                  </Field>
                  <Field label={t.kind}>
                    <select className="input" value={kind} onChange={(event) => setKind(event.target.value)}>
                      {["person", "organization", "agent", "machine", "product", "place"].map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button className="secondary-button" onClick={() => void createLocalKeys()}>
                    <KeyRound size={16} />
                    {t.regenerateKeys}
                  </button>
                  <button className="primary-button" disabled={loading} onClick={() => void createIdentity()}>
                    <Fingerprint size={16} />
                    {t.createIdentity}
                  </button>
                </div>
                <StatusNote ok={Boolean(keys)} text={keys ? t.localKeyReady : t.noPrivateKey} />
              </Panel>
            ) : null}

            {stage === "pact" ? (
              <Panel icon={SquarePen} title={t.pact}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t.intent}>
                    <input className="input" value={intent} onChange={(event) => setIntent(event.target.value)} />
                  </Field>
                  <Field label={t.target}>
                    <input className="input" value={target} onChange={(event) => setTarget(event.target.value)} />
                  </Field>
                </div>
                <JsonField label={t.object} value={objectText} onChange={setObjectText} />
                <JsonField label={t.terms} value={termsText} onChange={setTermsText} />
                <JsonField label={t.consent} value={consentText} onChange={setConsentText} />
                <JsonField label={t.proof} value={proofText} onChange={setProofText} />
                <button className="primary-button" disabled={!identity || loading} onClick={() => void createPact()}>
                  <SquarePen size={16} />
                  {t.createPact}
                </button>
              </Panel>
            ) : null}

            {stage === "sign" ? (
              <Panel icon={KeyRound} title={t.sign}>
                <StatusNote ok={Boolean(keys)} text={t.noPrivateKey} />
                <button className="primary-button" disabled={!pact || !keys || loading} onClick={() => void signPact()}>
                  <KeyRound size={16} />
                  {t.signPact}
                </button>
                {pact ? <JsonBlock value={pact} /> : null}
              </Panel>
            ) : null}

            {stage === "verify" ? (
              <Panel icon={ShieldCheck} title={t.verify}>
                <button className="primary-button" disabled={!pact || loading} onClick={() => void verifyPact()}>
                  <ShieldCheck size={16} />
                  {t.verifyPact}
                </button>
                {verification ? <VerificationCard verification={verification} /> : null}
              </Panel>
            ) : null}

            {stage === "export" ? (
              <Panel icon={QrCode} title={t.export}>
                <div className="flex flex-wrap gap-3">
                  <button className="secondary-button" disabled={!pact || loading} onClick={() => void loadBundle()}>
                    <QrCode size={16} />
                    {t.loadBundle}
                  </button>
                  <button className="primary-button" disabled={!bundle || loading} onClick={() => void verifyBundle()}>
                    <BadgeCheck size={16} />
                    {t.verifyBundle}
                  </button>
                  <button
                    className="secondary-button"
                    disabled={!bundle}
                    onClick={() => bundle && navigator.clipboard.writeText(JSON.stringify(bundle, null, 2))}
                  >
                    <Copy size={16} />
                    {t.copyBundle}
                  </button>
                </div>
                {qr ? <img className="h-48 w-48 rounded border border-ink/10" src={qr} alt="PACTARA bundle QR" /> : null}
                {offline ? <VerificationCard verification={offline} /> : null}
                {bundle ? <JsonBlock value={bundle} /> : null}
              </Panel>
            ) : null}

            {stage === "revoke" ? (
              <Panel icon={XCircle} title={t.revoke}>
                <Field label={t.reason}>
                  <input className="input" value={revokeReason} onChange={(event) => setRevokeReason(event.target.value)} />
                </Field>
                <button className="danger-button" disabled={!pact || !identity || loading} onClick={() => void revokePact()}>
                  <XCircle size={16} />
                  {t.revokePact}
                </button>
                {verification ? <VerificationCard verification={verification} /> : null}
              </Panel>
            ) : null}
          </div>

          <aside className="rounded border border-ink/10 bg-white p-5 shadow-panel">
            <h2 className="text-lg font-semibold">Live state</h2>
            <StateLine label={t.identity} value={identity?.id ?? "pending"} />
            <StateLine label="Public key" value={identity?.public_key ?? keys?.publicKey ?? "local key pending"} />
            <StateLine label={t.pact} value={pact?.id ?? "pending"} />
            <StateLine label="Status" value={verification?.status ?? pact?.status ?? "draft"} />
            <StateLine label="API base" value={API_BASE} />
          </aside>
        </section>
      </div>
    </main>
  );
}

function Panel({
  icon: Icon,
  title,
  children,
}: {
  icon: ComponentType<{ size?: number; className?: string }>;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded bg-signal/10 text-signal">
          <Icon size={19} />
        </span>
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-ink/70">{label}</span>
      {children}
    </label>
  );
}

function JsonField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <textarea className="textarea" value={value} onChange={(event) => onChange(event.target.value)} />
    </Field>
  );
}

function StatusNote({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className={`rounded border px-4 py-3 text-sm ${ok ? "border-signal/20 bg-signal/5" : "border-ink/10 bg-ink/[0.03]"}`}>
      {text}
    </div>
  );
}

function VerificationCard({ verification }: { verification: VerifyPactResponse }) {
  return (
    <div className="rounded border border-ink/10 bg-ink/[0.03] p-4">
      <p className="flex items-center gap-2 font-medium">
        <ShieldCheck size={18} className={verification.valid ? "text-signal" : "text-ember"} />
        {verification.valid ? "Valid" : "Not valid"} / {verification.status}
      </p>
      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <span>Hash: {verification.hash_matches ? "match" : "mismatch"}</span>
        <span>Signature: {verification.signature_valid ? "valid" : "invalid"}</span>
        <span>Revoked: {verification.revoked ? "yes" : "no"}</span>
      </div>
    </div>
  );
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="max-h-96 overflow-auto rounded border border-ink/10 bg-ink p-4 text-xs leading-relaxed text-white">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function StateLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4 rounded border border-ink/10 p-4">
      <p className="text-xs uppercase text-ink/45">{label}</p>
      <p className="mt-1 break-all font-mono text-xs text-ink/70">{value}</p>
    </div>
  );
}
