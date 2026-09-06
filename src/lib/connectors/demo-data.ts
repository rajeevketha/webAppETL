import type { Row, SchemaObject } from "@/lib/types";

export const SALESFORCE_OBJECTS: SchemaObject[] = [
  {
    name: "Account",
    label: "Account",
    fields: [
      { name: "Id", label: "Account ID", type: "id", createable: false, updateable: false },
      { name: "Name", label: "Account Name", type: "string", required: true, createable: true, updateable: true, length: 255 },
      { name: "AccountNumber", label: "Account Number", type: "string", createable: true, updateable: true, length: 40 },
      {
        name: "Type",
        label: "Account Type",
        type: "picklist",
        createable: true,
        updateable: true,
        picklistValues: ["Customer", "Partner", "Prospect", "Other"],
      },
      {
        name: "Industry",
        label: "Industry",
        type: "picklist",
        createable: true,
        updateable: true,
        picklistValues: [
          "Agriculture", "Apparel", "Banking", "Biotechnology", "Chemicals", "Communications",
          "Construction", "Consulting", "Education", "Electronics", "Energy", "Engineering",
          "Entertainment", "Environmental", "Finance", "Food & Beverage", "Government",
          "Healthcare", "Hospitality", "Insurance", "Machinery", "Manufacturing", "Media",
          "Not For Profit", "Recreation", "Retail", "Shipping", "Technology",
          "Telecommunications", "Transportation", "Utilities", "Other",
        ],
      },
      { name: "Phone", label: "Phone", type: "phone", createable: true, updateable: true },
      { name: "Website", label: "Website", type: "url", createable: true, updateable: true },
      { name: "BillingStreet", label: "Billing Street", type: "textarea", createable: true, updateable: true },
      { name: "BillingCity", label: "Billing City", type: "string", createable: true, updateable: true, length: 40 },
      { name: "BillingState", label: "Billing State/Province", type: "string", createable: true, updateable: true, length: 80 },
      { name: "BillingPostalCode", label: "Billing Zip/Postal Code", type: "string", createable: true, updateable: true, length: 20 },
      { name: "BillingCountry", label: "Billing Country", type: "string", createable: true, updateable: true, length: 80 },
      { name: "AnnualRevenue", label: "Annual Revenue", type: "currency", createable: true, updateable: true },
      { name: "NumberOfEmployees", label: "Employees", type: "int", createable: true, updateable: true },
      { name: "Description", label: "Description", type: "textarea", createable: true, updateable: true },
      {
        name: "Rating",
        label: "Rating",
        type: "picklist",
        createable: true,
        updateable: true,
        picklistValues: ["Hot", "Warm", "Cold"],
      },
      { name: "External_Id__c", label: "External Id", type: "string", createable: true, updateable: true, externalId: true, length: 80 },
    ],
  },
  {
    name: "Contact",
    label: "Contact",
    fields: [
      { name: "Id", label: "Contact ID", type: "id", createable: false, updateable: false },
      { name: "FirstName", label: "First Name", type: "string", createable: true, updateable: true, length: 40 },
      { name: "LastName", label: "Last Name", type: "string", required: true, createable: true, updateable: true, length: 80 },
      { name: "Email", label: "Email", type: "email", createable: true, updateable: true },
      { name: "Phone", label: "Phone", type: "phone", createable: true, updateable: true },
      { name: "Title", label: "Title", type: "string", createable: true, updateable: true, length: 128 },
      { name: "Department", label: "Department", type: "string", createable: true, updateable: true, length: 80 },
      { name: "AccountId", label: "Account ID", type: "reference", createable: true, updateable: true, referenceTo: ["Account"] },
      { name: "MailingStreet", label: "Mailing Street", type: "textarea", createable: true, updateable: true },
      { name: "MailingCity", label: "Mailing City", type: "string", createable: true, updateable: true, length: 40 },
      { name: "MailingState", label: "Mailing State/Province", type: "string", createable: true, updateable: true, length: 80 },
      { name: "MailingPostalCode", label: "Mailing Zip/Postal Code", type: "string", createable: true, updateable: true, length: 20 },
      { name: "MailingCountry", label: "Mailing Country", type: "string", createable: true, updateable: true, length: 80 },
      { name: "External_Id__c", label: "External Id", type: "string", createable: true, updateable: true, externalId: true, length: 80 },
    ],
  },
  {
    name: "Lead",
    label: "Lead",
    fields: [
      { name: "Id", label: "Lead ID", type: "id", createable: false, updateable: false },
      { name: "FirstName", label: "First Name", type: "string", createable: true, updateable: true, length: 40 },
      { name: "LastName", label: "Last Name", type: "string", required: true, createable: true, updateable: true, length: 80 },
      { name: "Company", label: "Company", type: "string", required: true, createable: true, updateable: true, length: 255 },
      { name: "Email", label: "Email", type: "email", createable: true, updateable: true },
      { name: "Phone", label: "Phone", type: "phone", createable: true, updateable: true },
      { name: "Title", label: "Title", type: "string", createable: true, updateable: true, length: 128 },
      {
        name: "Status",
        label: "Status",
        type: "picklist",
        required: true,
        createable: true,
        updateable: true,
        picklistValues: ["Open - Not Contacted", "Working - Contacted", "Closed - Converted", "Closed - Not Converted"],
      },
      {
        name: "Industry",
        label: "Industry",
        type: "picklist",
        createable: true,
        updateable: true,
        picklistValues: ["Technology", "Manufacturing", "Healthcare", "Finance", "Retail", "Other"],
      },
      { name: "External_Id__c", label: "External Id", type: "string", createable: true, updateable: true, externalId: true, length: 80 },
    ],
  },
  {
    name: "Opportunity",
    label: "Opportunity",
    fields: [
      { name: "Id", label: "Opportunity ID", type: "id", createable: false, updateable: false },
      { name: "Name", label: "Opportunity Name", type: "string", required: true, createable: true, updateable: true, length: 120 },
      {
        name: "StageName",
        label: "Stage",
        type: "picklist",
        required: true,
        createable: true,
        updateable: true,
        picklistValues: [
          "Prospecting", "Qualification", "Needs Analysis", "Value Proposition",
          "Id. Decision Makers", "Perception Analysis", "Proposal/Price Quote",
          "Negotiation/Review", "Closed Won", "Closed Lost",
        ],
      },
      { name: "CloseDate", label: "Close Date", type: "date", required: true, createable: true, updateable: true },
      { name: "Amount", label: "Amount", type: "currency", createable: true, updateable: true },
      { name: "AccountId", label: "Account ID", type: "reference", createable: true, updateable: true, referenceTo: ["Account"] },
      {
        name: "Type",
        label: "Type",
        type: "picklist",
        createable: true,
        updateable: true,
        picklistValues: ["Existing Customer - Upgrade", "Existing Customer - Replacement", "Existing Customer - Downgrade", "New Customer"],
      },
      { name: "External_Id__c", label: "External Id", type: "string", createable: true, updateable: true, externalId: true, length: 80 },
    ],
  },
  {
    name: "Case",
    label: "Case",
    fields: [
      { name: "Id", label: "Case ID", type: "id", createable: false, updateable: false },
      { name: "Subject", label: "Subject", type: "string", required: true, createable: true, updateable: true, length: 255 },
      {
        name: "Status",
        label: "Status",
        type: "picklist",
        required: true,
        createable: true,
        updateable: true,
        picklistValues: ["New", "Working", "On Hold", "Escalated", "Closed"],
      },
      {
        name: "Origin",
        label: "Case Origin",
        type: "picklist",
        createable: true,
        updateable: true,
        picklistValues: ["Phone", "Email", "Web", "Internal"],
      },
      {
        name: "Priority",
        label: "Priority",
        type: "picklist",
        createable: true,
        updateable: true,
        picklistValues: ["High", "Medium", "Low"],
      },
      { name: "Description", label: "Description", type: "textarea", createable: true, updateable: true },
      { name: "AccountId", label: "Account ID", type: "reference", createable: true, updateable: true, referenceTo: ["Account"] },
    ],
  },
];

