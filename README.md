# TheBlueMaroon
YTSM Version 1.0 Full MVP

# 🌐 Production Web App Tech Stack Overview

This section of the document outlines the core technologies, services, and environments used to build and deploy a scalable full-stack web application capable of handling **10,000+ concurrent users**.

## 🧩 Project Goal

Build a secure, cloud-native, scalable web application with:
- OAuth-based authentication
- Secure API endpoints (rate limiting, HTTPS)
- Managed infrastructure and CI/CD
- Modern UI with fast loading and responsive design
- Monitoring and logging tools integrated

---

## 🛠️ Stack Summary

| Layer          | Technology / Service                              | Purpose                                                   |
|----------------|---------------------------------------------------|-----------------------------------------------------------|
| **Frontend**   | [Vite](https://vitejs.dev/), [React](https://reactjs.org/), [TailwindCSS](https://tailwindcss.com/) | Fast modern frontend with utility-first CSS styling       |
| **Backend**    | [FastAPI](https://fastapi.tiangolo.com/) or [NestJS](https://nestjs.com/) | High-performance async API framework                     |
| **Database**   | [PostgreSQL](https://www.postgresql.org/) via Supabase or Render | Relational database with strong scalability               |
| **Auth**       | [Auth0](https://auth0.com/) or [Firebase Auth](https://firebase.google.com/products/auth) | OAuth2, Social Logins, Secure User Management             |
| **Hosting**    | [Vercel](https://vercel.com/) (frontend), [Render](https://render.com/) (backend) | Scalable deployment platform with CI/CD support           |
| **Security**   | [Cloudflare](https://www.cloudflare.com/)         | DNS management, HTTPS, WAF, DDoS protection               |
| **Monitoring** | [Sentry](https://sentry.io/)                      | Error and performance monitoring for frontend and backend |
| **Dev Tools**  | [Docker](https://www.docker.com/), GitHub, VS Code | Containerization, version control, and local dev          |

---

## 🔐 Security Features

- 🔑 **OAuth 2.0 Authentication** with Auth0
- 🛡️ **Rate Limiting** on API routes (e.g. `slowapi` or `express-rate-limit`)
- ☁️ **Cloudflare WAF** for DDoS protection and HTTPS
- 🔒 **Environment Variable Encryption** for secrets (via `.env` + Docker)

---

## 🧪 Basic Features for MVP

- Hello world homepage with React + Tailwind
- Login / Logout flow using Auth0
- Basic CRUD API for `Posts` (GET, POST, PUT, DELETE)
- PostgreSQL schema with example `users` and `posts` tables
- Deployed backend and frontend via Render and Vercel

---

## ⏱️ Estimated Setup Time (Solo Developer)

| Task Group         | Estimated Time |
|--------------------|----------------|
| Local Dev Setup    | 1.5 hrs        |
| Frontend Build     | 1–2 hrs        |
| Backend Build      | 1.5–2 hrs      |
| Auth Integration   | 1–2 hrs        |
| Database Setup     | 0.5–1 hr       |
| CI/CD Deployment   | 1 hr           |
| Security & WAF     | 1–1.5 hrs      |
| Monitoring Setup   | 1 hr           |
| **Total**          | **~7–10 hrs**  |

---

## 📁 Repository Structure (Example)

Project-Directory
├── backend/                         # FastAPI backend
│   ├── app/
│   │   ├── main.py                  # App entrypoint
│   │   ├── api/                     # All route definitions
│   │   │   ├── routes_auth.py
│   │   │   └── routes_posts.py
│   │   ├── core/                    # App configuration & Auth0 integration
│   │   │   ├── config.py
│   │   │   └── auth.py
│   │   ├── models/                  # Pydantic models & SQLAlchemy schemas
│   │   ├── db/                      # DB connection logic
│   │   │   ├── base.py
│   │   │   └── session.py
│   │   ├── services/                # Business logic
│   │   └── utils/                   # Helper functions
│   ├── tests/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env
├── frontend/                        # React + Vite frontend
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── auth/                    # Auth0 wrapper
│   │       ├── AuthProvider.tsx
│   │       └── useAuth.ts
│   ├── Dockerfile
│   ├── vite.config.ts
│   └── package.json
├── docker-compose.yml              # Multi-service dev setup
├── README.md
└── .env.example

---

## ✅ Accounts to Set Up

| Service        | Purpose                          | Link |
|----------------|----------------------------------|------|
| Vercel         | Frontend hosting + CI/CD         | [vercel.com](https://vercel.com/) |
| Render         | Backend hosting + DB             | [render.com](https://render.com/) |
| Auth0          | Authentication (OAuth2)          | [auth0.com](https://auth0.com/) |
| Cloudflare     | DNS + WAF + DDoS Protection       | [cloudflare.com](https://cloudflare.com/) |
| Supabase / DB  | PostgreSQL hosting (optional)    | [supabase.io](https://supabase.io/) |
| Sentry         | Monitoring and error logging     | [sentry.io](https://sentry.io/) |
| GitHub         | Version control + deployment     | [github.com](https://github.com/) |

---

## 🚀 Next Steps

- [x] Initialize frontend and backend boilerplate
- [x] Set up GitHub repo and push initial code
- [x] Create accounts for necessary services
- [ ] Deploy and test basic hello world app with CRUD
- [x] Add login flow with Auth0
- [x] Add log flow with Auth0
- [ ] Monitor traffic and error logs with Sentry

---

> **Note:** This setup is designed to scale and evolve — start simple, add complexity as needed (e.g., Redis caching, GraphQL APIs, serverless functions, etc.)

/

# Project Documentation

This document tracks the structure, contents, and development progress of each key file in the project. For every file, we document its purpose, key functions and classes, import dependencies, external services, known bugs, and future steps.

## Project TODO (Backend + Frontend)

| Priority | Area      | Task                                                                 | Status           |
|----------|-----------|----------------------------------------------------------------------|------------------|
| 🔥 High   | Backend   | Add unit tests for `verify_jwt` and route auth flows                 | ⬜ Not started |
| 🔥 High   | Frontend  | Add fallback for missing Auth0 env variables in `main.tsx`           | ⬜ Not started |
| 🔄 Medium | Backend   | Integrate Alembic with `asyncpg` and test SSL handling               | ⬜ Not started |
| 🔄 Medium | Frontend  | Improve loading UX in `ProtectedRoute` and `Dashboard`               | ⬜ Not started |
| 🔄 Medium | Backend   | Replace `Base.metadata.create_all()` with Alembic migrations         | ⬜ Not started |
| ✅ Low    | Frontend  | Implement dark-themed login with Toolpad + MUI                       | ✅ Complete    |
| 🔄 Medium | Backend   | Add error logging for failed JWT decode attempts                     | ⬜ Not started |
| 🔄 Medium | Frontend  | Expand dashboard with additional user or app-specific data           | ⬜ Not started |
| 🧪 Low    | Frontend  | Add support for multiple login providers in `Login.tsx`              | ⬜ Not started |
| 🧪 Low    | Backend   | Add a `/status` route to include DB and Auth0 connectivity checks    | ⬜ Not started |

---

## Backend

### `backend/main.py`

**Purpose**  
Acts as the main entry point for the FastAPI application. It initializes the app instance, includes route modules for authentication and health checks, and defines the root endpoint.

**Key Imports**  
- Internal:  
  - `from app.api.routes_health import router as health_router` — imports health-check related routes  
  - `from app.api.routes_auth import router as auth_router` — imports authentication-related routes  
- External:  
  - `from fastapi import FastAPI` — FastAPI framework for defining and serving the web API

**Functions & Classes**

- **Internal**
  - `root()` — a simple endpoint at `/` that returns a welcome message; used to confirm the API is running

- **External**
  - `FastAPI()` — instantiates the main FastAPI application object  
  - `app.include_router(auth_router)` — mounts the auth-related endpoints under their configured prefix  
  - `app.include_router(health_router)` — mounts the health-related endpoints under their configured prefix  

**Dependencies & Services**  
- Uses FastAPI as the main web framework  
- Depends on route modules defined in `app/api/routes_auth.py` and `app/api/routes_health.py`

**Known Issues / Bugs**  
- None currently noted

**Next Steps**  
- Add version prefixing for API routes (e.g., `/api/v1`)  
- Introduce middleware (e.g., for CORS, logging, or error handling)

**Major Updates**  
- `2025-05-05`: Initial file documented and API route structure established

### `backend/app/api/routes_auth.py`

**Purpose**  
Defines an authentication-related route for retrieving user information based on a validated JWT. This serves as a protected endpoint to test or expose identity data for authenticated users.

**Key Imports**  
- Internal:  
  - `from app.core.auth import verify_jwt` — imports the dependency function that validates and parses a JWT token  
- External:  
  - `from fastapi import APIRouter, Depends` — `APIRouter` is used to modularize routes; `Depends` injects the auth logic into the route

**Functions & Classes**

- **Internal**
  - `verify_jwt()` — dependency function used to validate the JWT and extract user payload from the token

- **External**
  - `APIRouter()` — creates a modular route group (`router`) to be mounted in `main.py`  
  - `@router.get("/me")` — registers a GET endpoint at `/me` that returns user identity fields  
  - `Depends()` — injects the verified JWT payload into the route handler function  

**Dependencies & Services**  
- Relies on FastAPI's dependency injection framework  
- Expects a working JWT verification function from `backend/app/core/auth.py`  
- Requires JWT tokens to be passed with requests (likely via `Authorization: Bearer <token>` header)

**Known Issues / Bugs**  
- [ ] No error handling is currently implemented if `verify_jwt` fails or returns incomplete payload

**Next Steps**  
- Add proper error response for unauthorized access (e.g., `HTTPException`)  
- Document the expected structure of the JWT payload  
- Consider returning a user model/schema (e.g., with `pydantic.BaseModel`)

**Major Updates**  
- `2025-05-05`: Initial route defined and documented


### `backend/app/api/routes_health.py`

**Purpose**  
Defines a simple health check endpoint to confirm that the API server is responsive. This is typically used by monitoring tools or load balancers to check application uptime.

**Key Imports**  
- Internal:  
  - None  
- External:  
  - `from fastapi import APIRouter` — used to modularize the route for clean inclusion in the main app

**Functions & Classes**

- **Internal**  
  - None  

- **External**
  - `APIRouter()` — creates a router object to define one or more related API endpoints  
  - `@router.get("/health")` — defines a GET endpoint at `/health` that returns a static JSON response  
  - `health_check()` — the function that returns `{ "status": "ok" }`, indicating service health  

**Dependencies & Services**  
- None — this is a self-contained route with no external services or dependencies

**Known Issues / Bugs**  
- None currently noted

**Next Steps**  
- Add timestamp or system status info (e.g., uptime, database status)  
- Optionally protect the endpoint from public access in production

**Major Updates**  
- `2025-05-05`: Health check route defined and documented

### `backend/app/core/auth.py`

**Purpose**  
Implements JWT-based authentication logic using Auth0. It verifies access tokens passed via HTTP headers, checks their signature using Auth0's JWKS, and decodes valid tokens to return the user payload. This is the core security logic backing any protected endpoints in the API.

**Key Imports**  
- Internal:  
  - None explicitly, but functions here are consumed in `routes_auth.py`  
- External:  
  - `from fastapi import Depends, HTTPException, status, Request` — FastAPI dependency injection and HTTP utilities  
  - `from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials` — handles bearer token parsing  
  - `from jose import jwt, JWTError` — for decoding and verifying JWTs  
  - `import requests` — used to fetch Auth0's public keys (JWKS)  
  - `import os`, `from dotenv import load_dotenv` — loads environment variables for Auth0 configuration

**Functions & Classes**

- **Internal**
  - `verify_jwt(token: str = Depends(get_token_auth_header)) -> dict` — validates and decodes the JWT using Auth0’s public key  
  - `get_token_auth_header(credentials: HTTPAuthorizationCredentials)` — extracts the token from the `Authorization` header and ensures it's a bearer token

- **External**
  - `load_dotenv()` — loads secrets like `AUTH0_DOMAIN` and `AUTH0_AUDIENCE` from a `.env` file  
  - `HTTPBearer()` — defines the expected auth scheme  
  - `requests.get(JWKS_URL)` — fetches Auth0's public key set (JWKS) to validate tokens  
  - `jwt.get_unverified_header()` and `jwt.decode()` — extract metadata from and validate the JWT  
  - `HTTPException(...)` — used to raise meaningful errors during any part of the validation process  

**Dependencies & Services**  
- Requires a `.env` file with `AUTH0_DOMAIN` and `AUTH0_AUDIENCE`  
- Connects to Auth0’s JWKS endpoint at `https://{AUTH0_DOMAIN}/.well-known/jwks.json`  
- Auth0-issued JWTs must follow RS256 algorithm with `kid`-based key discovery

**Known Issues / Bugs**  
- [ ] JWKS is fetched on import — may not auto-refresh if key rotation occurs  
- [ ] No caching or rate-limiting for JWKS fetch  
- [ ] Errors could be more granular (e.g., 403 for some token issues)

**Next Steps**  
- Add in-memory caching or periodic refresh for JWKS to avoid re-fetching  
- Expand to support scopes or roles from JWT claims  
- Write unit tests using mocked Auth0 responses

**Major Updates**  
- `2025-05-05`: Auth0 integration implemented and file documented

### `backend/app/core/config.py`

**Purpose**  
Provides centralized application configuration using environment variables and a `Settings` class. This file defines basic project metadata and runtime settings like environment type and version, allowing other modules to import a unified config object.

**Key Imports**  
- Internal:  
  - None (though `settings` is expected to be imported wherever config is needed)  
- External:  
  - `import os` — used to read environment variables  
  - `from dotenv import load_dotenv` — loads environment variables from a `.env` file at runtime

**Functions & Classes**

- **Internal**
  - `Settings` — a simple configuration class that stores environment variables and metadata such as `PROJECT_NAME`, `ENV_TYPE`, and `VERSION`  
  - `settings` — an instance of `Settings` that acts as a global config object

- **External**
  - `load_dotenv()` — loads values from a `.env` file into the environment  
  - `os.getenv(...)` — retrieves environment variables with optional defaults

**Dependencies & Services**  
- Depends on a valid `.env` file present in the project root  
- Used to configure runtime behavior for different environments (e.g., dev, prod)

**Known Issues / Bugs**  
- [ ] No validation for required env variables (e.g., missing `ENV_TYPE` still defaults silently)  
- [ ] Not yet extended to include secrets or service config (e.g., DB_URL, Auth0 keys)

**Next Steps**  
- Add support for database, cache, or external API config variables  
- Add Pydantic-based validation for stricter config management  
- Consider splitting settings by environment (e.g., `config_dev.py`, `config_prod.py`)

**Major Updates**  
- `2025-05-05`: Basic settings class defined and environment loading implemented

### `backend/app/db/init_db.py`

**Purpose**  
Initializes the project’s database schema by creating all tables defined in the SQLAlchemy models. This script is typically run once at application setup or during development to bootstrap the database schema using metadata from the `Base` model.

**Key Imports**  
- Internal:  
  - `from app.db.session import engine` — imports the asynchronous SQLAlchemy engine  
  - `from app.models.user import Base` — imports the declarative base which holds all table definitions  
- External:  
  - `import asyncio` — runs the async event loop to execute the DB creation task

**Functions & Classes**

- **Internal**
  - `init_db()` — asynchronous function that connects to the database and creates all tables defined in the model metadata (`Base.metadata`)  
  - `engine.begin()` — opens an asynchronous database transaction  
  - `Base.metadata.create_all()` — issues DDL commands to create the table schema

- **External**
  - `asyncio.run(init_db())` — runs the init function if this script is executed directly (e.g., `python init_db.py`)

**Dependencies & Services**  
- Requires the database connection to be defined in `backend/app/db/session.py`  
- Depends on ORM models declared under `backend/app/models/`, specifically `user.py`  
- The database must be reachable and configured properly via SQLAlchemy

**Known Issues / Bugs**  
- [ ] Only creates tables for models registered under `Base`; will silently skip others if not imported  
- [ ] No output or logging for success/failure states  
- [ ] Does not support Alembic migrations or schema versioning

**Next Steps**  
- Add logging output to confirm creation success  
- Integrate this logic into a startup script or CLI utility  
- Consider replacing with Alembic migration workflow for production use

**Major Updates**  
- `2025-05-05`: Asynchronous database initialization logic implemented and documented

### `backend/app/db/session.py`

**Purpose**  
Defines the asynchronous database engine and session factory used throughout the application. It configures a secure connection to the PostgreSQL database using environment variables and provides a reusable `get_db` dependency for FastAPI routes.

**Key Imports**  
- Internal:  
  - None directly, though `engine` and `get_db()` are expected to be used by other modules like `init_db.py` and route handlers  
- External:  
  - `from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession` — provides async DB engine and session classes  
  - `from sqlalchemy.orm import sessionmaker` — creates session factories  
  - `import os`, `from dotenv import load_dotenv` — handles environment variable loading  
  - `import ssl` — creates SSL context for secure DB connection

**Functions & Classes**

- **Internal**
  - `get_db()` — FastAPI-compatible dependency that yields an asynchronous session using a context manager

- **External**
  - `load_dotenv()` — loads environment configuration from a `.env` file  
  - `os.getenv("DATABASE_URL")` — fetches the DB connection string  
  - `create_async_engine()` — initializes the SQLAlchemy async engine  
  - `sessionmaker(..., class_=AsyncSession)` — creates a session factory bound to the async engine  
  - `ssl.create_default_context()` — sets up SSL context for secure DB communication

**Dependencies & Services**  
- Requires `DATABASE_URL` to be defined in `.env` (e.g., a PostgreSQL URL)  
- Sets up secure connection via SSL context  
- Provides a base engine used by database scripts (`init_db.py`) and FastAPI routes

**Known Issues / Bugs**  
- [ ] No connection retry or timeout configuration  
- [ ] No logging for connection success or failure  
- [ ] Assumes SSL context is compatible with target DB (can fail in local dev)

**Next Steps**  
- Parameterize `connect_args` to support non-SSL dev environments  
- Add connection health check or pooling configs  
- Add optional logging/debug settings based on `ENV_TYPE`

**Major Updates**  
- `2025-05-05`: Async SQLAlchemy session factory created with secure connection config

### `backend/app/models/user.py`

**Purpose**  
Defines the `User` model used to represent authenticated users in the database. This model is mapped to the `users` table via SQLAlchemy and stores basic identity information, including Auth0 ID, email, name, and login metadata.

**Key Imports**  
- Internal:  
  - None explicitly (though `Base` is reused by `init_db.py` and `session.py`)  
- External:  
  - `from sqlalchemy import Column, String, DateTime` — defines typed database columns  
  - `from sqlalchemy.ext.declarative import declarative_base` — creates the base class for ORM models  
  - `from datetime import datetime` — used to timestamp user creation by default

**Functions & Classes**

- **Internal**
  - `User(Base)` — a SQLAlchemy ORM model representing the `users` table. Includes fields like `id`, `email`, and `last_login`. The `id` corresponds to the Auth0 user’s `sub` claim.

- **External**
  - `Base = declarative_base()` — establishes a base class to register the ORM schema  
  - `Column(...)` — defines SQL table fields with optional constraints like `primary_key`, `unique`, `index`, and `default=datetime.now()`

**Dependencies & Services**  
- Used by the database initialization logic in `init_db.py`  
- Compatible with FastAPI + SQLAlchemy stack for user persistence  
- Assumes Auth0 provides `id`, `email`, `name`, and optionally `picture` during authentication

**Known Issues / Bugs**  
- [ ] `default=datetime.now()` may evaluate at import time instead of per-record insertion (should use `default=datetime.utcnow` or `default_factory`)  
- [ ] No foreign key or relationships defined (e.g., activity logs or roles)  
- [ ] No constraints on name/picture length or format

**Next Steps**  
- Convert to use `datetime.utcnow` to avoid static timestamp defaults  
- Consider adding an `updated_at` field with `onupdate=datetime.utcnow`  
- Define a `__repr__()` method for easier debugging/logging  
- Introduce Pydantic schema for input/output validation in API

**Major Updates**  
- `2025-05-05`: Initial user model defined for Auth0 identity integration

### `backend/alembic/env.py`

**Purpose**  
Configures Alembic to manage database schema migrations. This script sets up the migration context, loads project-specific settings and models, and executes migrations in either online (live DB) or offline (SQL script generation) mode. It connects to a PostgreSQL database using a synchronous SQLAlchemy engine.

**Key Imports**  
- Internal:  
  - `from app.models.user import Base, User` — imports the SQLAlchemy Base to register metadata for schema tracking  
- External:  
  - `from alembic import context` — manages Alembic migration environment  
  - `from sqlalchemy import create_engine, pool` — used to establish synchronous DB connection for migrations  
  - `from sqlalchemy.orm import declarative_base` — included but not used (Base is imported instead)  
  - `import os`, `from dotenv import load_dotenv` — loads `SYNC_DATABASE_URL` from environment  
  - `from logging.config import fileConfig` — loads logging config from Alembic ini file  
  - `import ssl` — defines SSL context for secure DB connections

**Functions & Classes**

- **Internal**
  - `run_migrations_offline()` — sets up Alembic to emit SQL without executing it (used rarely; not compatible with async engines)  
  - `run_migrations_online()` — connects to the database and runs schema migrations using the current model metadata  
  - `run()` — determines which mode to use (offline vs. online) and calls the appropriate migration function  
  - `target_metadata = Base.metadata` — the metadata used by Alembic to detect schema diffs

- **External**
  - `context.configure(...)` — passes DB and metadata info to Alembic  
  - `create_engine(SYNC_DATABASE_URL)` — establishes a synchronous engine for migration purposes  
  - `fileConfig(...)` — loads Alembic logging config for diagnostics  

**Dependencies & Services**  
- Requires a valid `.env` with `SYNC_DATABASE_URL` (synchronous version of your DB URL)  
- Depends on `Base.metadata` from `app.models.user` for autogeneration  
- Assumes Alembic config (`alembic.ini`) is present and properly configured

**Known Issues / Bugs**  
- [ ] Uses synchronous engine only — not directly aligned with app’s async DB logic  
- [ ] SSL context created but not applied to engine (could lead to mismatches in secure connections)  
- [ ] Doesn't explicitly handle multiple model modules (e.g., if more models are added later)

**Next Steps**  
- Ensure all model files are imported so Alembic can detect schema changes  
- Refactor to use `get_metadata()` pattern if project expands  
- Apply SSL context explicitly if needed for production migrations

**Major Updates**  
- `2025-05-05`: Alembic environment setup created and linked to app models


---

## Frontend

### Project Metadata

| Property                | Value / Notes                                                                  |
|-------------------------|--------------------------------------------------------------------------------|
| **Name**                | `frontend`                                                                     |
| **Version**             | `0.0.0`                                                                        |
| **Framework**           | [Vite](https://vitejs.dev/) + [React 19](https://react.dev/) + TypeScript      |
| **CSS / UI Frameworks** | Tailwind (via base project), Material UI 7.x (`@mui/material`), Emotion        |
| **Authentication**      | Auth0 via `@auth0/auth0-react`                                                 |
| **Routing**             | `react-router-dom` v7.5.1                                                      |
| **Tooling**             | [ESLint](https://eslint.org/), [Toolpad](https://mui.com/toolpad/), TypeScript |
| **Vite Plugins**        | `@vitejs/plugin-react-swc` for fast JSX transforms                             |
| **Lint Rules**          | Uses ESLint with `react-hooks`, `react-refresh`, `typescript-eslint`           |
| **TS Targets**          | App: `ES2020` + DOM<br>Node: `ES2022` + `ES2023` libs                          |
| **Strictness**          | TypeScript: strict mode on, unused local checks, fallthrough disallowed        |
| **Build Scripts**       | `vite`, `vite build`, `vite preview`, `tsc`, `eslint .`                        |
| **Entry Point**         | `frontend/src/main.tsx`                                                        |

---

### `frontend/src/main.tsx`

**Purpose**  
Bootstraps the React application and wraps the root component (`App`) in Auth0's authentication context provider. This file is responsible for setting up the initial render tree, including enabling React strict mode and injecting environment-specific Auth0 credentials into the app.

**Key Imports**  
- Internal:  
  - `import App from './App.tsx'` — main application component that handles routing, layout, and page rendering  
- External:  
  - `import { StrictMode } from 'react'` — enables development warnings and side-effect checks  
  - `import { createRoot } from 'react-dom/client'` — initializes the root render tree using the new concurrent-compatible API  
  - `import { Auth0Provider } from '@auth0/auth0-react'` — provides React context for authentication, token access, and protected routes  
  - `import.meta.env.*` — pulls project-specific environment variables defined in `.env` or `.env.local`

**Functions & Classes**

- **External**
  - `createRoot(...).render(...)` — mounts the React app to the DOM element with ID `root`  
  - `<StrictMode>` — React feature for development-time checks  
  - `<Auth0Provider>` — injects domain, clientId, audience, and redirect URI into the authentication context for use throughout the app  
  - `import.meta.env.VITE_AUTH0_DOMAIN` etc. — securely loads sensitive Auth0 config from environment variables during build/runtime

**Dependencies & Services**  
- Relies on `.env` file to define the following environment variables:
  - `VITE_AUTH0_DOMAIN`  
  - `VITE_AUTH0_CLIENT_ID`  
  - `VITE_AUTH0_AUDIENCE`  
- Uses Auth0 for authentication across the app via the `@auth0/auth0-react` SDK

**Known Issues / Bugs**  
- [ ] No fallback or error handling if required `import.meta.env.*` variables are missing  
- [ ] `!` non-null assertions assume variables are defined — could cause runtime crash if omitted

**Next Steps**  
- Add runtime checks to warn if Auth0 environment variables are undefined  
- Consider moving the Auth0Provider config to a dedicated wrapper component (e.g., `AuthProvider.tsx`) for clarity and reuse  
- Integrate Auth0's token renewal and error boundary handling

**Major Updates**  
- `2025-05-05`: Initial app mount logic and Auth0 integration implemented

### `frontend/src/App.tsx`

**Purpose**  
Defines the core routing structure of the frontend using React Router. It sets up both public and protected routes, wrapping protected pages in an Auth0-aware guard component. The app currently consists of a public login page (`/`) and a protected dashboard page (`/dashboard`).

**Key Imports**  
- Internal:  
  - `import OAuthSignInPage from './components/Login'` — renders the sign-in interface at the root route  
  - `import Dashboard from './components/Dashboard'` — main user view shown after authentication  
- External:  
  - `import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'` — provides client-side routing and route protection  
  - `import { useAuth0 } from '@auth0/auth0-react'` — provides access to the user’s authentication state, loading status, and login functions

**Functions & Classes**

- **Internal**
  - `ProtectedRoute({ children })` — a wrapper component that:
    - Displays a loading message while Auth0 checks authentication  
    - Redirects to `/` if the user is not authenticated  
    - Renders the protected child component otherwise  
  - `App()` — the main component that:
    - Wraps the app in a `<Router>`  
    - Defines two routes:
      - `/` → public login screen
      - `/dashboard` → protected dashboard, only accessible via `ProtectedRoute`

- **External**
  - `useAuth0()` — used to check `isAuthenticated` and `isLoading` in real time  
  - `<Navigate to="/" replace />` — redirects unauthenticated users to the home page  
  - `<Routes>` and `<Route>` — define how different components are rendered based on the URL path

**Dependencies & Services**  
- Uses `react-router-dom` for navigation and route protection  
- Depends on `@auth0/auth0-react` to manage session state  
- Assumes Auth0Provider is wrapping this app (as configured in `main.tsx`)

**Known Issues / Bugs**  
- [ ] No error boundary for failed authentication or expired sessions  
- [ ] Minimal loading UX (e.g., only a `<p>Loading...</p>`)  
- [ ] Redirect always targets `/` — may not preserve original destination

**Next Steps**  
- Add a loading spinner or skeleton UI while checking auth status  
- Store intended destination before redirect and navigate post-login  
- Refactor `ProtectedRoute` into a reusable wrapper (e.g., `withAuthGuard()` HOC)

**Major Updates**  
- `2025-05-05`: Initial app routing and route protection logic implemented

### `frontend/src/components/Dashboard.tsx`

**Purpose**  
Renders the authenticated user’s dashboard, displaying basic profile information (name, email, avatar) and a logout button. This component is protected by route guards and only accessible to signed-in users via `/dashboard`.

**Key Imports**  
- Internal:  
  - None  
- External:  
  - `useAuth0` from `@auth0/auth0-react` — provides access to the current authenticated user object and logout method  
  - `Box`, `Typography`, `Avatar`, `Button` from `@mui/material` — Material UI components for layout and styling

**Functions & Classes**

- **Internal**
  - `Dashboard()` — displays the authenticated user’s avatar, name, email, and a logout button. Leverages Material UI’s layout system for visual structure.

- **External**
  - `useAuth0()` — accesses `user` and `logout()`  
  - `logout({ returnTo: window.location.origin })` — logs out the user and redirects to the app’s root  
  - `<Avatar>`, `<Typography>`, `<Button>` — styled components from MUI used for visual presentation and interaction

**Dependencies & Services**  
- Relies on Auth0 React SDK (`@auth0/auth0-react`) for user authentication and logout  
- Styled using Material UI (`@mui/material`)  
- Expects to be accessed via a protected route (`/dashboard`) wrapped in `ProtectedRoute`

**Known Issues / Bugs**  
- [ ] No error handling if `user` is null (should never happen with route guard but not guaranteed)  
- [ ] No fallback avatar or loading state  
- [ ] Minimal visual customization beyond default MUI appearance

**Next Steps**  
- Add a loading skeleton or fallback UI in case `user` is undefined  
- Customize MUI theme or replace with Tailwind if standardization is desired  
- Extend the dashboard to show additional authenticated features or app-specific data

**Major Updates**  
- `2025-05-05`: Initial user dashboard component implemented and styled with MUI

### `frontend/src/components/Login.tsx`

**Purpose**  
Renders the OAuth login page using the `@toolpad/core` UI components for authentication, wrapped in a custom MUI dark theme. It leverages Auth0 for login, and redirects authenticated users to the dashboard.

**Key Imports**  
- Internal:  
  - `import darkTheme from '../css-styles/darkTheme'` — applies a custom Material UI theme to style the login page  
- External:  
  - `@toolpad/core/AppProvider` — provides theming and layout context for Toolpad components  
  - `@toolpad/core/SignInPage`, `AuthProvider`, `AuthResponse` — used to render the login form and handle provider-based auth  
  - `@mui/material/Box` — used for layout and styling  
  - `useAuth0` from `@auth0/auth0-react` — triggers login and checks authentication state  
  - `useNavigate` from `react-router-dom` — used for client-side redirects  
  - `useEffect` from `react` — monitors `isAuthenticated` to redirect on login

**Functions & Classes**

- **Internal**
  - `OAuthSignInPage()` — the main exported component that:
    - Presents a centered login form styled with MUI and Toolpad  
    - Calls `loginWithRedirect()` to begin the Auth0 login flow  
    - Uses `useEffect()` to redirect users to `/dashboard` after successful login

- **External**
  - `signIn()` — async handler compatible with Toolpad’s `SignInPage`, delegates to Auth0’s `loginWithRedirect()`  
  - `<AppProvider theme={darkTheme}>` — applies the custom dark theme  
  - `<SignInPage signIn={signIn} providers={...} />` — renders the Toolpad-provided OAuth form with a labeled Auth0 button  
  - `useNavigate()` — redirects the user after login  
  - `useAuth0()` — checks `isAuthenticated` and initiates the login redirect

**Dependencies & Services**  
- Uses Auth0 for authentication via `@auth0/auth0-react`  
- Renders a themed login page using `@toolpad/core` components  
- Redirects authenticated users to `/dashboard`  
- Depends on custom theme styling from `../css-styles/darkTheme`

**Known Issues / Bugs**  
- [ ] Returns empty object from `signIn()` (acceptable but not meaningful)  
- [ ] Minimal error handling for failed login attempts  
- [ ] Only a single login provider is shown, but could be made dynamic

**Next Steps**  
- Expand `signIn()` to support additional error handling and logging  
- Support multiple providers (e.g., GitHub, Google) if needed  
- Add branding and accessibility features to match the broader UI design

**Major Updates**  
- `2025-05-05`: OAuth login screen implemented using Toolpad and Auth0

