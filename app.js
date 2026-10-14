import { INBOX_STORAGE_KEY, addToInbox, createInboxEntry, normalizeInbox, parseGitHubRepository, reviewChecks, reviewProgress } from "./lib/inbox.js";

const STORAGE_KEY = "reynoso-lab.preferences.v1";

const statusMeta = {
  found: { label: "Encontrado", icon: "search", accent: "#73e6ff" },
  saved: { label: "Guardado", icon: "bookmark", accent: "#a8ff78" },
  testing: { label: "Probando", icon: "flask-conical", accent: "#ffbd70" },
  works: { label: "Funciona", icon: "badge-check", accent: "#68f5c2" },
  adopted: { label: "Adoptado", icon: "package-check", accent: "#ff86bc" },
  discarded: { label: "Descartado", icon: "ban", accent: "#8b93a6" }
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
  favorites: [],
  inbox: [],
  pendingAnalysis: null
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
  inboxList: document.querySelector("#inbox-list"),
  inboxEmpty: document.querySelector("#inbox-empty"),
  inboxCount: document.querySelector("#inbox-count"),
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

function icon(name, className = "icon") {
  return `<svg class="${className}" aria-hidden="true"><use href="#icon-${name}"></use></svg>`;
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
    try{localStorage.removeItem(STORAGE_KEY);}catch{}
  }
}

function savePreferences() {
  try{localStorage.setItem(STORAGE_KEY, JSON.stringify({
    search: state.search,
    status: state.status,
    environment: state.environment,
    view: state.view,
    favorites: state.favorites
  }));}catch{}
}

function readInbox() {
  try {
    state.inbox = normalizeInbox(JSON.parse(localStorage.getItem(INBOX_STORAGE_KEY) || "[]"));
  } catch {
    try{localStorage.removeItem(INBOX_STORAGE_KEY);}catch{}
    state.inbox = [];
  }
}