export type DemoTable = {
  name: string;
  label: string;
  schema: string;
  fields: SchemaObject["fields"];
  rows: Row[];
};

export const ORACLE_TABLES: DemoTable[] = [
  {
    name: "CUSTOMERS",
    label: "CRM.CUSTOMERS",
    schema: "CRM",
    fields: [
      { name: "CUSTOMER_ID", label: "Customer Id", type: "string" },
      { name: "CUSTOMER_NAME", label: "Customer Name", type: "string" },
      { name: "CUSTOMER_NUMBER", label: "Customer Number", type: "string" },
      { name: "ACCOUNT_TYPE", label: "Account Type", type: "string" },
      { name: "INDUSTRY", label: "Industry", type: "string" },
      { name: "PHONE", label: "Phone", type: "phone" },
      { name: "WEBSITE", label: "Website", type: "url" },
      { name: "STREET", label: "Street", type: "string" },
      { name: "CITY", label: "City", type: "string" },
      { name: "STATE", label: "State", type: "string" },
      { name: "POSTAL_CODE", label: "Postal Code", type: "string" },
      { name: "COUNTRY", label: "Country", type: "string" },
      { name: "ANNUAL_REVENUE", label: "Annual Revenue", type: "currency" },
      { name: "EMPLOYEES", label: "Employees", type: "int" },
      { name: "NOTES", label: "Notes", type: "textarea" },
      { name: "RATING", label: "Rating", type: "string" },
    ],
    rows: [
      {
        CUSTOMER_ID: "CUST-1001", CUSTOMER_NAME: "northwind manufacturing", CUSTOMER_NUMBER: "NW-1001",
        ACCOUNT_TYPE: "CUST", INDUSTRY: "Manufacturing", PHONE: "312-555-0142",
        WEBSITE: "https://northwind.example", STREET: "1200 W Fulton St", CITY: "Chicago",
        STATE: "IL", POSTAL_CODE: "60607", COUNTRY: "US", ANNUAL_REVENUE: 18400000, EMPLOYEES: 420,
        NOTES: "Preferred ERP customer. Renewal Q4.", RATING: "A",
      },
      {
        CUSTOMER_ID: "CUST-1002", CUSTOMER_NAME: "cedar ridge hospitals", CUSTOMER_NUMBER: "CR-1002",
        ACCOUNT_TYPE: "CUST", INDUSTRY: "Healthcare", PHONE: "206-555-0198",
        WEBSITE: "https://cedarridge.example", STREET: "88 Yesler Way", CITY: "Seattle",
        STATE: "WA", POSTAL_CODE: "98104", COUNTRY: "US", ANNUAL_REVENUE: 62000000, EMPLOYEES: 1900,
        NOTES: "HIPAA review required before load.", RATING: "A",
      },
      {
        CUSTOMER_ID: "CUST-1003", CUSTOMER_NAME: "lumen & ash retail", CUSTOMER_NUMBER: "LA-1003",
        ACCOUNT_TYPE: "PROSPECT", INDUSTRY: "Retail", PHONE: "415-555-0110",
        WEBSITE: "www.lumenash.example", STREET: "450 Market St", CITY: "San Francisco",
        STATE: "CA", POSTAL_CODE: "94105", COUNTRY: "US", ANNUAL_REVENUE: 9100000, EMPLOYEES: 160,
        NOTES: "Pilot store in SoMa.", RATING: "B",
      },
      {
        CUSTOMER_ID: "CUST-1004", CUSTOMER_NAME: "helio bank plc", CUSTOMER_NUMBER: "HB-1004",
        ACCOUNT_TYPE: "PARTNER", INDUSTRY: "Finance", PHONE: "+44 20 7946 0958",
        WEBSITE: "https://heliobank.example", STREET: "1 Canada Square", CITY: "London",
        STATE: "", POSTAL_CODE: "E14 5AB", COUNTRY: "UK", ANNUAL_REVENUE: 240000000, EMPLOYEES: 3400,
        NOTES: "Partner for payments rail.", RATING: "A",
      },
      {
        CUSTOMER_ID: "CUST-1005", CUSTOMER_NAME: "  solar kite energy  ", CUSTOMER_NUMBER: "SK-1005",
        ACCOUNT_TYPE: "CUST", INDUSTRY: "Energy", PHONE: "512-555-0177",
        WEBSITE: "https://solarkite.example", STREET: "700 Congress Ave", CITY: "Austin",
        STATE: "TX", POSTAL_CODE: "78701", COUNTRY: "US", ANNUAL_REVENUE: 27500000, EMPLOYEES: 310,
        NOTES: "", RATING: "B",
      },
      {
        CUSTOMER_ID: "CUST-1006", CUSTOMER_NAME: "kana logistics", CUSTOMER_NUMBER: "KL-1006",
        ACCOUNT_TYPE: "CUST", INDUSTRY: "Transportation", PHONE: "404-555-0133",
        WEBSITE: "https://kana.example", STREET: "90 Marietta St", CITY: "Atlanta",
        STATE: "GA", POSTAL_CODE: "30303", COUNTRY: "US", ANNUAL_REVENUE: 14800000, EMPLOYEES: 880,
        NOTES: "Fleet expansion 2026.", RATING: "C",
      },
    ],
  },
  {
    name: "CONTACTS",
    label: "CRM.CONTACTS",
    schema: "CRM",
    fields: [
      { name: "CONTACT_ID", label: "Contact Id", type: "string" },
      { name: "CUSTOMER_ID", label: "Customer Id", type: "string" },
      { name: "FIRST_NAME", label: "First Name", type: "string" },
      { name: "LAST_NAME", label: "Last Name", type: "string" },
      { name: "EMAIL", label: "Email", type: "email" },
      { name: "PHONE", label: "Phone", type: "phone" },
      { name: "TITLE", label: "Title", type: "string" },
      { name: "DEPARTMENT", label: "Department", type: "string" },
      { name: "CITY", label: "City", type: "string" },
      { name: "COUNTRY", label: "Country", type: "string" },
    ],
    rows: [
      {
        CONTACT_ID: "CT-2001", CUSTOMER_ID: "CUST-1001", FIRST_NAME: "priya", LAST_NAME: "raman",
        EMAIL: "priya.raman@northwind.example", PHONE: "312-555-0143", TITLE: "VP Operations",
        DEPARTMENT: "Operations", CITY: "Chicago", COUNTRY: "US",
      },
      {
        CONTACT_ID: "CT-2002", CUSTOMER_ID: "CUST-1002", FIRST_NAME: "marcus", LAST_NAME: "hale",
        EMAIL: "marcus.hale@cedarridge.example", PHONE: "206-555-0199", TITLE: "CIO",
        DEPARTMENT: "IT", CITY: "Seattle", COUNTRY: "US",
      },
      {
        CONTACT_ID: "CT-2003", CUSTOMER_ID: "CUST-1003", FIRST_NAME: "elena", LAST_NAME: "voss",
        EMAIL: "elena.voss@lumenash.example", PHONE: "415-555-0111", TITLE: "Buyer",
        DEPARTMENT: "Merchandising", CITY: "San Francisco", COUNTRY: "US",
      },
      {
        CONTACT_ID: "CT-2004", CUSTOMER_ID: "CUST-1004", FIRST_NAME: "james", LAST_NAME: "okonkwo",
        EMAIL: "james.okonkwo@heliobank.example", PHONE: "+44 20 7946 0959", TITLE: "Head of Partnerships",
        DEPARTMENT: "Strategy", CITY: "London", COUNTRY: "UK",
      },
    ],
  },
  {
    name: "OPPORTUNITIES",
    label: "CRM.OPPORTUNITIES",
    schema: "CRM",
    fields: [
      { name: "OPP_ID", label: "Opportunity Id", type: "string" },
      { name: "CUSTOMER_ID", label: "Customer Id", type: "string" },
      { name: "OPP_NAME", label: "Name", type: "string" },
      { name: "STAGE", label: "Stage", type: "string" },
      { name: "CLOSE_DATE", label: "Close Date", type: "date" },
      { name: "AMOUNT", label: "Amount", type: "currency" },
      { name: "OPP_TYPE", label: "Type", type: "string" },
    ],
    rows: [
      {
        OPP_ID: "OPP-3001", CUSTOMER_ID: "CUST-1001", OPP_NAME: "ERP renewal 2026",
        STAGE: "NEGOTIATION", CLOSE_DATE: "15-OCT-2026", AMOUNT: 480000, OPP_TYPE: "UPGRADE",
      },
      {
        OPP_ID: "OPP-3002", CUSTOMER_ID: "CUST-1003", OPP_NAME: "POS rollout",
        STAGE: "QUALIFY", CLOSE_DATE: "01-DEC-2026", AMOUNT: 125000, OPP_TYPE: "NEW",
      },
      {
        OPP_ID: "OPP-3003", CUSTOMER_ID: "CUST-1005", OPP_NAME: "Grid analytics",
        STAGE: "PROPOSAL", CLOSE_DATE: "2026-09-30", AMOUNT: 210000, OPP_TYPE: "NEW",
      },
    ],
  },
];

export function salesforceObject(name: string) {
  return SALESFORCE_OBJECTS.find((o) => o.name.toLowerCase() === name.toLowerCase()) ?? null;
}

export function oracleTable(name: string) {
  const n = name.replace(/^CRM\./i, "").toUpperCase();
  return ORACLE_TABLES.find((t) => t.name === n) ?? null;
}
