# Configuración de GitHub Gists para Datos Académicos

Para evitar que cada actualización en la sección académica genere un commit en el repositorio principal, hemos migrado el almacenamiento de `data.json` a un GitHub Gist.

Sigue estos pasos para configurar tu entorno:

### 1. Crear el Gist
1. Ve a [gist.github.com](https://gist.github.com/).
2. Crea un nuevo Gist (puede ser público o secreto).
3. Nombra el archivo como `data.json`.
4. Pega el contenido actual de tu archivo `academico/data.json`.
5. Guarda el Gist.

### 2. Obtener el Gist ID
1. Una vez guardado, mira la URL de tu Gist.
2. El ID es la cadena alfanumérica al final de la URL.
   - Ejemplo: `https://gist.github.com/usuario/a1b2c3d4e5f6g7h8i9j0` -> El ID es `a1b2c3d4e5f6g7h8i9j0`.

### 3. Configurar el CMS
1. Abre el archivo `config/repos.js` en este repositorio (`admin-cms`).
2. Localiza el objeto `gists`.
3. Reemplaza `"YOUR_GIST_ID_HERE"` por el ID que obtuviste en el paso anterior.

```javascript
export const REPOS = {
  // ...
  gists: {
    get academico() { return window.GIST_ID_MOCK || "TU_NUEVO_GIST_ID"; }
  }
};
```

### 4. Actualizar el Sitio Público (Frontend)
Para que tu página web principal (berrueta-site) siga mostrando los datos, deberás actualizar la lógica de carga en el frontend para que lea desde la URL "raw" del Gist o mediante la API de GitHub.

**URL Raw sugerida:**
`https://gist.githubusercontent.com/TU_USUARIO/TU_GIST_ID/raw/data.json`

---
*Nota: El CMS seguirá permitiendo la subida de archivos PDF directamente al repositorio `berrueta-site`, ya que estos no cambian con tanta frecuencia como el índice de datos.*
