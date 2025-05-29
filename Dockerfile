############ 1️⃣  Build the React app ############
FROM node:20-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps
COPY frontend/ .
RUN npm run build        # dist/ (or build/) is produced here

############ 2️⃣  Build the FastAPI backend ############
FROM python:3.12-slim AS backend-build
WORKDIR /app

#-- install Python deps early to leverage Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

#-- copy backend source
COPY backend/app ./app

#-- pull in the compiled SPA from the previous stage
COPY --from=frontend-build /frontend/dist ./frontend/dist

#-- tell Uvicorn to expose the API
ENV PYTHONUNBUFFERED=1
EXPOSE 8000
# CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--log-level", "debug"]
