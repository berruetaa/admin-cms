# Contrato de Estructura: berrueta-site y admin-cms

Este documento define la arquitectura y estructura estricta del repositorio **berrueta-site**. El objetivo es servir como **contrato de estructura** estable para que el CMS externo (`admin-cms`) pueda interactuar correctamente con este repositorio mediante la GitHub REST API.

Cualquier cambio futuro en la estructura de carpetas o en los formatos de datos detallados aquí requerirá la actualización de este documento y, posiblemente, ajustes en el CMS.

────────────────────────────────────────────────────────────

## 1. Visión general del repositorio

`berrueta-site` es un repositorio que centraliza los proyectos web personales de Sebastián Berrueta. El sitio está construido con una arquitectura estática pura (HTML, CSS, Vanilla JS) y se divide en varias "aplicaciones" o secciones temáticas:

- **Sitio principal:** Páginas base (`index.html`) y el núcleo del diseño visual.
- **Académico (`/academico`):** Recursos, apuntes y PDFs educativos agrupados por asignaturas (química, física, matemática, etc.). Utiliza un archivo JSON centralizado para gestionar el contenido.
- **Herramientas (`/herramientas`):** Utilidades web interactivas (generadores, conversores, etc.).
- **Juegos (`/juegos`):** Una colección de minijuegos estáticos y emulados (Flash/Canvas).
- **Proyectos (`/proyectos`):** Proyectos y sitios adicionales alojados dentro del dominio principal.
- **Assets (`/assets`):** Archivos estáticos globales (imágenes, íconos, flash).

────────────────────────────────────────────────────────────

## 2. Árbol completo del repositorio

A continuación se presenta el árbol de directorios que refleja la estructura **refleja la estructura actual del repositorio al momento de escribir este documento**:

```text
/
├── academico/
│   ├── data.json
│   ├── documentos/
│   ├── educacion/
│   ├── fisica/
│   ├── matematica/
│   ├── quimica/
│   └── *.pdf (ej. compendio-cuadrilateros.pdf)
├── assets/
│   ├── flash/
│   ├── ico/
│   ├── images/
│   ├── img/
│   ├── js/
│   └── tetris/
├── brand/
├── docs/
│   └── estructura-sitio.md
├── herramientas/
├── juegos/
├── proyectos/
├── src/
│   ├── css/
│   └── js/
├── index.html
├── README.md
├── FUTURO.md
└── ... (otros archivos de configuración base)
```

────────────────────────────────────────────────────────────

## 3. Explicación de cada carpeta

### `/academico`
- **Propósito:** Contiene los recursos educativos del sitio. Agrupa páginas HTML por materia y almacena los archivos PDF de lectura.
- **Tipo de archivos:** `.html`, `.pdf`, `.json`.
- **Intervención del CMS:** El CMS puede leer, editar, agregar y eliminar recursos modificando `academico/data.json` y gestionando archivos PDF directamente en esta carpeta o sus subcarpetas.

### `/assets`
- **Propósito:** Almacenar recursos estáticos globales que no son código fuente.
- **Tipo de archivos:** Imágenes (`.jpg`, `.png`, `.svg`), íconos (`.ico`), animaciones flash (`.swf`), etc.
- **Intervención del CMS:** El CMS puede subir nuevas imágenes aquí (particularmente en `/assets/images/` o `/assets/img/`) para ser referenciadas por los datos.

### `/herramientas`
- **Propósito:** Contiene utilidades web y aplicaciones estáticas pequeñas.
- **Tipo de archivos:** Código fuente web (`.html`, `.css`, `.js`).
- **Intervención del CMS:** READ ONLY.

### `/juegos`
- **Propósito:** Colección de minijuegos estáticos. Contienen su propio ecosistema de ejecución.
- **Tipo de archivos:** Archivos web e interactivos aislados.
- **Intervención del CMS:** READ ONLY.

### `/proyectos`
- **Propósito:** Sitios adicionales o páginas de proyectos específicos alojados en subdirectorios.
- **Tipo de archivos:** Código fuente web.
- **Intervención del CMS:** READ ONLY.

### `/src`
- **Propósito:** Código fuente base y centralizado de la página principal (entry point del sitio global). Contiene la lógica Vanilla JS y los estilos CSS globales.
- **Tipo de archivos:** `.css`, `.js`.
- **Intervención del CMS:** READ ONLY.

### `/brand` y `/docs`
- **Propósito:** Documentación interna, guidelines de marca visual y documentos de arquitectura (como este archivo).
- **Tipo de archivos:** `.md`.
- **Intervención del CMS:** READ ONLY.

────────────────────────────────────────────────────────────

## 4. Archivos gestionados por el CMS

Esta sección especifica exactamente sobre qué rutas y archivos el CMS tiene permisos de escritura y gestión:

- `academico/data.json`: Archivo principal de datos. El CMS lee, edita, agrega o elimina categorías y recursos académicos de este archivo.
- `academico/*.pdf` (y PDFs dentro de subcarpetas de académico): Archivos de documentos subidos por el CMS como material de estudio. El CMS puede crear y eliminar estos archivos.
- `assets/images/*` y `assets/img/*`: Archivos de imagen estáticos. El CMS puede subir o eliminar imágenes que luego se referencian en los JSON de datos o en la UI dinámica.

