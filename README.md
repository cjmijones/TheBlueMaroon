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


---

## Frontend

### `frontend/path/to/file.jsx`

**Purpose**  
_(What UI/logic is handled here?)_

**Components & Hooks**  
- `Navbar()` — renders site navigation  
- `useAuth()` — manages Auth0 session state

**Key Imports**  
- Internal:  
  - `import { useAuth } from '../hooks/useAuth'`  
- External:  
  - `import React`, `import axios`

**Dependencies & Services**  
- _(e.g., Auth0, REST API endpoints, third-party analytics, etc.)_

**Known Issues / Bugs**  
- [ ] Scroll lock breaks on mobile  
- [ ] Axios request sometimes fails on refresh

**Next Steps**  
- Add loading spinner  
- Extract styles to separate file

**Major Updates**  
- `YYYY-MM-DD`: Initial component written  
- `YYYY-MM-DD`: UI bug fixed

---
