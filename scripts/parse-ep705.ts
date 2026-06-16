#!/usr/bin/env bun
/**
 * parse-ep705.ts — extract sales-draft transactions from a VisaNet Edit Package
 * EP-705 report (human-readable, fixed-width, two-column "form" layout).
 *
 * Extraction mechanism
 *   1. Strip pagination: a line starting "REPORT EP-" plus the next 2 header lines.
 *   2. Segment into clearing records at each "Sales Draft - Original ---- Required Data".
 *   3. For every content line, read the TWO fixed column windows (1-based cols):
 *          left  label 2–26   value 28–66
 *          right label 68–92  value 94–133
 *      Key each value by its LABEL text -> order/AFT-code changes don't break it.
 *   4. Emit one NDJSON record per transaction; the PAN is masked one-way.
 *
 * Amount convention (verified against the EP110F control totals)
 *   - Source/Destination "clearing amount" fields carry 2 implied decimals ALWAYS  -> ÷ 100
 *   - Authorized / fee amounts use the currency's ISO exponent (VND/704 = 0)        -> ÷ 10^exp
 *
 * Validation
 *   After parsing, Σ(source amount) and record count are checked against the RUN
 *   total in EP110F (same folder). A mismatch exits non-zero (fail-closed).
 *
 * PCI: the PAN ("Acct Number & Extension") is NEVER emitted in the clear — only
 *      last-4 + HMAC-SHA256(salt, PAN). Export PAN_HASH_SALT to set a real secret salt.
 *
 * Usage:  bun run scripts/parse-ep705.ts [path-to-EP705.txt] [count|all]
 *         bun run scripts/parse-ep705.ts > transactions.ndjson      # full dump
 */
import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import { dirname, join } from "node:path";

const ep705Path = process.argv[2] ?? "data/d251228_r1_t162613_prod/EP705.txt";
const countArg = process.argv[3] ?? "all";
const limit = /^all$/i.test(countArg) ? Infinity : Number(countArg);

const SALT = process.env.PAN_HASH_SALT;
if (!SALT) console.error("⚠  PAN_HASH_SALT not set — using a demo salt (NOT for production).");
const panSalt = SALT ?? "demo-salt-not-for-production";
const hashPan = (digits: string) => createHmac("sha256", panSalt).update(digits).digest("hex");

// ISO 4217 minor units (extend as currencies appear).
const MINOR: Record<string, number> = { "704": 0, "840": 2, "978": 2, "392": 0, "826": 2 };
const expo = (ccy: string) => MINOR[ccy] ?? 2;
const clearingAmt = (raw: string): number | null => (raw ? Number(raw) / 100 : null);
const ccyAmt = (raw: string, ccy: string): number | null => (raw ? Number(raw) / 10 ** expo(ccy) : null);

type Rec = Map<string, string>;

/** Stream of clearing records, page-headers stripped, fields keyed by label. */
function* records(lines: string[]): Generator<Rec> {
  const reqStart = /Sales Draft - Original\s+----\s+Required Data/;
  const anySection = /Sales Draft - Original\s+----/;
  let cur: Rec | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("REPORT EP-")) { i += 2; continue; }   // drop the 3-line page header
    if (reqStart.test(line)) { if (cur) yield cur; cur = new Map(); continue; }
    if (!cur || anySection.test(line)) continue;               // skip other section headers
    for (const half of [line.slice(0, 66), line.slice(66)]) {  // left column, then right column
      const label = half.slice(1, 26).trim();
      const value = half.slice(27).trim();
      if (label && !cur.has(label)) cur.set(label, value);     // first occurrence wins
    }
  }
  if (cur) yield cur;
}

const lines = readFileSync(ep705Path, "latin1").split(/\r?\n/);

let parsed = 0;
let emitted = 0;
let sumSource = 0;

