import assert from "node:assert/strict";
import test from "node:test";
import { classifyProcurementSection } from "./rules.ts";

test("classifies official procurement notice types", () => {
  assert.equal(classifyProcurementSection({ stage: "Request for Prequalification" }), "prequalification");
  assert.equal(classifyProcurementSection({ procurementType: "Invitation for Bids" }), "tender");
  assert.equal(classifyProcurementSection({ title: "General Procurement Notice" }), "pipeline");
  assert.equal(classifyProcurementSection({ title: "Request for Qualification" }), "prequalification");
});

test("does not invent a category for unknown notices", () => {
  assert.equal(classifyProcurementSection({ title: "Project information" }), null);
});
