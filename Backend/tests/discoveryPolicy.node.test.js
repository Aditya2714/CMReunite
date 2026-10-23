const test = require("node:test"), assert = require("node:assert/strict");
const { visible } = require("../src/services/discoveryPolicy");
const cases = require("../../fixtures/discovery-policy.json");
for (const fixture of cases) test(`Shared discovery policy: ${fixture.name}`, () => assert.equal(visible(fixture.viewer, fixture.account, new Set(fixture.connected), fixture.options), fixture.expected));
