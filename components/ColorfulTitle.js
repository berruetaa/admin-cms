/**
 * Component to handle the dynamic logo animation.
 * Iterates through the brand's specific color palette for the punctuation mark.
 */
export const ColorfulTitle = {
  colors: [
    '#FFB20F', // Naranja
    '#2176FF', // Azul
    '#D7263D', // Rojo
    '#1FAA59', // Verde
    '#5F4B8B'  // Púrpura
  ],
  currentIndex: 0,
  intervalId: null,

  /**
   * Initializes the dynamic logo animation.
   * @param {string} selector - The CSS selector for the punctuation mark element.
   */
  init(selector = '.logo-punct') {
    const punctElements = document.querySelectorAll(selector);
    if (!punctElements.length) return;

    // Clear any existing interval to prevent multiple instances
    this.stop();

    // Set initial color
    punctElements.forEach(el => {
      el.style.color = this.colors[0];
    });

    // Start interval
    this.intervalId = setInterval(() => {
      this.currentIndex = (this.currentIndex + 1) % this.colors.length;
      punctElements.forEach(el => {
        el.style.color = this.colors[this.currentIndex];
      });
    }, 1000);
  },

  /**
   * Stops the animation.
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
};
