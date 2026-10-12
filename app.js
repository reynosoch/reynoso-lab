const STORAGE_KEY = "reynoso-lab.preferences.v1";

const statusMeta = {
  found: { label: "Encontrado", symbol: "◌", accent: "#73e6ff" },
  saved: { label: "Guardado", symbol: "⌑", accent: "#a8ff78" },
  testing: { label: "Probando", symbol: "◈", accent: "#ffbd70" },
  works: { label: "Funciona", symbol: "✓", accent: "#68f5c2" },
  adopted: { label: "Adoptado", symbol: "♥", accent: "#ff86bc" },
  discarded: { label: "Descartado", symbol: "×", accent: "#8b93a6" }
};

const environmentMeta = {
  pages: { label: "GitHub Pages", short: "Pages" },
  codespaces: { label: "GitHub Codespaces", short: "Codespaces" },
  local: { label: "Local", short: "Local" },
  vercel: { label: "Vercel", short: "Vercel" },
  railway: { label: "Railway", short: "Railway" },
  docker: { label: "Docker", short: "Docker" },
  unknown: { label: "Por clasificar", short: "Unknown" }
};

const state = {
  catalog: null,
  experiments: [],
  search: "",
  status: "all",
  environment: "all",
  view: "grid",
  favorites: []
};

const elements = {
  grid: document.querySelector("#experiment-grid"),
  empty: document.querySelector("#empty-state"),
  count: document.querySelector("#result-count"),
  search: document.querySelector("#search-input"),
  environment: document.querySelector("#environment-filter"),
  filters: document.querySelector("#status-filters"),
  view: document.querySelector("#view-toggle"),
  exportButton: document.querySelector("#export-button"),
  clear: document.querySelector("#clear-filters"),
  form: document.querySelector("#repo-form"),
  repoUrl: document.querySelector("#repo-url"),
  analysis: document.querySelector("#analysis-result"),
  dialog: document.querySelector("#experiment-dialog"),
  dialogContent: document.querySelector("#dialog-content"),
  dialogClose: document.querySelector("#dialog-close"),
  toast: document.querySelector("#toast")
};

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);
}

function readPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    state.search = typeof saved.search === "string" ? saved.search : "";
    state.status = statusMeta[saved.status] || saved.status === "all" ? saved.status : "all";
    state.environment = environmentMeta[saved.environment] || saved.environment === "all" ? saved.environment : "all";
    state.view = saved.view === "list" ? "list" : "grid";
    state.favorites = Array.isArray(saved.favorites) ? saved.favorites : [];
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function savePreferences() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    search: state.search,
    status: state.status,
    environment: state.environment,
    view: state.view,
    favorites: state.favorites
  }));
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 2300);
}

function repoParts(experiment) {
  return {
    owner: encodeURIComponent(experiment.owner),
    repo: encodeURIComponent(experiment.repo)
  };
}

function launchUrl(experiment) {
  const { owner, repo } = repoParts(experiment);
  if (experiment.recommendedEnvironment === "codespaces") return `https://codespaces.new/${owner}/${repo}?quickstart=1`;
  if (experiment.recommendedEnvironment === "pages") return experiment.demoUrl || experiment.repository;
  return experiment.repository;
}

function searchableText(experiment) {
  return [
    experiment.name,
    experiment.owner,
    experiment.repo,
    experiment.author,
    experiment.description,
    ...experiment.tags,
    ...experiment.languages,
    ...experiment.technologies,
    environmentMeta[experiment.recommendedEnvironment]?.label
  ].join(" ").toLocaleLowerCase("es");
}

function filteredExperiments() {
  const query = state.search.trim().toLocaleLowerCase("es");
  return state.experiments.filter(experiment => {
    const matchesSearch = !query || searchableText(experiment).includes(query);
    const matchesStatus = state.status === "all" || experiment.status === state.status;
    const matchesEnvironment = state.environment === "all" || experiment.recommendedEnvironment === state.environment;
    return matchesSearch && matchesStatus && matchesEnvironment;
  }).sort((a, b) => {
    const favoriteDifference = Number(state.favorites.includes(b.id)) - Number(state.favorites.includes(a.id));
    return favoriteDifference || b.createdAt.localeCompare(a.createdAt);
  });
}

