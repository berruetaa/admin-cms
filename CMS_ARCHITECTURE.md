# 1. Propósito del CMS

El CMS (Content Management System) es una herramienta de administración interna diseñada para gestionar el contenido de un sitio web estático (`berrueta-site`) y un blog (`blog-2`).

Gestiona los siguientes dominios principales:
- **Académico**: Administración de asignaturas, categorías y recursos educativos (PDFs, enlaces, textos) para la sección académica del sitio.
- **Herramientas**: Gestión de una lista de utilidades y aplicaciones web (herramientas).
- **Juegos**: Mantenimiento de un catálogo de minijuegos estáticos.
- **Blog**: Creación, edición y publicación de artículos en formato Markdown con frontmatter.
- **Homepage**: Configuración del hero, llamadas a la acción (CTAs) y secciones de la página de inicio.
- **Archivos**: Un gestor de archivos genérico para subir imágenes y otros documentos al repositorio destino.
- **Audio**: Gestión específica de archivos MIDI y configuraciones de audio para una sección del sitio.

El CMS resuelve el problema de tener que editar archivos JSON o Markdown manualmente y realizar commits directos en los repositorios para actualizar el contenido. Proporciona una interfaz gráfica de usuario (GUI) amigable para que el administrador pueda realizar estas operaciones de forma segura y estructurada, delegando la persistencia a la API de GitHub y Gists.

# 2. Arquitectura interna

La arquitectura del CMS está basada en Vanilla JavaScript (sin frameworks como React o Vue), estructurada en módulos y componentes web, utilizando el concepto de Single Page Application (SPA) con un enrutador propio.

## Estructura de carpetas

- `/`: Archivos principales (`index.html`, `app.js`, `package.json`, configuraciones y documentación).
- `/components/`: Componentes UI reutilizables (ej. `navbar.js`, `modal.js`, `form.js`, vistas de módulos genéricas como `blog.js`, `academico.js` que se conectan con los módulos de lógica).
- `/config/`: Configuraciones de la aplicación (ej. `repos.js` que define los repositorios y Gists destino).
- `/js/`: Scripts principales de inicialización (`app.js`) y enrutamiento (`router.js`).
- `/modules/`: Lógica principal de negocio y gestión de datos para cada dominio (`academico.js`, `blog.js`, `juegos.js`, `tools.js`, `homepage.js`, `files.js`, `audio.js`, `system.js`). Cada módulo maneja su propio estado, renderizado específico y llamadas a servicios.
- `/services/`: Servicios de conexión externa, principalmente `github-api.js` (comunicación con la REST API de GitHub) y `auth.js` (manejo de tokens).
- `/styles/`: Hojas de estilo CSS (`main.css`).
- `/utils/`: Utilidades compartidas (`base64.js`, `markdown.js`, `preview-generator.js`, `validators.js`, `autosave.js`, etc.).
- `/tests/`: Pruebas End-to-End (E2E) con Playwright.

## Módulos principales y responsabilidades

- **`js/router.js`**: Enrutador hash-based simple. Intercepta cambios en la URL (ej. `#/academico`) y carga el componente correspondiente.
- **`services/github-api.js`**: Abstracción sobre `fetch` para interactuar con la API de GitHub (`api.github.com`). Maneja autenticación (Bearer token), codificación/decodificación Base64 (requerida por GitHub para archivos) y llamadas REST (GET, PUT, DELETE, PATCH a repositorios y Gists).
- **`modules/academico.js`**: Renderiza la vista de gestión académica. Mantiene el estado local (`this.data`), solicita datos al Gist, y envía actualizaciones al Gist y archivos al repositorio destino.
- **`modules/blog.js`**: Renderiza la vista del blog. Utiliza `EasyMDE` para edición Markdown. Lee y escribe archivos `.md` directamente en el repositorio `blog-2`. Maneja un sistema de autoguardado local (`Autosave`).
- **`components/modal.js`**: Utilidad centralizada para crear y mostrar modales, alertas y diálogos de confirmación en el DOM.

## Flujo interno (UI → lógica → API)

