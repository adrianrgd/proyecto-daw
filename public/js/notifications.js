/**
 * Sistema de Notificaciones Toast (sin alertas nativas)
 */
const Notifications = {
  container: null,

  init() {
    if (document.getElementById("toast-container")) return;

    this.container = document.createElement("div");
    this.container.id = "toast-container";
    document.body.appendChild(this.container);
  },

  /**
   * Muestra una notificación toast
   * @param {string} message - El mensaje a mostrar
   * @param {string} type - 'success', 'error', 'info', 'warning'
   */
  show(message, type = "info") {
    if (!this.container) this.init();

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    // Icono basado en el tipo
    let icon = "info-circle";
    if (type === "success") icon = "check-circle";
    if (type === "error") icon = "exclamation-circle";
    if (type === "warning") icon = "exclamation-triangle";

    toast.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        `;

    this.container.appendChild(toast);

    // Animación de entrada
    requestAnimationFrame(() => {
      toast.classList.add("show");
    });

    // Auto-eliminar después de 3 segundos
    setTimeout(() => {
      toast.classList.remove("show");
      toast.classList.add("hide");
      toast.addEventListener("transitionend", () => {
        toast.remove();
      });
    }, 3000);
  },
};

window.Toast = Notifications;
