import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyTransform, mapRow } from "./transform";
import { autoMapFields } from "./automap";
import { validateMappings, validateRows } from "./validate";

describe("transforms", () => {
  it("titles and trims names", () => {
    assert.equal(applyTransform({ type: "title" }, "  solar kite energy  ", {}), "Solar Kite Energy");
  });

  it("formats oracle dates", () => {
    assert.equal(
      applyTransform({ type: "date_format", to: "yyyy-MM-dd" }, "15-OCT-2026", {}),
      "2026-10-15",
    );
  });

  it("looks up account types", () => {
    assert.equal(
      applyTransform({ type: "lookup", map: { CUST: "Customer", PROSPECT: "Prospect" } }, "cust", {}),
      "Customer",
    );
  });

  it("renders templates", () => {
    assert.equal(
      applyTransform({ type: "template", template: "{{FIRST_NAME}} {{LAST_NAME}}" }, null, {
        FIRST_NAME: "Priya",
        LAST_NAME: "Raman",
      }),
      "Priya Raman",
    );
  });

  it("maps a customer row", () => {
    const out = mapRow(
      { CUSTOMER_NAME: "northwind manufacturing", CUSTOMER_ID: "CUST-1001" },
      [
        { sourceField: "CUSTOMER_NAME", targetField: "Name", transform: { type: "title" } },
        { sourceField: "CUSTOMER_ID", targetField: "External_Id__c", transform: { type: "none" } },
      ],
    );
    assert.equal(out.Name, "Northwind Manufacturing");
    assert.equal(out.External_Id__c, "CUST-1001");
  });
});

describe("automap", () => {
  it("maps oracle customer columns onto Account", () => {
    const mappings = autoMapFields(
      [
        { name: "CUSTOMER_NAME", label: "Name", type: "string" },
        { name: "CUSTOMER_NUMBER", label: "Number", type: "string" },
        { name: "INDUSTRY", label: "Industry", type: "string" },
        { name: "CUSTOMER_ID", label: "Id", type: "string" },
      ],
      [
        { name: "Name", label: "Account Name", type: "string", createable: true },
        { name: "AccountNumber", label: "Account Number", type: "string", createable: true },
        { name: "Industry", label: "Industry", type: "picklist", createable: true },
        { name: "External_Id__c", label: "External Id", type: "string", createable: true, externalId: true },
      ],
    );
    const byTarget = Object.fromEntries(mappings.map((m) => [m.targetField, m.sourceField]));
    assert.equal(byTarget.Name, "CUSTOMER_NAME");
    assert.equal(byTarget.AccountNumber, "CUSTOMER_NUMBER");
    assert.equal(byTarget.Industry, "INDUSTRY");
  });
});

describe("validate", () => {
  it("flags missing required fields", () => {
    const issues = validateMappings(
      [],
      [{ name: "Name", label: "Account Name", type: "string", required: true, createable: true }],
      "insert",
    );
    assert.equal(issues.some((i) => i.level === "error"), true);
  });

  it("flags bad emails", () => {
    const issues = validateRows(
      [{ Email: "not-an-email" }],
      [{ name: "Email", label: "Email", type: "email" }],
    );
    assert.equal(issues[0]?.message.includes("Invalid email"), true);
  });
});