function saveInbox() {
  try{localStorage.setItem(INBOX_STORAGE_KEY, JSON.stringify(state.inbox));return true;}catch{showToast("No se pudo guardar. Exporte la ficha antes de cerrar esta sesión.");return false;}
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

function launchLabel(experiment) {
  if (experiment.recommendedEnvironment === "codespaces") return "Abrir Codespaces";
  if (experiment.recommendedEnvironment === "pages" && experiment.demoUrl) return "Abrir Pages";
  return "Abrir repositorio";
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
  const tags = experiment.tags.filter(tag=>!/^AI$|^IA$/i.test(tag)).slice(0, 5).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
  return `
    <article class="experiment-card${state.view === "list" ? " is-list" : ""}" style="--accent:${status.accent}" data-id="${escapeHtml(experiment.id)}">
      <div>
        <div class="card-top">
          <span class="repo-icon" aria-hidden="true">${escapeHtml(experiment.name.slice(0, 2).toUpperCase())}</span>
          <button class="favorite" type="button" data-action="favorite" aria-label="${favorite ? "Quitar de favoritos" : "Añadir a favoritos"}" aria-pressed="${favorite}">${icon("star", "icon favorite-icon")}</button>
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
          <div class="meta-item"><small>Estado</small><strong class="status">${icon(status.icon, "icon status-icon")} ${status.label}</strong></div>
          <div class="meta-item"><small>Entorno</small><strong>${escapeHtml(environment.short)}</strong></div>
        </div>
        <div class="card-actions">
          <a href="${escapeHtml(experiment.repository)}" target="_blank" rel="noreferrer">GitHub ${icon("external-link")}</a>
          <button class="detail-button" type="button" data-action="detail">Abrir ficha</button>
        </div>
      </div>
    </article>`;
}

function inboxState(entry) {
  const progress = reviewProgress(entry);
  if (entry.decision === "discarded") return { label: "Descartado, aprendizaje guardado", accent: "#8b93a6" };
  if (entry.decision === "try") return { label: "Listo para probar", accent: "#a8ff78" };
  if (progress.complete) return { label: "Revisión completa", accent: "#73e6ff" };
  if (progress.completed) return { label: `Revisando · ${progress.completed}/${progress.total}`, accent: "#ffbd70" };
  return { label: "Sin revisar", accent: "#9b7bff" };
}

function renderInboxItem(entry) {
  const review = inboxState(entry);
  return `
    <article class="inbox-item" data-inbox-id="${escapeHtml(entry.id)}" style="--accent:${review.accent}">
      <span class="repo-icon" aria-hidden="true">${escapeHtml(entry.repo.slice(0, 2).toUpperCase())}</span>
      <div class="inbox-copy"><strong>${escapeHtml(entry.repo)}</strong><small>${escapeHtml(entry.owner)}/${escapeHtml(entry.repo)}</small></div>
      <div class="inbox-state"><small>${escapeHtml(environmentMeta[entry.recommendedEnvironment]?.short || "Por clasificar")}</small><strong>${escapeHtml(review.label)}</strong></div>
      <div class="inbox-actions"><a href="${escapeHtml(entry.repository)}" target="_blank" rel="noreferrer">GitHub ${icon("external-link")}</a><button class="review-button" type="button" data-inbox-action="review">Revisar</button></div>
    </article>`;
}

function renderInbox() {
  elements.inboxList.innerHTML = state.inbox.map(renderInboxItem).join("");
  elements.inboxEmpty.hidden = state.inbox.length !== 0;
  elements.inboxList.hidden = state.inbox.length === 0;
  elements.inboxCount.textContent = `${state.inbox.length} ${state.inbox.length === 1 ? "repo" : "repos"} · solo en este dispositivo`;
}

function render() {
  const visible = filteredExperiments();
  elements.grid.classList.toggle("is-list", state.view === "list");
  elements.grid.innerHTML = visible.map(renderCard).join("");
  elements.grid.hidden = visible.length === 0;
  elements.empty.hidden = visible.length !== 0;
  elements.count.textContent = `${visible.length} de ${state.experiments.length} ${state.experiments.length === 1 ? "experimento" : "experimentos"}`;
  elements.view.innerHTML = state.view === "grid" ? icon("rows-3") : icon("layout-grid");
  elements.view.setAttribute("aria-label", state.view === "grid" ? "Cambiar a vista de lista" : "Cambiar a vista de cuadrícula");
  document.querySelectorAll("[data-status]").forEach(button => {
    const active = button.dataset.status === state.status;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  renderInbox();
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
      <div class="tag-row">${experiment.tags.filter(tag=>!/^AI$|^IA$/i.test(tag)).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
    </div>
    <div class="detail-body">
      <div>
        <section class="detail-section"><h3>Por qué lo guardé</h3><p>${escapeHtml(experiment.why)}</p></section>
        <section class="detail-section"><h3>Requisitos principales</h3>${list(experiment.requirements)}</section>
        <section class="detail-section"><h3>Cómo probarlo</h3><p>Comandos tomados del README oficial. Revísalos antes de ejecutarlos.</p><div class="command-list">${experiment.commands.map(command => `<div class="command"><code>${escapeHtml(command)}</code><button type="button" data-copy="${escapeHtml(command)}" aria-label="Copiar comando">${icon("copy")}</button></div>`).join("")}</div></section>
        <section class="detail-section"><h3>Qué quiero experimentar después</h3>${list(experiment.nextExperiments)}</section>
        <section class="detail-section"><h3>Seguridad</h3>${list(experiment.security.warnings)}</section>
      </div>
      <aside class="detail-facts" aria-label="Datos del experimento">
        <div class="fact"><small>Estado</small><strong class="status" style="color:${status.accent}">${icon(status.icon, "icon status-icon")} ${status.label}</strong></div>
        <div class="fact"><small>Entorno recomendado</small><strong>${escapeHtml(environment.label)}</strong></div>
        <div class="fact"><small>Dificultad</small><strong>${experiment.difficulty === "intermediate" ? "Intermedia" : escapeHtml(experiment.difficulty)}</strong></div>
        <div class="fact"><small>Licencia original</small><strong>${escapeHtml(experiment.license)}</strong></div>
        <div class="fact"><small>Encontrado</small><strong>${new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(`${experiment.createdAt}T12:00:00`))}</strong></div>
        <div class="fact"><small>Revisado</small><strong>${escapeHtml(experiment.security.reviewed.join(", "))}</strong></div>
        <div class="detail-actions">
          <a class="button primary" href="${launchUrl(experiment)}" target="_blank" rel="noreferrer">${escapeHtml(launchLabel(experiment))} ${icon("external-link")}</a>
          <a class="button secondary" href="${escapeHtml(experiment.repository)}" target="_blank" rel="noreferrer">Repositorio original</a>
          <a class="button secondary" href="https://github.com/${owner}/${repo}/fork" target="_blank" rel="noreferrer">Crear fork</a>
          <a class="button secondary" href="${notesUrl}" target="_blank" rel="noreferrer">Notas versionadas</a>
        </div>
      </aside>
    </div>`;
  if (!elements.dialog.open) elements.dialog.showModal();
}

function openInboxDetail(entry) {
  const progress = reviewProgress(entry);
  const reviewState = inboxState(entry);
  const environmentOptions = Object.entries(environmentMeta).map(([value, meta]) => `<option value="${value}"${entry.recommendedEnvironment === value ? " selected" : ""}>${escapeHtml(meta.label)}</option>`).join("");
  const checklist = reviewChecks.map(check => `<label class="review-check"><input type="checkbox" data-review-check="${check.id}"${entry.review[check.id] ? " checked" : ""}><span>${escapeHtml(check.label)}</span></label>`).join("");
  elements.dialogContent.innerHTML = `
    <div class="detail-hero" style="--accent:${reviewState.accent}">
      <span class="repo-icon" aria-hidden="true">${escapeHtml(entry.repo.slice(0, 2).toUpperCase())}</span>
      <h2 id="dialog-title">${escapeHtml(entry.repo)}</h2>
      <span class="repo-name">${escapeHtml(entry.owner)}/${escapeHtml(entry.repo)}</span>
      <p>Captura local pendiente de inspección. Completa la revisión, elige el entorno y decide si vale la pena probarlo.</p>
      <div class="tag-row"><span class="tag">BANDEJA LOCAL</span><span class="tag">${progress.completed}/${progress.total} REVISADO</span></div>
    </div>
    <div class="detail-body" data-draft-id="${escapeHtml(entry.id)}">
      <div>
        <section class="detail-section"><h3>Checklist antes de ejecutar</h3><div class="review-checklist">${checklist}</div></section>
        <section class="detail-section draft-controls"><h3>Notas de revisión</h3><label for="draft-notes">Qué hace, riesgos, requisitos o dudas</label><textarea id="draft-notes" data-draft-notes placeholder="Todavía no he revisado este repositorio…">${escapeHtml(entry.notes)}</textarea></section>
      </div>
      <aside class="detail-facts" aria-label="Decisión y entorno">
        <div class="fact"><small>Estado local</small><strong style="color:${reviewState.accent}">${escapeHtml(reviewState.label)}</strong></div>
        <div class="fact"><small>Guardado</small><strong>${new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(entry.capturedAt))}</strong></div>
        <div class="draft-controls">
          <label for="draft-environment">Entorno recomendado</label>
          <select id="draft-environment" data-draft-environment>${environmentOptions}</select>
          <label for="draft-decision">Decisión</label>
          <select id="draft-decision" data-draft-decision>
            <option value="pending"${entry.decision === "pending" ? " selected" : ""}>Decidir después</option>
            <option value="try"${entry.decision === "try" ? " selected" : ""}>Quiero probarlo</option>
            <option value="discarded"${entry.decision === "discarded" ? " selected" : ""}>Descartado</option>
          </select>
        </div>
        <div class="detail-actions">
          <a class="button primary" href="${launchUrl(entry)}" target="_blank" rel="noreferrer" data-launch-draft>${escapeHtml(launchLabel(entry))} ${icon("external-link")}</a>
          <button class="button secondary" type="button" data-export-draft>Exportar ficha JSON</button>
          <button class="button secondary" type="button" data-copy="git clone ${escapeHtml(entry.repository)}.git">Copiar comando</button>
          <button class="button secondary danger-button" type="button" data-remove-draft>Quitar de la bandeja</button>
        </div>
      </aside>
    </div>`;
  if (!elements.dialog.open) elements.dialog.showModal();
}

async function copyText(text, confirmation = "Copiado") {
  try {
    await navigator.clipboard.writeText(text);
    showToast(confirmation);
  } catch {
    showToast("No se pudo copiar automáticamente");
  }
}

function renderPreliminaryAnalysis(parts) {
  state.pendingAnalysis = parts;
  elements.analysis.hidden = false;
  elements.analysis.classList.remove("is-error");
  elements.analysis.replaceChildren();
  const title = document.createElement("strong");
  title.textContent = `${parts.owner}/${parts.repo}`;
  const description = document.createElement("p");
  description.textContent = "Ficha preliminar preparada. Revise README, licencia, dependencias y scripts antes de elegir el entorno de prueba.";
  const links = document.createElement("div");
  links.className = "analysis-links";
  const github = document.createElement("a");
  github.href = parts.repository;
  github.target = "_blank";
  github.rel = "noreferrer";
  github.innerHTML = `Abrir GitHub ${icon("external-link")}`;
  const codespaces = document.createElement("a");
  codespaces.href = `https://codespaces.new/${encodeURIComponent(parts.owner)}/${encodeURIComponent(parts.repo)}?quickstart=1`;
  codespaces.target = "_blank";
  codespaces.rel = "noreferrer";
  codespaces.innerHTML = `Preparar Codespaces ${icon("external-link")}`;
  const clone = document.createElement("button");
  clone.type = "button";
  clone.textContent = "Copiar comando";
  clone.addEventListener("click", () => copyText(`git clone ${parts.repository}.git`, "Comando de clone copiado"));
  const save = document.createElement("button");
  save.type = "button";
  save.className = "save-button";
  save.dataset.saveAnalysis = "";
  const alreadySaved = state.inbox.some(entry => entry.repository.toLowerCase() === parts.repository.toLowerCase());
  const official = state.experiments.some(entry => entry.repository.toLowerCase() === parts.repository.toLowerCase());
  save.textContent = official ? "Ya es oficial" : alreadySaved ? "Ya está guardado" : "Guardar para revisar";
  save.disabled = official || alreadySaved;
  links.append(save, github, codespaces, clone);
  elements.analysis.append(title, description, links);
}

function renderAnalysisError() {
  elements.analysis.hidden = false;
  elements.analysis.classList.add("is-error");
  elements.analysis.innerHTML = "<strong>URL no válida</strong><p>Usa el formato https://github.com/owner/repository sin rutas adicionales.</p>";
}

function downloadJson(value, filename) {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportCatalog() {
  downloadJson(state.catalog, `reynoso-lab-${new Date().toISOString().slice(0, 10)}.json`);
  showToast("Catálogo exportado");
}

function savePendingAnalysis() {
  if (!state.pendingAnalysis) return;
  const result = addToInbox(state.inbox, createInboxEntry(state.pendingAnalysis));
  state.inbox = result.entries;
  const persisted=saveInbox();
  renderInbox();
  renderPreliminaryAnalysis(state.pendingAnalysis);
  showToast(!persisted?"Ficha disponible solo en esta sesión. Exporte antes de cerrar.":result.created ? "Guardado para revisar después" : "Este repositorio ya está en la bandeja");
  if (result.created) document.querySelector("#inbox").scrollIntoView({ behavior: "smooth", block: "start" });
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
  elements.analysis.addEventListener("click", event => {
    if (event.target.closest("[data-save-analysis]")) savePendingAnalysis();
  });
  elements.inboxList.addEventListener("click", event => {
    const item = event.target.closest("[data-inbox-id]");
    if (!item || !event.target.closest("[data-inbox-action='review']")) return;
    const entry = state.inbox.find(candidate => candidate.id === item.dataset.inboxId);
    if (entry) openInboxDetail(entry);
  });
  elements.form.addEventListener("submit", event => {
    event.preventDefault();
    const parsed = parseGitHubRepository(elements.repoUrl.value);
    elements.repoUrl.setAttribute("aria-invalid",String(!parsed));
    if (!parsed) {renderAnalysisError();elements.repoUrl.focus();}
    else {
      try{localStorage.setItem("reynoso-lab.last-repository", parsed.repository);}catch{}
      renderPreliminaryAnalysis(parsed);
    }
  });
  elements.exportButton.addEventListener("click", exportCatalog);
  elements.clear.addEventListener("click", resetFilters);
  document.querySelector("#reset-catalog").addEventListener("click",resetFilters);
  document.addEventListener("keydown",event=>{if(event.key==="/"&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!document.querySelector("dialog[open]")&&!event.target.closest("input,textarea,select,[contenteditable=true]")){event.preventDefault();elements.search.scrollIntoView({block:"center"});elements.search.focus();}if(event.key==="Escape"&&event.target===elements.search)resetFilters();});
  elements.dialogClose.addEventListener("click", () => elements.dialog.close());
  elements.dialog.addEventListener("click", event => {
    if (event.target === elements.dialog) elements.dialog.close();
    const copyButton = event.target.closest("[data-copy]");
    if (copyButton) copyText(copyButton.dataset.copy, "Comando copiado");
    const draftRoot = event.target.closest("[data-draft-id]") || elements.dialog.querySelector("[data-draft-id]");
    const entry = draftRoot ? state.inbox.find(candidate => candidate.id === draftRoot.dataset.draftId) : null;
    if (!entry) return;
    if (event.target.closest("[data-export-draft]")) {
      downloadJson({ schemaVersion: 1, source: "local-inbox", experiment: entry }, `${entry.id}.json`);
      showToast("Ficha local exportada");
    }
    if (event.target.closest("[data-launch-draft]")) {
      entry.decision = "try";
      entry.launchedAt = new Date().toISOString();
      saveInbox();
      renderInbox();
    }
    if (event.target.closest("[data-remove-draft]")) {
      state.inbox = state.inbox.filter(candidate => candidate.id !== entry.id);
      saveInbox();
      renderInbox();
      elements.dialog.close();
      showToast("Quitado de la bandeja local");
    }
  });
  elements.dialog.addEventListener("change", event => {
    const draftRoot = event.target.closest("[data-draft-id]") || elements.dialog.querySelector("[data-draft-id]");
    const entry = draftRoot ? state.inbox.find(candidate => candidate.id === draftRoot.dataset.draftId) : null;
    if (!entry) return;
    if (event.target.matches("[data-review-check]")) entry.review[event.target.dataset.reviewCheck] = event.target.checked;
    if (event.target.matches("[data-draft-environment]")) entry.recommendedEnvironment = event.target.value;
    if (event.target.matches("[data-draft-decision]")) entry.decision = event.target.value;
    saveInbox();
    renderInbox();
    openInboxDetail(entry);
  });
  elements.dialog.addEventListener("input", event => {
    if (!event.target.matches("[data-draft-notes]")) return;
    const draftRoot = elements.dialog.querySelector("[data-draft-id]");
    const entry = draftRoot ? state.inbox.find(candidate => candidate.id === draftRoot.dataset.draftId) : null;
    if (!entry) return;
    entry.notes = event.target.value;
    saveInbox();
  });
}

async function initialize() {
  readPreferences();
  readInbox();
  elements.search.value = state.search;
  elements.environment.value = state.environment;
  let lastRepository;try{lastRepository=localStorage.getItem("reynoso-lab.last-repository");}catch{}
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
