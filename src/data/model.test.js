// Guards against the exact bug class that broke the app twice: a field
// added to an emptyX() factory without a matching backfill in
// normalizeCampaign(). A record missing that field crashed the whole app
// with no recovery (see the ErrorBoundary/backfill-gaps fix this follows).
//
// Uses Node's built-in test runner (available since Node 18, zero added
// dependencies) rather than a test framework — this is one targeted,
// generic check, not a reason to take on a new dependency.
//
// Run with: node --test

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  emptyNpc,
  emptyLocation,
  emptyQuest,
  emptySession,
  emptyFaction,
  emptyPc,
  emptyItem,
  emptyMonster,
  emptyBattleGrid,
  emptyRelationship,
  emptyClue,
  emptyToken,
  emptyCampaign,
  normalizeCampaign,
} from "./model.js";

const ENTITY_TYPES = [
  { key: "npcs", empty: emptyNpc },
  { key: "locations", empty: emptyLocation },
  { key: "quests", empty: emptyQuest },
  { key: "sessions", empty: emptySession },
  { key: "factions", empty: emptyFaction },
  { key: "pcs", empty: emptyPc },
  { key: "items", empty: emptyItem },
  { key: "monsters", empty: emptyMonster },
  { key: "grids", empty: emptyBattleGrid },
];

/** Every field in `expected` must exist (and not be `undefined`) on `actual`. */
function assertFieldsBackfilled(actual, expected, label) {
  for (const field of Object.keys(expected)) {
    assert.notStrictEqual(actual[field], undefined, `${label} is missing a backfill for "${field}"`);
  }
}

describe("normalizeCampaign backfills every field", () => {
  for (const { key, empty } of ENTITY_TYPES) {
    test(`fills in every emptyX() field for ${key}`, () => {
      // A bare, partial record — only an id, same shape old data from
      // before most of this entity type's fields existed would have.
      const campaign = { ...emptyCampaign("Test"), [key]: [{ id: "bare-id" }] };
      const normalized = normalizeCampaign(campaign);
      assertFieldsBackfilled(normalized[key][0], empty(), key);
    });
  }

  test("fills in every field for a bare NPC relationship", () => {
    const campaign = { ...emptyCampaign("Test"), npcs: [{ id: "n1", relationships: [{ id: "r1" }] }] };
    const normalized = normalizeCampaign(campaign);
    assertFieldsBackfilled(normalized.npcs[0].relationships[0], emptyRelationship(), "npc relationship");
  });

  test("fills in every field for a bare PC relationship", () => {
    const campaign = { ...emptyCampaign("Test"), pcs: [{ id: "p1", relationships: [{ id: "r1" }] }] };
    const normalized = normalizeCampaign(campaign);
    assertFieldsBackfilled(normalized.pcs[0].relationships[0], emptyRelationship(), "pc relationship");
  });

  test("fills in every field for a bare quest clue", () => {
    const campaign = { ...emptyCampaign("Test"), quests: [{ id: "q1", clues: [{ id: "c1" }] }] };
    const normalized = normalizeCampaign(campaign);
    assertFieldsBackfilled(normalized.quests[0].clues[0], emptyClue(), "quest clue");
  });

  test("fills in every field for a bare battle-grid token", () => {
    const campaign = { ...emptyCampaign("Test"), grids: [{ id: "g1", tokens: [{ id: "t1" }] }] };
    const normalized = normalizeCampaign(campaign);
    assertFieldsBackfilled(normalized.grids[0].tokens[0], emptyToken(), "battle-grid token");
  });

  test("fills in the top-level campaign fields", () => {
    const normalized = normalizeCampaign({ npcs: [] }); // missing id/name/createdAt entirely
    assert.ok(normalized.id, "campaign is missing an id");
    assert.ok(normalized.name, "campaign is missing a name");
    assert.ok(normalized.createdAt, "campaign is missing a createdAt");
  });
});
