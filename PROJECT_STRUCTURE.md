# Project Structure Analysis

## Overview
This is a full-stack map-based application organized into infrastructure, backend API, and frontend UI layers.

- Runtime style: JavaScript monorepo-like setup with separate `backend` and `frontend` packages
- Backend: Node.js + Express + Prisma + JWT/Auth middleware
- Frontend: React + Vite + Tailwind
- Infra: Docker Compose + Nginx + SQL init scripts

## Top-Level Structure
```text
.
|-- .playwright-mcp
|   \-- console-2026-02-11T06-42-47-785Z.log
|-- .qodo
|   |-- agents
|   \-- workflows
|-- backend
|   |-- config
|   |   |-- atozasAuth.js
|   |   |-- database.js
|   |   \-- passport.js
|   |-- controllers
|   |   \-- authController.js
|   |-- middleware
|   |   |-- auth.js
|   |   |-- cache.js
|   |   |-- rateLimit.js
|   |   \-- socketAuth.js
|   |-- prisma
|   |   |-- migrations
|   |   |   |-- 20260209072357_init
|   |   |   |   \-- migration.sql
|   |   |   |-- 20260306063102_add_place_model
|   |   |   |   \-- migration.sql
|   |   |   |-- 20260317000000_add_place_translation_columns
|   |   |   |   \-- migration.sql
|   |   |   \-- migration_lock.toml
|   |   |-- add-place-source-column.sql
|   |   |-- add-place-table.sql
|   |   |-- add-place-translation-columns.sql
|   |   |-- add-place-user-fields.sql
|   |   |-- add-reviews-photos.sql
|   |   |-- add-user-picture.sql
|   |   \-- schema.prisma
|   |-- routes
|   |   |-- atozasAuthRoutes.js
|   |   |-- authRoutes.js
|   |   |-- mapRoutes.js
|   |   |-- testRoutes.js
|   |   \-- vehicleRoutes.js
|   |-- scripts
|   |-- services
|   |   \-- translateService.js
|   |-- utils
|   |   \-- jwt.js
|   |-- .env
|   |-- .env.production.example
|   |-- Dockerfile
|   |-- env.example.txt
|   |-- package.json
|   \-- server.js
|-- frontend
|   |-- src
|   |   |-- components
|   |   |   |-- AddPlaceMethodModal.jsx
|   |   |   |-- AddPlaceModal.jsx
|   |   |   |-- ErrorBoundary.jsx
|   |   |   |-- MapComponent.jsx
|   |   |   |-- PlaceDetailPanel.jsx
|   |   |   |-- ProtectedRoute.jsx
|   |   |   |-- RoutePanel.jsx
|   |   |   \-- SearchBar.jsx
|   |   |-- contexts
|   |   |   |-- AtozasAuthContext.jsx
|   |   |   |-- AuthContext.jsx
|   |   |   \-- SocketContext.jsx
|   |   |-- hooks
|   |   |   \-- useAtozasAuth.js
|   |   |-- lib
|   |   |   \-- atozas-auth-kit.jsx
|   |   |-- pages
|   |   |   |-- HomePage.jsx
|   |   |   |-- LandingPage.jsx
|   |   |   |-- LoginPage.jsx
|   |   |   |-- LoginPageAtozas.jsx
|   |   |   |-- OTPVerificationPage.jsx
|   |   |   \-- RegisterPage.jsx
|   |   |-- services
|   |   |   \-- api.js
|   |   |-- utils
|   |   |   |-- formatAddress.js
|   |   |   \-- parseSearchQuery.js
|   |   |-- App.jsx
|   |   |-- index.css
|   |   \-- main.jsx
|   |-- .env
|   |-- .env.development
|   |-- .env.production
|   |-- index.html
|   |-- package.json
|   |-- postcss.config.js
|   |-- tailwind.config.js
|   \-- vite.config.js
|-- nginx
|   \-- nginx.conf
|-- .gitignore
|-- docker-compose.yml
|-- init-db.sql
|-- package.json
|-- package-lock.json
|-- README.md
\-- tileserver-config.json
```

## Layer-Wise Analysis

### 1) Infrastructure Layer
- `docker-compose.yml`: Orchestrates multi-service environment
- `nginx/nginx.conf`: Reverse proxy/static routing
- `init-db.sql`: Initial DB setup SQL
- `tileserver-config.json`: Map tile server settings

### 2) Backend Layer (`backend`)
- `server.js`: API app bootstrap
- `routes/`: Route definitions by domain (auth/map/vehicle/test)
- `controllers/`: Request handling logic
- `middleware/`: Cross-cutting concerns (auth, cache, rate limit, socket auth)
- `config/`: DB and auth strategy wiring
- `services/`: Business/service integrations (translation service)
- `prisma/`: Data model and migrations

### 3) Frontend Layer (`frontend`)
- `src/main.jsx`, `src/App.jsx`: App entry and shell
- `src/pages/`: Page-level views
- `src/components/`: Reusable UI components
- `src/contexts/`: Global app state/auth/socket contexts
- `src/services/api.js`: HTTP communication layer
- `src/utils/`: Parsing and formatting helpers

## Notes
- Dependency folders such as `node_modules` and generated output folders were excluded from the tree for readability.
- `.env` files exist in both frontend and backend; these should be environment-specific and not committed with sensitive values.
