import * as ed from "@noble/ed25519";
import { blake3 } from "@noble/hashes/blake3.js";
import { sha512 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

ed.hashes.sha512 = sha512;

const textEncoder = new TextEncoder();

export type ClientKeyMaterial = {
  publicKey: string;
  privateKey: string;
};

export type ClientSignature = {
  hash: string;
  signature: string;
};

export async function generateClientKeys(): Promise<ClientKeyMaterial> {
  const privateKey = ed.utils.randomSecretKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  return {
    publicKey: base64UrlEncode(publicKey),
    privateKey: base64UrlEncode(privateKey),
  };
}

export async function signCanonicalValue(
  privateKey: string,
  value: unknown
): Promise<ClientSignature> {
  const canonical = canonicalize(value);
  const message = textEncoder.encode(canonical);
  const signature = await ed.signAsync(message, base64UrlDecode(privateKey));
  return {
    hash: bytesToHex(blake3(message)),
    signature: base64UrlEncode(signature),
  };
}

export function pactSigningPayload(pact: {
  id: string;
  actor: string;
  intent: string;
  object: unknown;
  target: string;
  terms: unknown;
  consent: unknown;
  proof: unknown;
  created_at: string;
  expires_at: string;
}) {
  return {
    id: pact.id,
    actor: pact.actor,
    intent: pact.intent,
    object: pact.object,
    target: pact.target,
    terms: pact.terms,
    consent: pact.consent,
    proof: pact.proof,
    created_at: pact.created_at,
    expires_at: pact.expires_at,
  };
}

export function canonicalize(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return String(value);
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize(object[key])}`)
      .join(",")}}`;
  }
  return "null";
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
