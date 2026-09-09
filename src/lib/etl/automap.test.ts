import assert from "node:assert/strict";
import { test } from "node:test";
import { autoMapFields } from "./automap";
import type { SchemaField } from "../types";

const salesforce: SchemaField[] = [
  { name: "Id", label: "Account ID", type: "id", required: false, createable: false, updateable: false },
  { name: "Name", label: "Account Name", type: "string", required: true, createable: true, updateable: true },
  { name: "AccountNumber", label: "Account Number", type: "string", required: false, createable: true, updateable: true },
  { name: "Industry", label: "Industry", type: "picklist", required: false, createable: true, updateable: true },
  { name: "AnnualRevenue", label: "Annual Revenue", type: "currency", required: false, createable: true, updateable: true },
  { name: "Email", label: "Email", type: "email", required: false, createable: true, updateable: true },
];

test("maps column headers that match Salesforce API names", () => {
  const source: SchemaField[] = [
    { name: "Name", label: "Name", type: "string" },
    { name: "AccountNumber", label: "AccountNumber", type: "string" },
    { name: "Industry", label: "Industry", type: "string" },
    { name: "AnnualRevenue", label: "AnnualRevenue", type: "currency" },
  ];
  const maps = autoMapFields(source, salesforce);
  assert.equal(maps.find((m) => m.sourceField === "Name")?.targetField, "Name");
  assert.equal(maps.find((m) => m.sourceField === "Name")?.matchedBy, "api");
  assert.equal(maps.find((m) => m.sourceField === "AccountNumber")?.targetField, "AccountNumber");
  assert.equal(maps.find((m) => m.sourceField === "AccountNumber")?.matchedBy, "api");
  assert.equal(maps.find((m) => m.sourceField === "Industry")?.targetField, "Industry");
  assert.equal(maps.find((m) => m.sourceField === "AnnualRevenue")?.targetField, "AnnualRevenue");
});

test("maps dotted headers, labels, and aliases to Salesforce API names", () => {
  const dotted = autoMapFields(
    [{ name: "Account.Name", label: "Account.Name", type: "string" }],
    salesforce,
  );
  assert.equal(dotted[0]?.targetField, "Name");
  assert.equal(dotted[0]?.matchedBy, "api");

  const labeled = autoMapFields(
    [{ name: "Account Name", label: "Account Name", type: "string" }],
    salesforce,
  );
  assert.equal(labeled[0]?.targetField, "Name");
  assert.equal(labeled[0]?.matchedBy, "label");

  const aliased = autoMapFields(
    [{ name: "email_address", label: "email_address", type: "string" }],
    salesforce,
  );
  assert.equal(aliased[0]?.targetField, "Email");
  assert.equal(aliased[0]?.matchedBy, "alias");
});
