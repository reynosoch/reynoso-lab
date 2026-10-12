import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { addToInbox, createInboxEntry, normalizeInbox, parseGitHubRepository, reviewProgress } from "../lib/inbox.js";

const root = resolve(import.meta.dirname, "..");
const data = JSON.parse(await readFile(resolve(root, "data/experiments.json"), "utf8"));
const allowedStatuses = new Set(["found", "saved", "testing", "works", "adopted", "discarded"]);
const allowedEnvironments = new Set(["pages", "codespaces", "local", "vercel", "railway", "docker", "unknown"]);

test("el catálogo declara una versión y IDs únicos", () => {
  assert.equal(data.schemaVersion, 1);
  assert.ok(data.experiments.length > 0);
  const ids = data.experiments.map(item => item.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("cada experimento cumple el contrato V1", async () => {
  for (const item of data.experiments) {
    for (const key of ["id", "name", "repository", "owner", "repo", "author", "description", "status", "recommendedEnvironment", "createdAt", "notesPath"]) {
      assert.ok(item[key], `${item.id || "entrada"}: falta ${key}`);
    }
    assert.match(item.repository, new RegExp(`^https://github\\.com/${item.owner}/${item.repo}$`, "i"));
    assert.ok(allowedStatuses.has(item.status), `${item.id}: estado inválido`);
    assert.ok(allowedEnvironments.has(item.recommendedEnvironment), `${item.id}: entorno inválido`);
    assert.ok(Array.isArray(item.tags) && item.tags.length > 0, `${item.id}: necesita tags`);
    assert.ok(Array.isArray(item.commands), `${item.id}: commands debe ser una lista`);
    await readFile(resolve(root, item.notesPath), "utf8");
  }
});

test("Whisper se registra sin copiar su repositorio", () => {
  const whisper = data.experiments.find(item => item.id === "openai-whisper");
  assert.ok(whisper);
  assert.equal(whisper.status, "saved");
  assert.equal(whisper.recommendedEnvironment, "codespaces");
  assert.deepEqual(whisper.tags, ["AI", "Audio", "Python", "PyTorch", "Speech-to-text"]);
  assert.equal(whisper.license, "MIT");
});

test("la bandeja valida GitHub y conserva una captura sin duplicarla", () => {
  const parsed = parseGitHubRepository("github.com/vercel/next.js");
  assert.deepEqual(parsed, { owner: "vercel", repo: "next.js", repository: "https://github.com/vercel/next.js" });
  assert.equal(parseGitHubRepository("https://example.com/vercel/next.js"), null);
  assert.equal(parseGitHubRepository("https://github.com/vercel/next.js/issues"), null);
  const entry = createInboxEntry(parsed, "2026-10-11T12:00:00.000Z");
  const first = addToInbox([], entry);
  const duplicate = addToInbox(first.entries, entry);
  assert.equal(first.created, true);
  assert.equal(duplicate.created, false);
  assert.equal(duplicate.entries.length, 1);
  assert.equal(reviewProgress(entry).completed, 0);
});

test("la bandeja normaliza datos locales incompletos", () => {
  const entries = normalizeInbox([{ repository: "https://github.com/openai/whisper", review: { readme: true } }, { repository: "javascript:alert(1)" }]);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].recommendedEnvironment, "codespaces");
  assert.equal(entries[0].review.readme, true);
  assert.equal(reviewProgress(entries[0]).completed, 1);
});