1. El usuario navega a una ruta (ej. `#/academico`).
2. El enrutador invoca el componente correspondiente (`AcademicoComponent`).
3. El componente delega el renderizado al módulo lógico (`Academico.render(container)`).
4. El módulo inicializa la UI, vincula eventos (botones de crear, guardar, etc.) y llama a un método de carga (`Academico.loadData()`).
5. El método de carga solicita datos a través de `services/github-api.js`.
6. `GitHubAPI` realiza un `fetch` a la API de GitHub utilizando el token de autenticación (`localStorage`).
7. Los datos se reciben, se actualiza el estado interno del módulo (`this.data`) y se renderiza el contenido en el DOM.
8. Al crear o modificar un recurso, el usuario completa un formulario (generado vía `components/form.js`). Al guardar, el módulo actualiza el estado local y llama a `GitHubAPI` para hacer un `PUT` o `PATCH` al repositorio o Gist, actualizando la persistencia remota.

# 3. Integración con GitHub

El CMS utiliza la **GitHub REST API v3** para toda la persistencia y gestión de estado remoto. No hay un backend propio; GitHub actúa como base de datos y sistema de archivos.

## APIs usadas

- **Repositorios (Contents API)**: `/repos/{owner}/{repo}/contents/{path}` (GET, PUT, DELETE) para leer directorios, leer, crear, actualizar y eliminar archivos físicos (PDFs, imágenes, artículos de blog Markdown).
- **Gists API**: `/gists/{gist_id}` (GET, PATCH) para leer y actualizar archivos JSON que funcionan como bases de datos ligeras (ej. `academico/data.json`, `juegos.json`).
- **Repositorios (Commits & Branches)**: Endpoints para obtener información del repositorio, ramas, últimos commits (usados en el módulo `System` y `Dashboard`).
- **Rate Limit**: `/rate_limit` (GET) para mostrar la cuota de uso de la API.

## Repositorios o recursos tocados

La configuración principal reside en `config/repos.js`:

- **Repo `blog`**: `berruetaa/blog-2` (rama `master`). Gestiona artículos Markdown en la carpeta `src/data/blog/`.
- **Repo `site`**: `berruetaa/berrueta-site` (rama `main`). Gestiona páginas estáticas, PDFs subidos, imágenes y configuraciones específicas.
- **Gists**: Utiliza un Gist (cuyo ID se configura en `REPOS.gists.academico`) para almacenar archivos JSON de datos como `data.json` (académico), `homepage.json`, `juegos.json` y `tools.json`.

## Manejo de autenticación

- El acceso se realiza mediante **Personal Access Tokens (PAT)** de GitHub.
- El token debe tener scopes habilitados para leer/escribir en repositorios (`repo`) y administrar Gists (`gist`).
- El servicio `auth.js` almacena y recupera el token en el `localStorage` del navegador bajo la clave `adminCMS_token`.
- `services/github-api.js` intercepta el token y lo inyecta en el encabezado `Authorization: Bearer <token>` en cada solicitud `fetch`. Si recibe un error 401 (Unauthorized), elimina el token y redirige al login.

## Operaciones realizadas

- **Read (GET)**: Obtener contenido de archivos, listar directorios, leer Gists, chequear rate limits.
- **Write/Update (PUT, PATCH)**: Crear nuevos archivos o actualizar existentes en repositorios (requiere el `sha` del blob previo para actualizaciones), actualizar contenido de Gists (`PATCH`). Los archivos se codifican en Base64 antes de enviarse.
- **Delete (DELETE)**: Eliminar archivos de repositorios (requiere el `sha` del blob a eliminar).

# 4. Contrato con berrueta-site

El CMS espera que el repositorio `berrueta-site` (y los Gists asociados) mantengan una estructura y esquema específicos. Este contrato está detallado internamente en `estructura-sitio.md`.

## Rutas que modifica

En el repositorio `berrueta-site`:
- `/academico/{slug}/index.html`: Crea, edita o elimina páginas index para categorías.
- `/academico/recursos/{slug}.html`: Crea o elimina recursos de tipo texto.
- `/academico/*.pdf` o subcarpetas: Sube archivos PDF (módulo académico).
- Cualquier ruta arbitraria mediante el módulo `Files` (subida y borrado de archivos).
- Rutas específicas de audio gestionadas por el módulo de audio (`audio-config.json`, archivos MIDI).

En el Gist asociado:
- `data.json` (módulo Académico)
- `homepage.json` (módulo Homepage)
- `juegos.json` (módulo Juegos)
- `tools.json` (módulo Herramientas)

