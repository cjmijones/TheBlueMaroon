import pandas as pd

# Define the setup checklist data
setup_data = [
    # Frontend
    ["Frontend", "Vite + React + Tailwind", "Initialize frontend project with Vite and TailwindCSS", "No", "Yes", 1, "Run `npm create vite@latest`, install Tailwind"],
    ["Frontend", "Vercel", "Create Vercel account and connect GitHub repo for frontend", "Yes", "No", 0.5, "https://vercel.com/"],
    
    # Backend
    ["Backend", "FastAPI", "Initialize FastAPI project with virtual environment", "No", "Yes", 1, "Install FastAPI + uvicorn in a virtualenv"],
    ["Backend", "Render", "Create Render account and set up backend deploy pipeline", "Yes", "No", 0.5, "https://render.com/"],
    
    # Database
    ["Database", "PostgreSQL (Render/Supabase)", "Provision managed Postgres instance", "Yes", "No", 0.5, "Can use Supabase or Render DB"],
    ["Database", "Prisma or SQLAlchemy", "Install ORM and connect to DB", "No", "Yes", 0.5, "Depends on Python or Node backend"],
    
    # Auth
    ["Authentication", "Auth0", "Create Auth0 account and set up OAuth app", "Yes", "No", 1, "https://auth0.com/"],
    ["Authentication", "Auth0 SDK", "Install and configure SDK in frontend and backend", "No", "Yes", 1, "Depends on frontend/backend stack"],
    
    # Security
    ["Security", "Cloudflare", "Create Cloudflare account and set up DNS + DDoS protection", "Yes", "No", 1, "https://cloudflare.com/"],
    ["Security", "Rate limiting middleware", "Install and configure rate limiting in backend", "No", "Yes", 0.5, "e.g., `slowapi` for FastAPI or `express-rate-limit`"],
    
    # Infra
    ["Infrastructure", "Docker", "Set up Docker for backend service", "No", "Yes", 1, "Write Dockerfile + docker-compose for local dev"],
    ["Infrastructure", "GitHub", "Initialize GitHub repo and connect CI/CD pipelines", "Yes", "No", 0.5, "Link to Vercel or Render"],
    
    # Monitoring
    ["Monitoring", "Sentry", "Create Sentry account and connect frontend + backend", "Yes", "Yes", 1, "https://sentry.io/"],
]

# Create the DataFrame
setup_df = pd.DataFrame(setup_data, columns=[
    "Category", "Service/Tool", "Setup Task", "Account Needed?", "Install Required?", "Estimated Time (hrs)", "Notes"
])

# Save the DataFrame to a CSV file
setup_df.to_csv('tech_stack_setup.csv', index=False)
