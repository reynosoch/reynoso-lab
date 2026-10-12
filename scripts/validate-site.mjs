import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = path => readFile(resolve(root, path), "utf8");
const [html, app, styles, inbox, rawData] = await Promise.all([
  read("index.html"), read("app.js"), read("styles.css"), read("lib/inbox.js"), read("data/experiments.json")
]);
const data = JSON.parse(rawData);
const errors = [];

if (!html.includes("<html lang=\"es\">")) errors.push("Falta declarar el idioma del documento.");
if (!html.includes("<meta name=\"viewport\"")) errors.push("Falta viewport responsive.");
if (!html.includes("<meta name=\"description\"")) errors.push("Falta descripción metadata.");
if (!html.includes("id=\"catalog\"")) errors.push("Falta el destino accesible del catálogo.");
if (!html.includes("<dialog id=\"experiment-dialog\"")) errors.push("Falta el panel de detalle.");
if (!html.includes("id=\"inbox\"")) errors.push("Falta la bandeja local para revisar después.");
if (/\b(?:src|href)=["']\/(?!\/)/.test(html)) errors.push("Hay rutas absolutas incompatibles con /reynoso-lab/.");
if (!app.includes('fetch("./data/experiments.json")')) errors.push("El catálogo no usa una ruta relativa.");
if (!app.includes("codespaces.new")) errors.push("Falta el launcher oficial de Codespaces.");
if (!app.includes("savePendingAnalysis")) errors.push("El análisis no se puede guardar para después.");
if (!inbox.includes("reynoso-lab.inbox.v1")) errors.push("Falta persistencia versionada para la bandeja local.");
if (!styles.includes("@media (max-width: 680px)")) errors.push("Falta layout móvil.");
if (!styles.includes("prefers-reduced-motion")) errors.push("Falta soporte de movimiento reducido.");
if (data.schemaVersion !== 1 || !Array.isArray(data.experiments)) errors.push("Esquema del catálogo inválido.");

if (errors.length) {
  console.error(errors.map(error => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log("Sitio validado: metadata, rutas, launcher, responsive y accesibilidad estructural.");
