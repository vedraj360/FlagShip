# FlagShip - Open Source Feature Flag Management

FlagShip is a high-performance, self-hostable feature flag management system designed for speed, security, and simplicity. It provides a real-time dashboard for managing feature toggles and a lightning-fast SDK endpoint for your applications.

![Dashboard Preview](https://via.placeholder.com/800x400?text=FlagShip+Dashboard+Preview)

## 🚀 Features

-   **Real-time Dashboard**: Create, update, and delete feature flags instantly.
-   **High Performance**:
    -   **In-Memory Caching**: SDK endpoints serve flags from server memory (RAM) for sub-millisecond response times.
    -   **Smart Invalidation**: Cache is automatically invalidated and refreshed only when flags change.
    -   **Optimistic UI**: Dashboard updates instantly without waiting for network round-trips.
-   **Secure by Design**:
    -   **JWT Authentication**: Secure access and refresh token rotation.
    -   **Rate Limiting**: Brute-force protection on auth endpoints.
    -   **CSRF Protection**: Strict SameSite cookie policies.
    -   **Input Validation**: Strict Zod schemas and JSON validation.
-   **Developer Friendly**:
    -   **JSON Import**: Bulk import flags via JSON paste or file upload.
    -   **Type Support**: Supports Boolean, String, Number, and JSON flag types.
    -   **Simple SDK**: REST API based SDK that works with any language.

## 🛠️ Tech Stack

-   **Frontend**: React, Vite, TailwindCSS
-   **Backend**: Node.js, Express, TypeScript
-   **Database**: PostgreSQL (via Prisma ORM)
-   **Security**: Helmet, Rate-Limit, BCrypt, JWT

## 🏁 Getting Started

### Prerequisites

-   Node.js (v18+)
-   PostgreSQL Database

### 1. Clone the Repository

```bash
git clone https://github.com/vedraj360/flagship.git
cd flagship
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure Environment Variables
cp .env.example .env
# Edit .env and add your DATABASE_URL and generate strong JWT secrets

# Run Database Migrations
npx prisma migrate dev --name init

# Seed Database (Optional - creates admin@example.com / password123)
npm run seed

# Start Server
npm run dev
```

### 3. Frontend Setup

```bash
cd .. # Go back to root

# Install dependencies
npm install

# Start Development Server
npm run dev
```

Visit `http://localhost:5173` to access the dashboard.

## 🔒 Environment Variables

Create a `.env` file in the `backend` directory:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/flagship"
JWT_ACCESS_SECRET="your-super-secret-access-key-at-least-32-chars"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-at-least-32-chars"
PORT=3000
```

> **Security Note**: Never commit your `.env` file. The application will fail to start if JWT secrets are not set.

## � Deployment (Dokploy)

FlagShip is ready to be deployed on **Dokploy** (or any Docker-based platform).

1.  **Create a New Application** in Dokploy.
2.  **Connect your GitHub Repository**.
3.  **Configure Build Settings**:
    *   **Dockerfile Path**: `./Dockerfile` (This Dockerfile builds both frontend and backend).
    *   **Build Context**: `/`
4.  **Environment Variables**:
    Add the following variables in the "Environment" tab:
    *   `DATABASE_URL`: Your PostgreSQL connection string.
    *   `JWT_ACCESS_SECRET`: A strong random string.
    *   `JWT_REFRESH_SECRET`: A strong random string.
    *   `PORT`: `3000` (Internal container port).
5.  **Deploy**: Click "Deploy" and wait for the build to finish.
6.  **Domain**: Map your domain (e.g., `flagship.yourdomain.com`) to the application port `3000`.

The Dockerfile handles building the React frontend and serving it statically via the Node.js backend, so you only need to deploy a single container!

## �📚 API Documentation

### SDK Endpoint (Public)

**GET** `/sdk/:clientKey/flags`

Returns all enabled flags for the application.

```json
[
  {
    "key": "new_feature",
    "enabled": true,
    "value": "v2.0",
    "type": "STRING"
  }
]
```

### Management API (Private)

-   **POST** `/auth/login`: Authenticate user
-   **GET** `/applications`: List applications
-   **POST** `/applications/:id/flags`: Create a flag

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a pull request.

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.