## Archivos que espera que existan

- Espera que el Gist configurado exista y contenga (o pueda alojar) los archivos JSON correspondientes a cada módulo. Si falta un archivo (ej. `juegos.json`), el CMS generalmente lo inicializa con un estado por defecto.
- En el repo `blog-2`, asume que existe la carpeta `src/data/blog`.

## Estructuras JSON que asume

- **`academico/data.json`**:
  ```json
  {
    "categories": [ { "id": "...", "name": "...", "description": "...", "url": "..." } ],
    "resources": [ { "title": "...", "category": "...", "type": "...", "group": "...", "subgroup": "...", "tags": [...], "url": "...", "description": "..." } ]
  }
  ```
- **`homepage.json`**:
  ```json
  {
    "hero": { ... },
    "cta": [ ... ],
    "sections": [ ... ]
  }
  ```
- **`juegos.json` / `tools.json`**: Listas de objetos con propiedades específicas definidas en los módulos correspondientes.

## Qué rompe si cambia el repo destino

- Si la rama base (ej. de `main` a `master`) cambia en el repo destino, el CMS enviará commits y solicitudes a una rama inexistente (error 404).
- Si la estructura de carpetas (ej. mover `src/data/blog/`) cambia, el CMS creará archivos en rutas incorrectas o fallará al intentar leerlos.
- Si el ID del Gist cambia o se borra, los módulos de datos (Académico, Juegos, etc.) fallarán al cargar, mostrando un estado vacío o errores.
- Si el esquema JSON esperado por el frontend de `berrueta-site` cambia, pero el CMS sigue guardando el formato antiguo, el sitio se romperá al intentar renderizar.

# 5. Gestión de datos

El CMS actúa como intermediario para leer, modificar y guardar estructuras JSON, principalmente desde el Gist configurado.

## Tipo: academico
- **Estructura real**: Objeto JSON (`data.json`) en el Gist. Contiene `categories` (Array de objetos con `id`, `name`, `description`, `url`) y `resources` (Array de objetos con `title`, `category`, `type` (pdf, link, texto), `group`, `subgroup` (opcional), `tags` (Array de strings), `url`, `description`).
- **Validaciones**: En UI (campos requeridos como ID, nombre, título, categoría). El ID de categoría se usa como slug. El CMS valida que el Gist esté configurado (no sea `YOUR_GIST_ID_HERE`).
- **Transformaciones**: Al crear categorías o recursos de texto, se genera un slug basado en el ID/Título, y se deriva la `url` relativa que se guarda en el JSON. Los campos vacíos (`subgroup`) a veces se limpian o mantienen vacíos. Las etiquetas (`tags`) ingresadas como string separado por comas se dividen en un array (`tagsStr.split(',').map...`).

## Tipo: herramientas (tools)
- **Estructura real**: Archivo `tools.json` en el Gist. Array de objetos de herramienta (ej. `{ id: 'uuid', name: 'Herramienta X', url: '/herramientas/x/', description: '...', category: '...' }`).
- **Validaciones**: DESCONOCIDO. (El archivo `modules/tools.js` fue leído parcialmente, asume validaciones básicas de formulario similares a académico).
- **Transformaciones**: Similar a juegos/académico, se envían los datos JSON modificados de vuelta al Gist en formato string (`JSON.stringify()`).

## Tipo: juegos (juegos)
- **Estructura real**: Archivo `juegos.json` en el Gist. Array de objetos (`{ id, name, url, category, description }`). Si no existe en el Gist al cargar, inicializa una lista por defecto.
- **Validaciones**: DESCONOCIDO.
- **Transformaciones**: Al crear/editar un juego, no solo actualiza el JSON en el Gist, sino que aparentemente realiza operaciones en el repositorio `site` (ej. crear la página del juego), leyendo la lógica del código donde toca `REPOS.site` al guardar.

# 6. Flujos clave

