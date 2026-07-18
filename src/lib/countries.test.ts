import assert from "node:assert/strict";
import test from "node:test";
import { canAppearInProjectLists, resolveCountry, UNKNOWN_COUNTRY } from "./countries.ts";

test("blocks every supported China spelling and Chinese location", () => {
  for (const value of ["China", "CN", "CHN", "中国", "People's Republic of China", "Heilongjiang road project", "黑龙江省公路项目"]) {
    assert.equal(resolveCountry(value).isChina, true, value);
    assert.equal(canAppearInProjectLists(value), false, `${value} must be absent from pending and official lists`);
  }
});

test("uses structured official country before title inference", () => {
  assert.deepEqual(resolveCountry("AR", "Mexico road"), { country: "阿根廷", recognized: true, isChina: false, evidence: "structured" });
  assert.equal(resolveCountry("MX").country, "墨西哥");
  assert.equal(resolveCountry("Turkey").country, "土耳其");
});

test("unknown country has the only permitted label and cannot be official", () => {
  const result = resolveCountry(undefined, "Regional water works");
  assert.equal(result.country, UNKNOWN_COUNTRY);
  assert.notEqual(result.country, "待人工核实");
  assert.equal(result.recognized, false);
});
