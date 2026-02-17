const STORAGE_KEY = "madrid_movilidad_user_id";

class SimulationWidget {
  constructor() {
    this.usuarios = [];
    this.currentUser = null;
    this.init();
  }

  async init() {
    await this.fetchUsuarios();
    this.loadUserFromStorage();
    this.renderWidget();
  }

  async fetchUsuarios() {
    try {
      const res = await fetch("/api/usuarios");
      this.usuarios = await res.json();
      // Fallback si no hay usuarios
      if (!this.usuarios.length) {
        this.usuarios = [
          {
            id: 1,
            nombre: "Admin Metro",
            tipo: "admin",
            avatar: "fas fa-user-shield",
          },
          {
            id: 2,
            nombre: "Viajero Frecuente",
            tipo: "viajero",
            avatar: "fas fa-user-clock",
          },
          {
            id: 3,
            nombre: "Usuario1",
            tipo: "viajero",
            avatar: "fas fa-user",
          },
          {
            id: 4,
            nombre: "Usuario2",
            tipo: "viajero",
            avatar: "fas fa-user",
          },
          {
            id: 5,
            nombre: "Usuario3",
            tipo: "viajero",
            avatar: "fas fa-user",
          },
        ];
      }
    } catch (error) {
      console.error("Error cargando usuarios simulados:", error);
    }
  }

  loadUserFromStorage() {
    const savedId = localStorage.getItem(STORAGE_KEY);
    if (savedId) {
      this.currentUser =
        this.usuarios.find((u) => u.id == savedId) || this.usuarios[0];
    } else {
      this.currentUser = this.usuarios[0]; // Default to first user
    }
  }

  selectUser(id) {
    this.currentUser = this.usuarios.find((u) => u.id == id);
    localStorage.setItem(STORAGE_KEY, id);
    this.updateWidgetDisplay();

    // Dispatch event for other parts of the app
    window.dispatchEvent(
      new CustomEvent("userChanged", { detail: this.currentUser }),
    );
    console.log("Usuario cambiado a:", this.currentUser.nombre);
  }

  renderWidget() {
    if (document.getElementById("simulation-widget")) return;

    const widget = document.createElement("div");
    widget.id = "simulation-widget";

    const avatarClass = this.currentUser
      ? this.currentUser.avatar
      : "fas fa-user";

    widget.innerHTML = `
            <div id="sim-avatar">
                <i class="${avatarClass}"></i>
            </div>
            <select id="sim-user-select">
                ${this.usuarios
                  .map(
                    (u) => `
                    <option value="${u.id}" ${this.currentUser && this.currentUser.id === u.id ? "selected" : ""}>
                        ${u.nombre}
                    </option>
                `,
                  )
                  .join("")}
            </select>
        `;
    document.body.appendChild(widget);

    document
      .getElementById("sim-user-select")
      .addEventListener("change", (e) => {
        this.selectUser(parseInt(e.target.value));
      });
  }

  updateWidgetDisplay() {
    // Find the icon element inside the avatar container
    const avatarIcon = document.querySelector("#sim-avatar i");
    if (avatarIcon && this.currentUser) {
      // Update the class of the existing icon
      avatarIcon.className = this.currentUser.avatar;
    }
  }

  // Public method to get current user
  getCurrentUser() {
    return this.currentUser;
  }
}

// Initialize and expose globally
window.Simulation = new SimulationWidget();