## 6.1. Crear recurso (Académico)
1. Usuario abre modal "Nuevo Recurso" (`showResourceModal()`) en `Academico`.
2. Completa formulario (Título, Categoría, Grupo, Tipo, etc.).
3. Si el tipo es "link", requiere ingresar URL manual. Si es "pdf", requiere seleccionar archivo. Si es "texto", requiere contenido en un área de texto.
4. Al hacer click en Guardar (`#res-save`), se capturan los datos.
5. Transformaciones: Convierte `tags` (string con comas) a array. Valida campos obligatorios.
6. Si es **PDF**:
   - Lee archivo seleccionado y lo codifica en Base64 (`Base64.encodeFile()`).
   - Sube archivo vía API de GitHub (`GitHubAPI.createFile(REPOS.site, ...)`). Ruta: `academico/{nombre_limpio}.pdf`.
   - Establece la URL del recurso apuntando a ese archivo (`/academico/{nombre_limpio}.pdf`).
7. Si es **Texto**:
   - Genera un slug basado en el título. Ruta: `academico/recursos/{slug}.html`.
   - Genera contenido HTML envolviendo el texto en un layout estándar (`template`).
   - Sube el archivo HTML al repositorio (`GitHubAPI.createFile(REPOS.site, ...)`).
   - Establece la URL del recurso.
8. Se agrega el objeto del recurso al array `this.data.resources` en memoria.
9. Se llama a `saveData()`: Actualiza el archivo `data.json` en el Gist mediante `GitHubAPI.updateGist()`.
10. Se re-renderiza la tabla y se cierra el modal.

## 6.2. Editar recurso (Académico)
1. Usuario abre modal "Editar Recurso", cargando los datos existentes.
2. Al guardar, si se cambia la información de texto, se actualiza el objeto en `this.data.resources`.
3. (Nota: Según el código actual, parece que *no* se puede actualizar o reemplazar un archivo PDF subido previamente directamente desde la edición de recurso; solo se cambian los metadatos JSON).
4. Llama a `saveData()`, haciendo un `PATCH` al Gist con el nuevo JSON.

## 6.3. Eliminar recurso (Académico)
1. Usuario hace click en Borrar recurso (`deleteResource()`).
2. Se muestra modal de confirmación.
3. Se remueve el elemento del array `this.data.resources` en memoria (`splice()`).
4. Llama a `saveData()` para actualizar el Gist.
5. **Aviso**: El archivo físico en el repositorio (el PDF o el `.html` de texto) *no* se elimina de Github automáticamente en este flujo. Queda "huérfano" a menos que se borre desde el módulo `Files`. (Esto difiere del borrado de Categorías, que sí intenta borrar el archivo `/academico/{id}/index.html`).

## 6.4. Subir archivo (Módulo Files)
1. Usuario abre sección Archivos o arrastra y suelta (Drag & Drop) en la zona designada (`_initDropZone()`).
2. Por cada archivo seleccionado/soltado:
   - Se determina el path destino (`this.currentPath` + nombre archivo).
   - Se muestra modal de carga.
   - El archivo se convierte a Base64 (`Base64.encodeFile()`).
   - Se llama a `GitHubAPI.createFile(REPOS.site, path, base64Content, ...)` (PUT request).
   - Se cierra el modal.
3. Se refresca la vista del directorio actual (`loadDirectory()`).

# 7. Manejo de estado

- **En el CMS**: El estado vive en memoria dentro de cada módulo. Por ejemplo, `Academico.data` mantiene un objeto con `categories` y `resources`. `Blog` mantiene un listado de posts, `Files` mantiene `this.currentPath`.
- **Sincronización**: La sincronización es bajo demanda e iniciada por el usuario (acciones manuales). No hay sincronización en tiempo real ni webhooks bidireccionales. Al entrar a un módulo, se hace un `GET` a GitHub para cargar el estado a memoria. Al presionar "Guardar", se envía la memoria (`this.data`) codificada al repositorio o Gist.
- **Cache**: No hay un caché centralizado para los repositorios. Cada visita o refresco de un módulo recarga los datos de GitHub. Sin embargo, el módulo de **Blog** utiliza una caché local mediante `localStorage` (módulo `Autosave.js`) para almacenar borradores de artículos cada 5 segundos y evitar pérdida de datos si el navegador se cierra.

# 8. Manejo de errores

