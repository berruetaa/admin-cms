export const Form = {
  renderField(field) {
    const { id, label, type, value = '', required = false, options = [], rows = 10, accept = '' } = field;
    const reqAttr = required ? 'required' : '';

    let inputHtml = '';

    switch (type) {
      case 'text':
      case 'number':
      case 'date':
      case 'datetime-local':
        inputHtml = `<input type="${type}" id="${id}" name="${id}" value="${value}" ${reqAttr} class="form-control" />`;
        break;
      case 'textarea':
        inputHtml = `<textarea id="${id}" name="${id}" rows="${rows}" ${reqAttr} class="form-control">${value}</textarea>`;
        break;
      case 'checkbox':
        inputHtml = `
          <div class="checkbox-wrapper">
            <input type="checkbox" id="${id}" name="${id}" ${value ? 'checked' : ''} />
            <label for="${id}">${label}</label>
          </div>
        `;
        return `<div class="form-group">${inputHtml}</div>`;
      case 'select':
        const opts = options.map(opt =>
          `<option value="${opt.value}" ${opt.value === value ? 'selected' : ''}>${opt.label}</option>`
        ).join('');
        inputHtml = `<select id="${id}" name="${id}" ${reqAttr} class="form-control">${opts}</select>`;
        break;
      case 'file':
        inputHtml = `<input type="file" id="${id}" name="${id}" accept="${accept}" ${reqAttr} class="form-control-file" />`;
        break;
      case 'tags':
        // For simple arrays of strings
        const tagsValue = Array.isArray(value) ? value.join(', ') : value;
        inputHtml = `<input type="text" id="${id}" name="${id}" value="${tagsValue}" ${reqAttr} class="form-control" placeholder="Separar por comas..." />`;
        break;
      default:
        inputHtml = `<input type="text" id="${id}" name="${id}" value="${value}" ${reqAttr} class="form-control" />`;
    }

    return `
      <div class="form-group">
        <label for="${id}">${label} ${required ? '<span class="text-danger">*</span>' : ''}</label>
        ${inputHtml}
      </div>
    `;
  },

  getFormData(formElement, fields) {
    const data = {};
    const formData = new FormData(formElement);

    fields.forEach(field => {
      const { id, type } = field;

      if (type === 'checkbox') {
        data[id] = formElement.querySelector(`#${id}`).checked;
      } else if (type === 'file') {
        const fileInput = formElement.querySelector(`#${id}`);
        data[id] = fileInput.files.length > 0 ? fileInput.files[0] : null;
      } else if (type === 'tags') {
        const val = formData.get(id);
        data[id] = val ? val.split(',').map(tag => tag.trim()).filter(Boolean) : [];
      } else if (type === 'number') {
        data[id] = Number(formData.get(id));
      } else {
        data[id] = formData.get(id);
      }
    });

    return data;
  }
};
