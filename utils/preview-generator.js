/**
 * @fileoverview Generador de HTML para previsualizar contenido en un staging/iframe local.
 */

export const PreviewGenerator = {
  /**
   * Genera el HTML para la previsualización de la Homepage.
   */
  homepage(data) {
    const hero = `
      <section class="hero" style="text-align:center; padding: 5rem 1rem; border-bottom: 1px solid var(--color-border);">
         <h1 style="font-size:3.5rem; margin-bottom:1rem; letter-spacing:-1px;">Berrueta<span style="color:var(--color-accent);">;</span></h1>
         <p style="font-size:1.4rem; color:#555; max-width:700px; margin:0 auto 2.5rem; line-height:1.4;">${data.hero?.tagline || ''}</p>
         <div style="display:flex; justify-content:center; gap:1.2rem; flex-wrap:wrap;">
            ${(data.cta || []).map(c => `
               <a href="#" class="btn ${c.primary ? 'btn-primary' : 'btn-secondary'}">${c.label}</a>
            `).join('')}
         </div>
         <div style="margin-top:3rem; max-width:800px; margin-left:auto; margin-right:auto; text-align:left; color:#666; font-size:1rem; line-height:1.6;">
            ${data.hero?.bio?.replace(/\n/g, '<br>') || ''}
         </div>
      </section>
    `;

    const sections = (data.sections || []).map(sec => `
      <section style="padding: 4rem 1rem; max-width:1100px; margin:0 auto;">
         <h2 style="font-size:2rem; border-bottom:3px solid var(--color-accent); display:inline-block; margin-bottom:2.5rem; padding-bottom:0.3rem;">${sec.title} <span style="font-size:0.7em; font-weight:normal; color:#999; margin-left:0.5rem;">(${sec.subtitle})</span></h2>
         <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:1.5rem;">
            ${(sec.items || []).map(item => `
               <div class="teaser-card ${item.highlight ? 'highlight-teaser' : ''}" style="padding:1.8rem; border:1px solid var(--color-border); border-radius:12px; position:relative;">
                  <h3 style="margin-top:0; margin-bottom:0.75rem; font-size:1.3rem;">${item.title}</h3>
                  <p style="color:#666; font-size:0.95rem; line-height:1.5; margin-bottom:0;">${item.description}</p>
               </div>
            `).join('')}
         </div>
      </section>
    `).join('');

    return this._wrap(hero + sections);
  },

  /**
   * Genera el HTML para la previsualización de la página de Herramientas.
   */
  tools(data) {
    const html = `
      <section style="padding: 4rem 1rem; max-width:1100px; margin:0 auto;">
         <h1 style="font-size:3rem; border-bottom:3px solid var(--color-accent); display:inline-block; margin-bottom:1rem;">Herramientas</h1>
         <p style="font-size:1.2rem; color:#666; margin-bottom:3rem;">Colección de utilidades diseñadas para facilitar diferentes tareas.</p>
         
         <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:1.5rem;">
            ${(data || []).map(tool => `
               <div class="teaser-card" style="padding:2rem; border:1px solid var(--color-border); border-radius:12px; display:flex; flex-direction:column; justify-content:space-between; min-height:220px;">
                  <div>
                    <h2 style="font-size:1.4rem; color:var(--color-accent); margin-bottom:0.75rem;">${tool.icon ? `<span>${tool.icon}</span> ` : ''}${tool.name}</h2>
                    <p style="color:#666; font-size:1rem; line-height:1.5;">${tool.description}</p>
                  </div>
                  <div style="margin-top:1.5rem;">
                    <a href="#" class="btn btn-primary" style="width:100%; text-align:center; padding: 0.6rem;">Abrir Herramienta</a>
                  </div>
               </div>
            `).join('')}
         </div>
      </section>
    `;
    return this._wrap(html);
  },

  /**
   * Genera el HTML para la previsualización de un post del Blog.
   */
  blog(frontmatter, markdownContent) {
    const html = `
      <article style="max-width:850px; margin:0 auto; padding:4rem 1.5rem;">
         <header style="margin-bottom:3.5rem; border-bottom: 2px solid #f0f0f0; padding-bottom:2rem;">
            <p style="text-transform:uppercase; font-weight:700; color:var(--color-accent); font-size:0.85rem; letter-spacing:1px; margin-bottom:0.75rem;">Entrada de Blog</p>
            <h1 style="font-size:3.5rem; line-height:1.1; margin-bottom:1.5rem; letter-spacing:-1px;">${frontmatter.title}</h1>
            <div style="display:flex; align-items:center; gap:1rem; color:#888; font-size:0.95rem;">
               <span>Por <strong>${frontmatter.author}</strong></span>
               <span>•</span>
               <span>${new Date(frontmatter.pubDatetime).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div style="margin-top:1.5rem; display:flex; gap:0.6rem; flex-wrap:wrap;">
               ${(frontmatter.tags || []).map(t => `<span style="background:#f0f0f0; color:#666; padding:4px 12px; border-radius:20px; font-size:0.85rem; font-weight:500;">#${t}</span>`).join('')}
            </div>
         </header>
         <div id="markdown-viewer" class="markdown-body" style="font-size:1.15rem; line-height:1.8; color:#333;">
            <div style="display:flex; justify-content:center; padding:2rem;"><div class="loading-spinner"></div> Cargando contenido...</div>
         </div>
      </article>
      
      <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
      <script>
         const rawMd = \`${markdownContent.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
         document.getElementById('markdown-viewer').innerHTML = marked.parse(rawMd);
      </script>
    `;
    return this._wrap(html);
  },

  /**
   * Envoltura común con CSS del sitio.
   */
  _wrap(bodyHtml) {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
         <meta charset="UTF-8">
         <meta name="viewport" content="width=device-width, initial-scale=1.0">
         <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@800&f[]=satoshi@300,400,500,700&display=swap">
         <style>
            :root {
              --color-background: #ffffff;
              --color-foreground: #282728;
              --color-accent: #ffb20f;
              --color-muted: #f4f4f4;
              --color-border: #ece9e9;
              --font-display: 'Cabinet Grotesk', sans-serif;
              --font-body: 'Satoshi', sans-serif;
            }
            * { box-sizing: border-box; }
            body { 
              font-family: var(--font-body); 
              color: var(--color-foreground); 
              background: var(--color-background); 
              margin:0; padding:0;
              -webkit-font-smoothing: antialiased;
            }
            h1, h2, h3, h4 { font-family: var(--font-display); font-weight: 800; color: var(--color-foreground); }
            
            /* Buttons staging */
            .btn { 
              display: inline-flex; 
              align-items: center;
              padding: 0.8rem 2rem; 
              border: 2px solid var(--color-foreground); 
              border-radius: 8px; 
              text-decoration: none; 
              font-weight: 700; 
              font-family: var(--font-body);
              transition: all 0.2s ease;
              font-size: 1rem;
            }
            .btn-primary { background: var(--color-foreground); color: var(--color-background); }
            .btn-secondary { background: transparent; color: var(--color-foreground); border-color: #ddd; }
            
            /* Teasers staging */
            .teaser-card { 
               background: #fff;
               transition: transform 0.3s ease, box-shadow 0.3s ease;
            }
            .highlight-teaser { 
               border: 2px solid var(--color-accent) !important;
               box-shadow: 0 10px 30px rgba(255,178,15, 0.1);
            }
            
            /* Markdown Styling */
            .markdown-body h1, .markdown-body h2, .markdown-body h3 { margin-top: 2.5rem; margin-bottom: 1rem; }
            .markdown-body p { margin-bottom: 1.5rem; }
            .markdown-body img { max-width: 100%; border-radius: 12px; margin: 2rem 0; box-shadow: 0 10px 40px rgba(0,0,0,0.05); }
            .markdown-body blockquote { 
               border-left: 5px solid var(--color-accent); 
               padding: 1rem 1.5rem; 
               background: #fffbf2; 
               margin: 2rem 0;
               font-style: italic;
               font-size: 1.2rem;
               color: #444;
            }
            .markdown-body pre { background: #1a1a1b; color: #fff; padding: 1.5rem; border-radius: 8px; overflow-x: auto; margin:1.5rem 0;}
            .markdown-body code { font-family: 'Courier New', Courier, monospace; background: #f0f0f0; padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.9em; }
            .markdown-body pre code { background: transparent; padding:0; }
            
            .loading-spinner {
              border: 3px solid #eee;
              border-top: 3px solid var(--color-accent);
              border-radius: 50%;
              width: 24px;
              height: 24px;
              animation: spin 1s linear infinite;
              display: inline-block;
            }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
            body > * { animation: slideUp 0.6s ease-out both; }
         </style>
      </head>
      <body>
         ${bodyHtml}
      </body>
      </html>
    `;
  }
};
