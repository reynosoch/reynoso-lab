import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

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
