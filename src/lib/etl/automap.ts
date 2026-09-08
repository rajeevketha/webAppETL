import type { FieldMapping, MatchReason, SchemaField, TransformOp } from "@/lib/types";
import { id } from "@/lib/ids";

function normalize(name: string) {
  return name
    .replace(/__c$/i, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

const ALIASES: Record<string, string[]> = {
  name: ["customername", "accountname", "company", "companyname", "oppname", "subject"],
  accountnumber: ["customernumber", "custnumber", "accountno", "acctnumber"],
  firstname: ["fname", "givenname"],
  lastname: ["lname", "surname", "familyname"],
  email: ["emailaddress", "mail"],
  phone: ["telephone", "phonenumber", "mobile"],
  website: ["url", "web"],
  billingstreet: ["street", "address", "addr1", "address1"],
  billingcity: ["city", "town"],
  billingstate: ["state", "province", "region"],
  billingpostalcode: ["postalcode", "zip", "zipcode", "postcode"],
  billingcountry: ["country", "countrycode"],
  mailingstreet: ["street", "address"],
  mailingcity: ["city"],
  mailingstate: ["state", "province"],
  mailingpostalcode: ["postalcode", "zip"],
  mailingcountry: ["country"],
  annualrevenue: ["revenue", "annualrev"],
  numberofemployees: ["employees", "headcount", "empcount"],
  description: ["notes", "comments", "desc"],
  industry: ["industrycd", "sector"],
  type: ["accounttype", "accttype", "opptype"],
  stagename: ["stage", "oppstage"],
  closedate: ["closedt", "expectedclose"],
  amount: ["value", "dealvalue"],
  company: ["customername", "accountname"],
  status: ["leadstatus", "casestatus"],
  external_id: ["customerid", "contactid", "oppid", "externalid", "extid"],
};

export function matchSourceToSalesforce(
  sourceName: string,
  sourceLabel: string,
  target: SchemaField,
): { score: number; reason: MatchReason } {
  const sourceNorm = normalize(sourceName);
  const sourceLabelNorm = normalize(sourceLabel || sourceName);
  const apiNorm = normalize(target.name);
  const labelNorm = normalize(target.label);
  const dotted = sourceName.split(/[.:]/).pop() || sourceName;
  const dottedNorm = normalize(dotted);

  if (sourceNorm === apiNorm || sourceLabelNorm === apiNorm || dottedNorm === apiNorm) {
    return { score: 100, reason: "api" };
  }
  if (sourceNorm === labelNorm || sourceLabelNorm === labelNorm) {
    return { score: 98, reason: "label" };
  }
  if (sourceNorm.endsWith(apiNorm) && apiNorm.length >= 4) {
    return { score: 94, reason: "api" };
  }

  const aliases = ALIASES[apiNorm] ?? [];
  if (aliases.includes(sourceNorm) || aliases.includes(sourceLabelNorm)) {
    return { score: 92, reason: "alias" };
  }

  const extAliases = ALIASES.external_id;
  if ((apiNorm === "externalid" || target.externalId || target.name.endsWith("__c"))
    && extAliases.includes(sourceNorm)
    && /id$/i.test(sourceName)) {
    return { score: 88, reason: "alias" };
  }

  if (sourceNorm.includes(apiNorm) || apiNorm.includes(sourceNorm) || sourceNorm.includes(labelNorm)) {
    if (Math.min(sourceNorm.length, apiNorm.length) >= 4) {
      return { score: 80, reason: "fuzzy" };
    }
  }

  const shorter = sourceNorm.length < apiNorm.length ? sourceNorm : apiNorm;
  const longer = sourceNorm.length < apiNorm.length ? apiNorm : sourceNorm;
  if (longer.includes(shorter) && shorter.length >= 4) {
    return { score: 60, reason: "fuzzy" };
  }
  return { score: 0, reason: "fuzzy" };
}

function suggestedTransform(source: SchemaField, target: SchemaField): TransformOp {
  if (target.type === "date" || target.type === "datetime") {
    return { type: "date_format", to: "yyyy-MM-dd" };
  }
  if (target.type === "int" || target.type === "double" || target.type === "currency") {
    return { type: "number" };
  }
  if (target.type === "boolean") {
    return { type: "boolean" };
  }
  if (target.name === "Name" || target.name === "FirstName" || target.name === "LastName") {
    return { type: "title" };
  }
  if (source.name.toUpperCase() === source.name && target.type === "string") {
    return { type: "trim" };
  }
  return { type: "none" };
}

export function autoMapFields(sourceFields: SchemaField[], targetFields: SchemaField[]): FieldMapping[] {
  const usedTargets = new Set<string>();
  const mappings: FieldMapping[] = [];
  const writable = targetFields.filter((field) => field.createable !== false && field.name !== "Id");

  const ranked = sourceFields.flatMap((source) =>
    writable.map((target) => {
      const match = matchSourceToSalesforce(source.name, source.label, target);
      return { source, target, ...match };
    }),
  ).sort((a, b) => b.score - a.score);

  for (const item of ranked) {
    if (item.score < 60) continue;
    if (usedTargets.has(item.target.name)) continue;
    if (mappings.some((m) => m.sourceField === item.source.name)) continue;
    usedTargets.add(item.target.name);
    mappings.push({
      id: id("map"),
      sourceField: item.source.name,
      targetField: item.target.name,
      transform: suggestedTransform(item.source, item.target),
      matchedBy: item.reason,
    });
  }

  return mappings;
}

export function defaultLookupFor(targetField: string): Record<string, string> | null {
  if (targetField === "Type") {
    return { CUST: "Customer", CUSTOMER: "Customer", PARTNER: "Partner", PROSPECT: "Prospect" };
  }
  if (targetField === "Rating") {
    return { A: "Hot", B: "Warm", C: "Cold" };
  }
  if (targetField === "StageName") {
    return {
      QUALIFY: "Qualification",
      NEGOTIATION: "Negotiation/Review",
      PROPOSAL: "Proposal/Price Quote",
      WON: "Closed Won",
      LOST: "Closed Lost",
    };
  }
  if (targetField === "BillingCountry" || targetField === "MailingCountry") {
    return { US: "United States", UK: "United Kingdom", IN: "India", CA: "Canada" };
  }
  return null;
}
