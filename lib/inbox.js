export const INBOX_STORAGE_KEY = "reynoso-lab.inbox.v1";

export const reviewChecks = [
  { id: "readme", label: "Entendí el README y qué hace realmente" },
  { id: "license", label: "Revisé la licencia" },
  { id: "dependencies", label: "Revisé dependencias y requisitos" },
  { id: "scripts", label: "Inspeccioné scripts de instalación y postinstall" },
  { id: "workflows", label: "Revisé workflows, binarios e instaladores" }
];

export function parseGitHubRepository(value) {
  const raw = String(value || "").trim();
  const normalized = /^github\.com\//i.test(raw) ? `https://${raw}` : raw;
  try {
    const url = new URL(normalized);
    if (!["github.com", "www.github.com"].includes(url.hostname.toLowerCase())) return null;
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length !== 2) return null;
    const [owner, repositoryWithSuffix] = segments;
    const repo = repositoryWithSuffix.replace(/\.git$/i, "");
    if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(repo)) return null;
    return { owner, repo, repository: `https://github.com/${owner}/${repo}` };
  } catch {
    return null;
  }
}

export function createInboxEntry(parts, capturedAt = new Date().toISOString()) {
  return {
    id: `${parts.owner}-${parts.repo}`.toLowerCase(),
    name: parts.repo,
    owner: parts.owner,
    repo: parts.repo,
    repository: parts.repository,
    capturedAt,
    recommendedEnvironment: "codespaces",
    decision: "pending",
    review: Object.fromEntries(reviewChecks.map(check => [check.id, false])),
    notes: ""
  };
}

export function normalizeInbox(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(entry => entry && parseGitHubRepository(entry.repository)).map(entry => ({
    ...createInboxEntry(parseGitHubRepository(entry.repository), entry.capturedAt),
    ...entry,
    review: Object.fromEntries(reviewChecks.map(check => [check.id, Boolean(entry.review?.[check.id])]))
  }));
}

export function addToInbox(entries, candidate) {
  if (entries.some(entry => entry.id === candidate.id)) return { entries, created: false };
  return { entries: [candidate, ...entries], created: true };
}

export function reviewProgress(entry) {
  const completed = reviewChecks.filter(check => entry.review?.[check.id]).length;
  return { completed, total: reviewChecks.length, complete: completed === reviewChecks.length };
}