- **API/Red**: Errores HTTP no-200 (ej. 404, 500) lanzados por `fetchGitHub` son capturados (usando `try/catch`) en las funciones asíncronas de los módulos.
- Si hay un error 401 (token expirado/inválido), la API lo detecta, elimina el token y redirige a `#/login`.
- Los errores capturados se muestran al usuario finalizando los modales de carga y presentando un modal de error (`Modal.showError(msg)`) o un banner en la interfaz.
- **Conflictos (ej: archivo ya existe)**:
  - Al crear archivos (`createFile`), si el archivo ya existe, la API de GitHub devolverá un error (generalmente 422 Unprocessable Entity, porque se requiere un `sha` para actualizar). El CMS mostrará este error al usuario.
  - Al editar archivos (ej. artículos de Blog), el CMS obtiene el `sha` actual del archivo y lo envía en el `PUT`. Si el archivo fue modificado en GitHub por otra vía entre la lectura y la escritura, GitHub devolverá un error de conflicto (409 Conflict), que será mostrado.
- **Errores no manejados**:
  - Archivos huérfanos: Eliminar recursos no elimina los archivos físicos del repo, generando basura técnica a largo plazo.
  - Sincronización perdida: Si el Gist se actualiza desde fuera, el usuario que tiene la página abierta en el CMS podría sobrescribir cambios porque guarda su estado en memoria entero.

# 9. Limitaciones actuales

- **No soporta concurrencia**: Si dos administradores abren el CMS y editan datos al mismo tiempo, el último en guardar sobrescribirá los datos del otro (condición de carrera en los Gists).
- **Gestión de dependencias de archivos frágil**: El borrado y modificación de objetos lógicos (como "Recursos" en académico) a menudo está desconectado del borrado de los archivos físicos (.pdf, .html) que los respaldan en el repositorio.
- **Archivos grandes**: La API REST de GitHub tiene límites de tamaño de archivo (habitualmente 100MB por archivo y problemas con contenidos Base64 masivos). Archivos pesados fallarán.
- **Falta de paginación exhaustiva**: Si un directorio o listado de commits tiene demasiados elementos, la UI o la API pueden volverse lentas, ya que parece basarse en solicitudes simples limitadas sin un manejo robusto de paginación profunda.
- **Gist dependiente**: El sitio depende estrictamente del correcto mapeo de un ID de Gist estático en la configuración.

# 10. Riesgos técnicos

- **Partes críticas**:
  - `services/github-api.js`: Un fallo en la abstracción o un cambio en la API de GitHub rompe toda la aplicación.
  - El Gist de datos: Funciona como "base de datos" para toda la gestión. Si el Gist es borrado o se corrompe el JSON, se rompen múltiples secciones del frontend.
- **Riesgos de rotura fácil**:
  - Un commit manual en `berrueta-site` que renombre archivos referenciados en los Gists romperá enlaces en producción sin que el CMS se entere.
  - Editar JSON a mano en el Gist y dejar una coma suelta (JSON inválido) hará que el CMS crashee al llamar `JSON.parse(file.content)` (como se ve en la carga de Académico).
- **Dependencias implícitas**: El CMS asume layouts específicos (como el template hardcodeado en `Academico` para tipos "texto"). Si el frontend cambia su CSS o estructura en `berrueta-site`, esos templates creados por el CMS quedarán desactualizados visualmente.

# 11. Mapa operativo rápido

- **Para agregar contenido a Académico** → Flujo `#/academico` > "Nuevo Recurso" > Completar form > Se sube archivo/crea HTML (si aplica) > Se actualiza el Gist.
- **Para escribir o editar un artículo** → Flujo `#/blog` > "Nuevo Artículo" > Editor EasyMDE (autoguardado activado) > Guardar en GitHub > Crea/Edita archivo `.md` en repo `blog-2`.
- **Para subir PDFs/Imágenes sin crear objetos** → Flujo `#/files` > Navegar a carpeta destino > "Subir Archivo" o Drag & Drop > Envía directo al repo `berrueta-site`.
- **Para debuggear errores** → Revisar consola de red (Network) para inspeccionar las respuestas de `api.github.com`. Comprobar `config/repos.js` para asegurar que los IDs de repositorios, ramas y Gists son correctos y existen. Revisar token y rate limits.
- **Para extender el CMS (nuevo módulo)** → Tocar `config/repos.js` (si usa nuevo Gist), crear un nuevo componente en `/components/` y conectarlo a un módulo lógico en `/modules/`, y registrar la ruta en `js/router.js` y `app.js` (`routes`).
