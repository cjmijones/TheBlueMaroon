import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME: str = "My FastAPI App"
    ENV_TYPE: str = os.getenv("ENV_TYPE", "dev")
    VERSION: str = "0.1.0"

settings = Settings()