function renderCard(experiment) {
  const status = statusMeta[experiment.status] || statusMeta.found;
  const environment = environmentMeta[experiment.recommendedEnvironment] || environmentMeta.unknown;
  const favorite = state.favorites.includes(experiment.id);
  const tags = experiment.tags.slice(0, 5).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
  return `
    <article class="experiment-card${state.view === "list" ? " is-list" : ""}" style="--accent:${status.accent}" data-id="${escapeHtml(experiment.id)}">
      <div>
        <div class="card-top">
          <span class="repo-icon" aria-hidden="true">${escapeHtml(experiment.name.slice(0, 2).toUpperCase())}</span>
          <button class="favorite" type="button" data-action="favorite" aria-label="${favorite ? "Quitar de favoritos" : "Añadir a favoritos"}" aria-pressed="${favorite}">${favorite ? "★" : "☆"}</button>
        </div>
        <h3>${escapeHtml(experiment.name)}</h3>
        <span class="repo-name">${escapeHtml(experiment.owner)}/${escapeHtml(experiment.repo)}</span>
      </div>
      <div>
        <p class="card-description">${escapeHtml(experiment.description)}</p>
        <div class="tag-row">${tags}</div>
      </div>
      <div>
        <div class="card-meta">
          <div class="meta-item"><small>Estado</small><strong class="status">${status.symbol} ${status.label}</strong></div>
          <div class="meta-item"><small>Entorno</small><strong>${escapeHtml(environment.short)}</strong></div>
        </div>
        <div class="card-actions">
          <a href="${escapeHtml(experiment.repository)}" target="_blank" rel="noreferrer">GitHub ↗</a>
          <button class="detail-button" type="button" data-action="detail">Abrir ficha</button>
        </div>
      </div>
    </article>`;
}

