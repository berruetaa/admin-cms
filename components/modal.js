export const Modal = {
  create(title, content, actions = '') {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal';

    modal.innerHTML = `
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        ${content}
      </div>
      <div class="modal-footer">
        ${actions}
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Add close events
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.addEventListener('click', () => this.close(overlay));

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close(overlay);
    });

    return overlay;
  },

  close(modalElement) {
    if (modalElement && modalElement.parentNode) {
      modalElement.parentNode.removeChild(modalElement);
    }
  },

  showConfirm(message, onConfirm) {
    const overlay = this.create(
      'Confirmar Acción',
      `<p>${message}</p>`,
      `
        <button class="btn btn-secondary" id="confirm-cancel">Cancelar</button>
        <button class="btn btn-danger" id="confirm-ok">Aceptar</button>
      `
    );

    overlay.querySelector('#confirm-cancel').addEventListener('click', () => this.close(overlay));
    overlay.querySelector('#confirm-ok').addEventListener('click', () => {
      onConfirm();
      this.close(overlay);
    });
  },

  showLoading(message = 'Cargando...') {
    return this.create(
      'Por favor espere',
      `<div class="loading-spinner"></div><p>${message}</p>`
    );
  },

  showError(message) {
    const overlay = this.create(
      'Error',
      `<p class="text-danger">${message}</p>`,
      `<button class="btn btn-primary" id="error-ok">Entendido</button>`
    );

    overlay.querySelector('#error-ok').addEventListener('click', () => this.close(overlay));
  }
};