*Nota:* Cualquier archivo JSON de datos futuros (ej: un hipotético `herramientas/data.json`) deberá ser documentado aquí una vez exista, para que el CMS pase a gestionarlo. Actualmente, solo `academico/data.json` está bajo la gestión activa de datos del CMS.

────────────────────────────────────────────────────────────

## 5. Archivos o carpetas que el CMS NO debe modificar (READ ONLY)

Las siguientes carpetas y archivos conforman el núcleo lógico y de diseño del sitio. El CMS debe considerarlos estrictamente de solo lectura (**READ ONLY**) para evitar romper el sitio:

- Toda la carpeta `/src` (Scripts globales, Router, estilos CSS base).
- Toda la carpeta `/herramientas` (Lógica de las utilidades web).
- Toda la carpeta `/juegos` (Archivos fuente y emuladores de los juegos).
- Toda la carpeta `/proyectos` (Código de subproyectos).
- Toda la carpeta `/brand` y `/docs` (Documentación).
- Archivos HTML raíz y de layouts (`index.html`, `404.html`, y los `index.html` estáticos dentro de `/academico/` u otras carpetas).
- Archivos de configuración del repositorio (`.gitignore`, `README.md`, `FUTURO.md`, `robots.txt`, scripts de shell/python).

────────────────────────────────────────────────────────────

## 6. Estructura de datos

El sitio utiliza una arquitectura de datos manejada por JSON. A continuación se detalla la estructura del principal archivo de datos:

### `academico/data.json`

Este archivo contiene un objeto raíz con dos arrays principales: `categories` y `resources`.

#### Objeto `categories`
Define las asignaturas o divisiones principales de la sección académica.
```json
{
  "id": "quimica",             // Identificador único de la categoría. Usado en URLs y relaciones.
  "name": "Química",           // Nombre legible para mostrar en la interfaz.
  "description": "Recursos...",// Breve descripción de la categoría.
  "url": "/academico/quimica/" // Ruta relativa estática donde vive la página HTML de la categoría.
}
```

#### Objeto `resources`
Define los materiales individuales (PDFs, links a páginas web, etc.).
```json
{
  "title": "Compendio Cuadriláteros",              // Título del recurso.
  "category": "matematica",                        // Relacionado con el `id` de un objeto en `categories`.
  "type": "pdf",                                   // Tipo de recurso (ej. "pdf", "link", "video").
  "group": "Resúmenes",                            // Agrupación dentro de la página de la categoría (secciones renderizadas).
  "tags": ["geometria", "cuadrilateros"],          // Arreglo de strings para filtrado o búsqueda.
  "url": "/academico/compendio-cuadrilateros.pdf", // Ruta relativa al recurso (PDF) o enlace externo/interno.
  "description": "Material de estudio detallado..."// Breve descripción del recurso.
}
```

────────────────────────────────────────────────────────────

## 7. Convenciones importantes

- **Rutas y URLs:** Todas las rutas almacenadas en los JSON (como `url`) deben ser **relativas a la raíz del dominio**, comenzando siempre con un `/` (ej: `/academico/quimica/`). No se deben incluir dominios absolutos como `https://berrueta.uy/`.
- **Ubicación de PDFs:** Todos los documentos PDF subidos por el CMS deben ubicarse preferentemente en la carpeta `/academico/` (o dentro de las subcarpetas de materias si así se prefiere para organización, ej: `/academico/matematica/`). Su ruta en el JSON de datos debe coincidir exactamente.
- **Convenciones de Nombres:**
  - Usar minúsculas y guiones (kebab-case) para nombres de archivos y carpetas (ej. `compendio-cuadrilateros.pdf`).
  - No usar espacios ni caracteres especiales en nombres de archivos para evitar errores de codificación en las URLs.

────────────────────────────────────────────────────────────

## 8. Reglas de estabilidad

Las siguientes estructuras se consideran **estables** y el `admin-cms` puede (y debe) depender de ellas de manera segura:

1.  **Ubicación del archivo de datos:** La ruta `academico/data.json` no cambiará de nombre ni de lugar.
2.  **Esquema de datos:** La estructura base `{ "categories": [], "resources": [] }` de `academico/data.json` se mantendrá estricta. Las propiedades obligatorias de un recurso (`title`, `category`, `url`, `group`) no serán removidas ni renombradas.
3.  **Separación de datos y vistas:** Los archivos `.html` de las materias en `/academico/` continuarán consumiendo este JSON de manera dinámica y no contendrán datos hardcodeados que el CMS no pueda ver.

*Si alguna de estas reglas de estabilidad necesita ser alterada por requerimientos del Front-end, este documento (`docs/estructura-sitio.md`) deberá ser actualizado en el mismo commit o Pull Request que modifique la estructura, y se deberá notificar al equipo responsable del CMS.*