function render() {
  const visible = filteredExperiments();
  elements.grid.classList.toggle("is-list", state.view === "list");
  elements.grid.innerHTML = visible.map(renderCard).join("");
  elements.grid.hidden = visible.length === 0;
  elements.empty.hidden = visible.length !== 0;
  elements.count.textContent = `${visible.length} de ${state.experiments.length} ${state.experiments.length === 1 ? "experimento" : "experimentos"}`;
  elements.view.textContent = state.view === "grid" ? "▤" : "▦";
  elements.view.setAttribute("aria-label", state.view === "grid" ? "Cambiar a vista de lista" : "Cambiar a vista de cuadrícula");
  document.querySelectorAll("[data-status]").forEach(button => {
    const active = button.dataset.status === state.status;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function list(items) {
  return `<ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function openDetail(experiment) {
  const status = statusMeta[experiment.status] || statusMeta.found;
  const environment = environmentMeta[experiment.recommendedEnvironment] || environmentMeta.unknown;
  const { owner, repo } = repoParts(experiment);
  const notesUrl = `https://github.com/reynosoch/reynoso-lab/blob/main/${experiment.notesPath}`;
  elements.dialogContent.innerHTML = `
    <div class="detail-hero" style="--accent:${status.accent}">
      <span class="repo-icon" aria-hidden="true">${escapeHtml(experiment.name.slice(0, 2).toUpperCase())}</span>
      <h2 id="dialog-title">${escapeHtml(experiment.name)}</h2>
      <span class="repo-name">${escapeHtml(experiment.owner)}/${escapeHtml(experiment.repo)}</span>
      <p>${escapeHtml(experiment.description)}</p>
      <div class="tag-row">${experiment.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
    </div>
    <div class="detail-body">
      <div>
        <section class="detail-section"><h3>Por qué lo guardé</h3><p>${escapeHtml(experiment.why)}</p></section>
        <section class="detail-section"><h3>Requisitos principales</h3>${list(experiment.requirements)}</section>
        <section class="detail-section"><h3>Cómo probarlo</h3><p>Comandos tomados del README oficial. Revísalos antes de ejecutarlos.</p><div class="command-list">${experiment.commands.map(command => `<div class="command"><code>${escapeHtml(command)}</code><button type="button" data-copy="${escapeHtml(command)}" aria-label="Copiar comando">⧉</button></div>`).join("")}</div></section>
        <section class="detail-section"><h3>Qué quiero experimentar después</h3>${list(experiment.nextExperiments)}</section>
        <section class="detail-section"><h3>Seguridad</h3>${list(experiment.security.warnings)}</section>
      </div>
      <aside class="detail-facts" aria-label="Datos del experimento">
        <div class="fact"><small>Estado</small><strong style="color:${status.accent}">${status.symbol} ${status.label}</strong></div>
        <div class="fact"><small>Entorno recomendado</small><strong>${escapeHtml(environment.label)}</strong></div>
        <div class="fact"><small>Dificultad</small><strong>${experiment.difficulty === "intermediate" ? "Intermedia" : escapeHtml(experiment.difficulty)}</strong></div>
        <div class="fact"><small>Licencia original</small><strong>${escapeHtml(experiment.license)}</strong></div>
        <div class="fact"><small>Encontrado</small><strong>${new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(`${experiment.createdAt}T12:00:00`))}</strong></div>
        <div class="fact"><small>Revisado</small><strong>${escapeHtml(experiment.security.reviewed.join(", "))}</strong></div>
        <div class="detail-actions">
          <a class="button primary" href="${launchUrl(experiment)}" target="_blank" rel="noreferrer">Abrir ${escapeHtml(environment.short)} ↗</a>
          <a class="button secondary" href="${escapeHtml(experiment.repository)}" target="_blank" rel="noreferrer">Repositorio original</a>
          <a class="button secondary" href="https://github.com/${owner}/${repo}/fork" target="_blank" rel="noreferrer">Crear fork</a>
          <a class="button secondary" href="${notesUrl}" target="_blank" rel="noreferrer">Notas versionadas</a>
        </div>
      </aside>
    </div>`;
  elements.dialog.showModal();
}

async function copyText(text, confirmation = "Copiado") {
  try {
    await navigator.clipboard.writeText(text);
    showToast(confirmation);
  } catch {
    showToast("No se pudo copiar automáticamente");
  }
}

function parseGitHubRepository(value) {
  const raw = value.trim();
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

function renderPreliminaryAnalysis(parts) {
  elements.analysis.hidden = false;
  elements.analysis.classList.remove("is-error");
  elements.analysis.replaceChildren();
  const title = document.createElement("strong");
  title.textContent = `${parts.owner}/${parts.repo}`;
  const description = document.createElement("p");
  description.textContent = "Ficha preliminar lista. Al ser un repo desconocido, el entorno inicial recomendado es Codespaces; falta inspeccionar README, licencia, dependencias y scripts.";
  const links = document.createElement("div");
  links.className = "analysis-links";
  const github = document.createElement("a");
  github.href = parts.repository;
  github.target = "_blank";
  github.rel = "noreferrer";
  github.textContent = "Abrir GitHub ↗";
  const codespaces = document.createElement("a");
  codespaces.href = `https://codespaces.new/${encodeURIComponent(parts.owner)}/${encodeURIComponent(parts.repo)}?quickstart=1`;
  codespaces.target = "_blank";
  codespaces.rel = "noreferrer";
  codespaces.textContent = "Preparar Codespaces ↗";
  const clone = document.createElement("button");
  clone.type = "button";
  clone.textContent = "Copiar clone";
  clone.addEventListener("click", () => copyText(`git clone ${parts.repository}.git`, "Comando de clone copiado"));
  links.append(github, codespaces, clone);
  elements.analysis.append(title, description, links);
}

function renderAnalysisError() {
  elements.analysis.hidden = false;
  elements.analysis.classList.add("is-error");
  elements.analysis.innerHTML = "<strong>URL no válida</strong><p>Usa el formato https://github.com/owner/repository sin rutas adicionales.</p>";
}

function exportCatalog() {
  const blob = new Blob([`${JSON.stringify(state.catalog, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `reynoso-lab-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("Catálogo exportado");
}

function resetFilters() {
  state.search = "";
  state.status = "all";
  state.environment = "all";
  elements.search.value = "";
  elements.environment.value = "all";
  savePreferences();
  render();
}

function bindEvents() {
  elements.search.addEventListener("input", event => {
    state.search = event.target.value;
    savePreferences();
    render();
  });
  elements.environment.addEventListener("change", event => {
    state.environment = event.target.value;
    savePreferences();
    render();
  });
  elements.filters.addEventListener("click", event => {
    const button = event.target.closest("[data-status]");
    if (!button) return;
    state.status = button.dataset.status;
    savePreferences();
    render();
  });
  elements.view.addEventListener("click", () => {
    state.view = state.view === "grid" ? "list" : "grid";
    savePreferences();
    render();
  });
  elements.grid.addEventListener("click", event => {
    const card = event.target.closest("[data-id]");
    const action = event.target.closest("[data-action]");
    if (!card || !action) return;
    const experiment = state.experiments.find(item => item.id === card.dataset.id);
    if (!experiment) return;
    if (action.dataset.action === "detail") openDetail(experiment);
    if (action.dataset.action === "favorite") {
      state.favorites = state.favorites.includes(experiment.id) ? state.favorites.filter(id => id !== experiment.id) : [...state.favorites, experiment.id];
      savePreferences();
      render();
    }
  });
  elements.form.addEventListener("submit", event => {
    event.preventDefault();
    const parsed = parseGitHubRepository(elements.repoUrl.value);
    if (!parsed) renderAnalysisError();
    else {
      localStorage.setItem("reynoso-lab.last-repository", parsed.repository);
      renderPreliminaryAnalysis(parsed);
    }
  });
  elements.exportButton.addEventListener("click", exportCatalog);
  elements.clear.addEventListener("click", resetFilters);
  elements.dialogClose.addEventListener("click", () => elements.dialog.close());
  elements.dialog.addEventListener("click", event => {
    if (event.target === elements.dialog) elements.dialog.close();
    const copyButton = event.target.closest("[data-copy]");
    if (copyButton) copyText(copyButton.dataset.copy, "Comando copiado");
  });
}

async function initialize() {
  readPreferences();
  elements.search.value = state.search;
  elements.environment.value = state.environment;
  const lastRepository = localStorage.getItem("reynoso-lab.last-repository");
  if (lastRepository) elements.repoUrl.value = lastRepository;
  bindEvents();
  try {
    const response = await fetch("./data/experiments.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.catalog = await response.json();
    state.experiments = state.catalog.experiments;
    render();
  } catch (error) {
    console.error("No fue posible cargar el catálogo", error);
    elements.count.textContent = "Catálogo no disponible";
    elements.empty.hidden = false;
    elements.empty.querySelector("h3").textContent = "No se pudo cargar el catálogo";
    elements.empty.querySelector("p").textContent = "Recarga la página o revisa la ruta de data/experiments.json.";
    elements.empty.querySelector("button").hidden = true;
  }
}

initialize();