for (const r of records(lines)) {
  parsed++;
  const g = (k: string) => r.get(k) ?? "";
  const srcCcy = g("Source Currency Code");
  const src = clearingAmt(g("Source Amount"));
  if (src != null) sumSource += src;

  if (emitted < limit) {
    const panDigits = g("Acct Number & Extension").replace(/\D/g, "");
    const pan = panDigits.length === 19 ? panDigits.slice(0, 16) : panDigits;   // strip 3-digit extension
    const authCcy = g("Auth Currency Cd");

    console.log(JSON.stringify({
      transaction_identifier: g("Transaction Identifier"),
      acquirer_reference_number: g("Acquirer Reference Nbr"),
      acquirer_business_id: g("Acquirer's Business ID"),
      authorization_code: g("Authorization Code"),
      authorization_response: g("Authorization Response Cd"),
      usage_code: g("Usage Code"),
      settlement_flag: g("Settlement Flag"),
      reimbursement_attribute: g("Reimbursement Attribute"),
      source_amount: src,
      source_currency: srcCcy,
      destination_amount: clearingAmt(g("Destination Amount")),
      destination_currency: g("Destination Currency Code"),
      authorized_amount: ccyAmt(g("Authorized Amount"), authCcy),
      auth_currency: authCcy,
      interchange_fee: ccyAmt(g("Interchange Fee Amount"), srcCcy),
      interchange_fee_sign: g("Interchange Fee Sign"),
      src_to_base_fx: g("Src to Base Curr Ex Rate"),
      base_to_dest_fx: g("Base to Dest Curr Ex Rate"),
      mcc: g("Merchant Category Code"),
      merchant_name: g("Merchant Name"),
      merchant_city: g("Merchant City"),
      merchant_country: g("Merchant Country Code"),
      card_acceptor_id: g("Card Acceptor ID"),
      terminal_id: g("Terminal ID"),
      purchase_date: g("Purchase Date"),
      central_processing_date: g("Central Processing Date"),
      multiple_clearing_seq: g("Multiple Clearing Seq Nbr"),
      multiple_clearing_cnt: g("Multiple Clearing Seq Cnt"),
      account_funding_source: g("Account Funding Source"),
      pan_token: g("PAN Token"),
      acct_last4: pan.slice(-4),
      acct_hash: pan ? hashPan(pan) : "",
    }));
    emitted++;
  }
}

// ---- control-total validation against EP110F (RUN line) ----
const round2 = (n: number) => Math.round(n * 100) / 100;
const sum = round2(sumSource);
const controlPath = join(dirname(ep705Path), "EP110F.txt");
let ctrl: { count: number; amount: number } | null = null;
try {
  const m = readFileSync(controlPath, "latin1").match(/^\s*RUN\s+\d+\s+([\d,]+)\s+([\d,]+\.\d{2})/m);
  if (m) ctrl = { count: Number(m[1].replace(/,/g, "")), amount: Number(m[2].replace(/,/g, "")) };
} catch { /* control file absent */ }

console.error("\n──────── validation ────────");
console.error(`parsed records  : ${parsed.toLocaleString()}`);
console.error(`Σ source amount : ${sum.toLocaleString()}  (Source field ÷ 100)`);
if (ctrl) {
  const countOk = parsed === ctrl.count;
  const amtOk = sum === round2(ctrl.amount);
  console.error(`control (EP110F): count ${ctrl.count.toLocaleString()}   amount ${ctrl.amount.toLocaleString()}`);
  console.error(`count match     : ${countOk ? "✓ PASS" : "✗ FAIL"}`);
  console.error(`amount match    : ${amtOk ? "✓ PASS" : "✗ FAIL"}`);
  if (!countOk || !amtOk) process.exitCode = 1;
} else {
  console.error(`control (EP110F): not found at ${controlPath} — skipped`);
}
console.error(`emitted to stdout: ${emitted.toLocaleString()}${limit === Infinity ? " (all)" : ""}`);
