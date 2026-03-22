import { Homepage } from '../modules/homepage.js';

export const HomepageComponent = {
    requiresAuth: true,
    render: async () => {
        return `
            <div id="module-container"></div>
        `;
    },
    init: async () => {
        const container = document.getElementById('module-container');
        if (container) {
            await Homepage.render(container);
        }
    }
};
