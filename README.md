# Reynoso LAB

**[Abrir Reynoso LAB](https://reynosoch.github.io/reynoso-lab/)**

Laboratorio personal para descubrir, inspeccionar, probar y documentar proyectos open source. LAB es un **Experiment Registry + Launcher**: conserva contexto, propone el entorno adecuado y enlaza al lugar donde sí tiene sentido experimentar.

```text
Discover → Inspect → Launch → Experiment → Learn → Keep / Discard / Promote
```

## Qué es

- Un catálogo versionado de repositorios que quiero entender.
- Un registro de decisiones, notas, comandos, problemas y aprendizajes.
- Un launcher hacia GitHub, Codespaces y otros entornos apropiados.
- Un paso intermedio entre “lo encontré” y “lo adopté”.

La captura cotidiana funciona así:

```text
Veo un repo → lo pego → lo analizo → lo guardo en la bandeja local
→ lo reviso después → decido si probarlo → abro el entorno correcto
```

## Qué no es

- No es **Reynoso Toolchain**. Toolchain contiene herramientas ya adoptadas y de uso real.
- No copia dentro del frontend el código de cada repositorio registrado.
- No ejecuta código externo ni despliega experimentos automáticamente.
- No modifica GitHub desde la interfaz: GitHub Pages no tiene backend autenticado.
- No es un portfolio, un monorepo de terceros, una base de datos ni un sistema de login.

## Modelo mental

```text
LAB                                  TOOLCHAIN
Repositorios por explorar            Herramientas adoptadas
Estados cambiantes                   Relativamente estable
Notas y decisiones                   Uso cotidiano
Puede terminar en descarte     →     Puede recibir un experimento promovido
```

Un experimento exitoso puede promoverse a Toolchain, a un proyecto independiente o a un fork permanente. LAB registra esa evolución sin mezclar los repositorios.

## Entornos

| Entorno | Cuándo usarlo |
| --- | --- |
| **GitHub Pages** | HTML, CSS, JavaScript puro y demos WASM que realmente funcionan en navegador. |
| **GitHub Codespaces** | Opción inicial para repos desconocidos, Python, Node, C/C++, Rust, Java, ML, CLI, servidores o instalaciones complejas. |
| **Local** | Trabajo deliberado desde VS Code, terminal, Git, Docker Desktop, Python o Node local. |
| **Docker** | Aislamiento importante o repos con `Dockerfile`, `docker-compose.yml` o `compose.yml`. |
| **Vercel** | Webs compatibles que, después de probarse, conviene desplegar. No es automático. |
| **Railway** | Backends, APIs, contenedores o servicios persistentes que ya demostraron valor. No es automático. |

Los enlaces de Codespaces usan el formato oficial `https://codespaces.new/OWNER/REPO?quickstart=1`. Abrirlos permite crear o reanudar un entorno; LAB no lo crea por su cuenta.

## Seguridad

Todo elemento del catálogo se considera un repositorio externo hasta que se revise. Antes de ejecutar se inspeccionan, cuando existan:

- README y licencia;
- manifiestos como `package.json`, `requirements.txt` y `pyproject.toml`;
- Dockerfiles, Compose y configuraciones de desarrollo;
- scripts de instalación, `postinstall`, workflows, binarios e instaladores.

Nunca se guardan tokens, contraseñas, API keys o secretos en repositorios externos. No se ejecutan tuberías como `curl … | bash`, comandos elevados ni instaladores desconocidos sin revisar su contenido.

## Estructura

```text
index.html, styles.css, app.js    Interfaz estática y launcher
data/experiments.json             Fuente de verdad del catálogo
experiments/<id>/README.md        Notas duraderas por experimento
assets/                           Identidad visual
scripts/                          Validación y build reproducible
tests/                            Contratos del esquema y del sitio
.github/workflows/pages.yml       Verificación y publicación en Pages
```

La aplicación usa rutas relativas para funcionar bajo `/reynoso-lab/`. `localStorage` guarda vista, filtros, favoritos, la última URL escrita y una **bandeja local de capturas pendientes**. Esa bandeja permite volver después, completar una revisión de seguridad, elegir entorno, conservar notas y exportar una ficha. El catálogo oficial siempre vive en Git; guardar localmente nunca finge un cambio en GitHub.

## Registrar un experimento

1. Inspeccionar el repositorio original y confirmar qué hace realmente.
2. Revisar licencia, dependencias, scripts, workflows y riesgos.
3. Elegir un `id` estable y agregar su ficha a `data/experiments.json`.
4. Crear `experiments/<id>/README.md` con contexto, setup, pruebas y conclusión.
5. Asignar `recommendedEnvironment` usando uno de estos valores: `pages`, `codespaces`, `local`, `vercel`, `railway`, `docker`, `unknown`.
6. Ejecutar `npm run check` y `npm run build`.
7. Hacer commit en el repositorio LAB, nunca copiar el repositorio original dentro de este proyecto.

Estados admitidos:

```text
found → saved → testing → works → adopted
                      └──→ discarded
```

Descartar no borra las notas: conserva lo aprendido.

## Esquema V1

Cada entrada incluye identidad, URL original, autor, descripción, etiquetas, lenguajes, tecnologías, estado, fechas, entorno recomendado/usado, dificultad, utilidad, licencia, requisitos, comandos, próximos experimentos, promoción y revisión de seguridad. `schemaVersion` permite evolucionar el formato sin perder trazabilidad.

## Primer experimento

[Whisper](experiments/openai-whisper/README.md) de OpenAI está registrado como **Guardado**, con Codespaces como entorno recomendado. LAB solo contiene su ficha y notas; el código permanece en `openai/whisper`.

No hay entrada de Apple Pay/Wallet porque todavía no se ha proporcionado un repositorio exacto. No se inventarán proyectos.

## Desarrollo y validación

No hay dependencias de producción ni backend.

```sh
npm run check
npm run build
```

`check` valida JavaScript, HTML, rutas relativas, enlaces, accesibilidad estructural y el esquema del catálogo. `build` repite las comprobaciones y genera `dist/`, que es el artefacto publicado por GitHub Pages.

## Importación y exportación

La interfaz exporta el catálogo completo a JSON. La importación se reserva para una siguiente versión: antes de activarla debe validar esquema, detectar IDs duplicados y producir un diff para revisión; no debe sobrescribir silenciosamente la fuente versionada.

## Licencia

La aplicación de LAB se publica bajo [MIT](LICENSE). Cada experimento mantiene su propia licencia en el repositorio original; registrarlo aquí no cambia ni redistribuye esa licencia.
