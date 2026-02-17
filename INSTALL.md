# Guía de Instalación y Despliegue - Madrid Movilidad

Esta guía explica cómo instalar y ejecutar el proyecto en cualquier ordenador (Windows, Mac o Linux).

## Requisitos Previos

Necesitas tener instalado:
1.  **Node.js** (Versión 18 o superior).
    *   Descargar aquí: [https://nodejs.org/](https://nodejs.org/)
    *   Para comprobar si lo tienes, abre una terminal y escribe: `node -v`

## Pasos para Instalar (Primera vez)

1.  **Descargar el código**:
    Copia la carpeta del proyecto en tu ordenador.

2.  **Abrir la terminal**:
    Navega hasta la carpeta del proyecto.
    ```bash
    cd ruta/a/tu/carpeta/Repo-DAW-Proyecto
    ```

3.  **Instalar dependencias**:
    Este comando descarga las librerías necesarias (Express, SQLite, etc) definidas en `package.json`.
    ```bash
    npm install
    ```
    *Nota: Esto creará una carpeta llamada `node_modules`. No la toques.*

4.  **Preparar la Base de Datos (Opcional)**:
    Si quieres datos de prueba (usuarios y ejemplos), ejecuta:
    ```bash
    npm run seed
    ```

## Cómo Ejecutar el Proyecto

1.  **Arrancar el servidor**:
    En la terminal, dentro de la carpeta del proyecto:
    ```bash
    npm start
    ```

2.  **Abrir en el navegador**:
    Visita: [http://localhost:3000](http://localhost:3000)

## Solución de Problemas Frecuentes

*   **Error "Address already in use"**:
    Significa que el puerto 3000 está ocupado. Cierra otras terminales de Node o reinicia el PC.

*   **Error "Module not found"**:
    Asegúrate de haber ejecutado `npm install` antes de `npm start`.
