import type { FieldMapping, SchemaField, TransformOp } from "@/lib/types";
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

function score(source: string, target: string) {
  const s = normalize(source);
  const t = normalize(target);
  if (!s || !t) return 0;
  if (s === t) return 100;
  if (s.includes(t) || t.includes(s)) return 80;

  const aliases = ALIASES[t] ?? [];
  if (aliases.includes(s)) return 92;

  const extAliases = ALIASES.external_id;
  if ((t === "externalid" || target.endsWith("__c")) && extAliases.includes(s) && /id$/i.test(source)) {
    return 88;
  }

  let overlap = 0;
  const shorter = s.length < t.length ? s : t;
  const longer = s.length < t.length ? t : s;
  if (longer.includes(shorter) && shorter.length >= 4) overlap = 60;
  return overlap;
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

  for (const source of sourceFields) {
    let best: { field: SchemaField; score: number } | null = null;
    for (const target of writable) {
      if (usedTargets.has(target.name)) continue;
      const next = score(source.name, target.name);
      if (!best || next > best.score) best = { field: target, score: next };
    }
    if (best && best.score >= 60) {
      usedTargets.add(best.field.name);
      mappings.push({
        id: id("map"),
        sourceField: source.name,
        targetField: best.field.name,
        transform: suggestedTransform(source, best.field),
      });
    }
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
