# =============================================================================
# STREAMLIT CONFIGURATION - CREDIT DECISION LLM RAG PLATFORM
# =============================================================================

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    # API Configuration
    API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:3001")
    API_TIMEOUT = int(os.getenv("API_TIMEOUT", "30"))
    
    # OpenAI Configuration
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    
    # Database Configuration
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/credit_decision_db")
    
    # Redis Configuration
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    # ChromaDB Configuration
    CHROMADB_URL = os.getenv("CHROMADB_URL", "http://localhost:8000")
    
    # Streamlit Configuration
    STREAMLIT_SERVER_PORT = int(os.getenv("STREAMLIT_SERVER_PORT", "8501"))
    STREAMLIT_SERVER_ADDRESS = os.getenv("STREAMLIT_SERVER_ADDRESS", "0.0.0.0")
    
    # Theme Configuration
    STREAMLIT_THEME_PRIMARY_COLOR = os.getenv("STREAMLIT_THEME_PRIMARY_COLOR", "#1f77b4")
    STREAMLIT_THEME_BACKGROUND_COLOR = os.getenv("STREAMLIT_THEME_BACKGROUND_COLOR", "#ffffff")
    STREAMLIT_THEME_SECONDARY_BACKGROUND_COLOR = os.getenv("STREAMLIT_THEME_SECONDARY_BACKGROUND_COLOR", "#f0f2f6")
    
    # Application Configuration
    APP_TITLE = "Credit Decision Analytics Platform"
    APP_ICON = "🏦"
    
    # Default credentials for demo
    DEMO_CREDENTIALS = {
        "admin": {
            "email": "admin@creditdecision.com",
            "password": "admin123",
            "name": "Admin User",
            "role": "ADMIN"
        },
        "analyst": {
            "email": "analyst@creditdecision.com", 
            "password": "analyst123",
            "name": "Credit Analyst",
            "role": "CREDIT_ANALYST"
        }
    }

# Global config instance
config = Config()
