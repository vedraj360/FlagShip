# Deployment Guide for Dokploy

This guide outlines the steps to deploy the AppToggles application (Frontend + Backend) on Dokploy using an external Aiven PostgreSQL database.

## Prerequisites

1.  **Dokploy Instance**: A running instance of Dokploy.
2.  **Aiven PostgreSQL Database**:
    *   Create a PostgreSQL service on Aiven.
    *   Get the **Service URI** (Connection String). It looks like: `postgres://avnadmin:password@host:port/defaultdb?sslmode=require`.

---

## 1. Backend Deployment

The backend is a Node.js/Express application using Prisma.

### Steps in Dokploy:

1.  **Create Application**:
    *   Go to your Project -> **Create Application**.
    *   Name: `apptoggles-backend` (or similar).
    *   Select your Git Repository and Branch (e.g., `main`).

2.  **Configuration**:
    *   **Root Directory**: `/backend` (Important: The backend code is in this subfolder).
    *   **Docker**: The system should automatically detect the `Dockerfile` in `/backend`.

3.  **Environment Variables**:
    *   Go to the **Environment** tab.
    *   Add the following variables:
        *   `DATABASE_URL`: Paste your Aiven connection string here.
        *   `PORT`: `4000`
        *   `JWT_SECRET`: Generate a strong random string (e.g., using `openssl rand -hex 32`).

4.  **Network / Port**:
    *   Set the **Container Port** to `4000`.
    *   Enable the **Public Domain** (e.g., `https://backend-api.yourdomain.com`). **Copy this URL**, you will need it for the frontend.

5.  **Deploy**:
    *   Click **Deploy**.

### Database Initialization (Since Registration is Disabled):

Since the registration page is disabled, you need to create an initial admin user.

1.  Wait for the deployment to finish.
2.  Go to the **Console** tab of your backend application in Dokploy.
3.  Run the seed command:
    ```bash
    npm run seed
    ```
    *   This will create a default user:
        *   **Email**: `admin@example.com`
        *   **Password**: `password123`

---

## 2. Frontend Deployment

The frontend is a React SPA served via Nginx.

### Steps in Dokploy:

1.  **Create Application**:
    *   Go to your Project -> **Create Application**.
    *   Name: `apptoggles-frontend`.
    *   Select the same Git Repository.

2.  **Configuration**:
    *   **Root Directory**: `/` (Leave empty or set to root).
    *   **Docker**: It should detect the `Dockerfile` in the root directory.

3.  **Build Arguments (CRITICAL)**:
    *   The frontend needs to know the backend URL *at build time*.
    *   Go to the **Build Args** section (usually under Advanced or Build settings).
    *   Add:
        *   **Name**: `VITE_API_URL`
        *   **Value**: The public URL of your backend (e.g., `https://backend-api.yourdomain.com`).
        *   *Note: Do not include a trailing slash.*

4.  **Network / Port**:
    *   Set the **Container Port** to `80`.
    *   Enable the **Public Domain** (e.g., `https://app.yourdomain.com`).

5.  **Deploy**:
    *   Click **Deploy**.

---

## 3. Verification

1.  Open your Frontend URL (`https://app.yourdomain.com`).
2.  Login with the seeded credentials:
    *   **Email**: `admin@example.com`
    *   **Password**: `password123`
3.  You should be redirected to the Dashboard.

## Troubleshooting

*   **Login Fails**: Check the Network tab in your browser's developer tools.
    *   If the request URL is `http://localhost:4000/...`, the `VITE_API_URL` build arg was not set correctly or the app wasn't rebuilt.
    *   If the request URL is correct but returns 500, check the Backend logs in Dokploy.
*   **Database Connection Error**: Ensure your Aiven IP filters allow connections from your Dokploy server IP, or are set to `0.0.0.0/0` (public).
