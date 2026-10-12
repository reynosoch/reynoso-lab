# Whisper

Repositorio original: [openai/whisper](https://github.com/openai/whisper)  
Estado en LAB: **Guardado**  
Entorno recomendado: **GitHub Codespaces**  
Licencia original: **MIT**

> ⚠️ Repositorio externo. Revisa el código, dependencias y scripts antes de ejecutarlo. No añadas secretos al repositorio ni al entorno.

## Qué es

Whisper es un sistema de reconocimiento de voz de propósito general. Puede realizar reconocimiento multilingüe, traducción de voz a inglés e identificación de idioma. Su implementación principal usa Python y PyTorch y procesa audio con ayuda de FFmpeg.

## Por qué lo guardé

Quiero evaluar si sirve para juntas largas y notas de voz, comparar calidad y velocidad entre tamaños de modelo y entender qué combinación funciona mejor en español, con ruido y con varios interlocutores.

## Inspección inicial

Revisado el 11 de octubre de 2026:

- `README.md`: instalación, modelos y ejemplos oficiales.
- `LICENSE`: código y pesos publicados con licencia MIT.
- `pyproject.toml`: paquete `openai-whisper`, Python 3.8 o posterior y dependencias como PyTorch, tiktoken, NumPy y Numba.
- `requirements.txt`: lista de dependencias Python.
- `.github/workflows/`: automatización del proyecto original; no se ejecuta desde LAB.

No se ha ejecutado Whisper durante este registro. “Guardado” no significa “probado”.

## Requisitos principales

- Python compatible con la versión actual del paquete.
- PyTorch y las dependencias declaradas por el proyecto.
- FFmpeg disponible en el sistema.
- Red para la instalación inicial y descarga de modelos.
- Memoria, almacenamiento y tiempo de cómputo acordes al modelo.
- Rust solo puede ser necesario si `tiktoken` no tiene un wheel precompilado para el entorno.

## Setup oficial para revisar

Clonar el repositorio, si se quiere inspeccionar o modificar el código:

```bash
git clone https://github.com/openai/whisper.git
cd whisper
```

Instalar la versión publicada del paquete:

```bash
pip install -U openai-whisper
```

Prueba mínima documentada por el proyecto, usando un archivo propio:

```bash
whisper audio.mp3 --model turbo
```

Whisper requiere FFmpeg. El comando concreto para instalarlo depende del sistema operativo; antes de ejecutarlo conviene revisar la sección **Setup** del [README oficial](https://github.com/openai/whisper/blob/main/README.md).

## Por qué Codespaces

El proyecto necesita Python, PyTorch, FFmpeg, descarga de modelos y bastante cómputo. Un Codespace permite inspeccionarlo y probarlo en un entorno separado sin llenar la instalación local. El enlace de LAB abre la pantalla oficial de GitHub para crear o reanudar el entorno; no instala ni ejecuta nada automáticamente.

[Abrir o reanudar en GitHub Codespaces](https://codespaces.new/openai/whisper?quickstart=1)

## Plan de prueba

1. Confirmar la versión de Python y el espacio disponible.
2. Inspeccionar los comandos y dependencias antes de instalar.
3. Instalar FFmpeg mediante el método adecuado para el entorno.
4. Probar `turbo` con un clip corto propio, sin datos sensibles.
5. Comparar `turbo`, `small` y `medium` con una junta real autorizada.
6. Registrar duración, RAM, hardware y calidad percibida.
7. Probar español, ruido de fondo y varios interlocutores.
8. Decidir si conviene integrarlo, crear un proyecto separado o descartarlo.

## Resultado

Pendiente. No se ha probado todavía.

## Problemas encontrados

Pendiente.

## Cambios realizados

Ninguno. LAB no contiene una copia ni un fork de Whisper.

## Qué aprendí

- La instalación de Python no incluye FFmpeg; es un requisito externo.
- `turbo` está optimizado para transcripción y no es el modelo indicado para traducir audio no inglés a inglés.
- El tamaño de modelo cambia el equilibrio entre velocidad, memoria y calidad.

## Próximas ideas

- Comparar su salida con la herramienta Transcribe de Reynoso Toolchain.
- Medir CPU frente a GPU.
- Explorar timestamps y salida SRT.
- Documentar un flujo reproducible solo si las pruebas aportan valor real.

## Conclusión

Pendiente de prueba. Permanece en estado **Guardado**.
