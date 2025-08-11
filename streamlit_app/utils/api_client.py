# =============================================================================
# API CLIENT - STREAMLIT CREDIT DECISION PLATFORM
# =============================================================================

import requests
import streamlit as st
from typing import Dict, Any, Optional
import json
from config import config

class APIClient:
    def __init__(self):
        self.base_url = config.API_BASE_URL
        self.timeout = config.API_TIMEOUT
        self.session = requests.Session()
        
    def _get_headers(self) -> Dict[str, str]:
        """Get headers with authentication token if available"""
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        # Add auth token if available
        if "api_token" in st.session_state:
            headers["Authorization"] = f"Bearer {st.session_state.api_token}"
            
        return headers
    
    def _make_request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make HTTP request to API"""
        url = f"{self.base_url}{endpoint}"
        headers = self._get_headers()

        try:
            response = self.session.request(
                method=method,
                url=url,
                headers=headers,
                timeout=self.timeout,
                **kwargs
            )

            # Handle different response types
            if response.headers.get('content-type', '').startswith('application/json'):
                return response.json()
            else:
                return {"data": response.text, "status_code": response.status_code}

        except requests.exceptions.RequestException as e:
            # Fallback to demo mode if API is not available
            st.info(f"🧪 Demo Mode: API not available, using simulated data")
            return self._get_demo_response(method, endpoint, **kwargs)
    
    def login(self, email: str, password: str) -> Dict[str, Any]:
        """Authenticate user"""
        return self._make_request(
            "POST", 
            "/api/auth/login",
            json={"email": email, "password": password}
        )
    
    def get_user_profile(self) -> Dict[str, Any]:
        """Get current user profile"""
        return self._make_request("GET", "/api/auth/me")
    
    def get_applications(self, page: int = 1, limit: int = 20, **filters) -> Dict[str, Any]:
        """Get credit applications with pagination and filters"""
        params = {"page": page, "limit": limit, **filters}
        return self._make_request("GET", "/api/credit/applications", params=params)
    
    def get_application(self, app_id: str) -> Dict[str, Any]:
        """Get specific application"""
        return self._make_request("GET", f"/api/credit/applications/{app_id}")
    
    def create_application(self, application_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create new credit application"""
        return self._make_request("POST", "/api/credit/applications", json=application_data)
    
    def get_risk_assessment(self, app_id: str) -> Dict[str, Any]:
        """Get risk assessment for application"""
        return self._make_request("GET", f"/api/credit/risk-assessment/{app_id}")
    
    def create_risk_assessment(self, app_id: str) -> Dict[str, Any]:
        """Create risk assessment"""
        return self._make_request("POST", "/api/credit/risk-assessment", json={"applicationId": app_id})
    
    def get_decision(self, app_id: str) -> Dict[str, Any]:
        """Get credit decision"""
        return self._make_request("GET", f"/api/credit/decisions/{app_id}")
    
    def make_decision(self, app_id: str, override_ai: bool = False) -> Dict[str, Any]:
        """Make credit decision"""
        return self._make_request(
            "POST", 
            "/api/credit/decisions",
            json={"applicationId": app_id, "overrideAI": override_ai}
        )
    
    def rag_query(self, query: str, collection: str = "credit_documents") -> Dict[str, Any]:
        """Query RAG system"""
        return self._make_request(
            "POST",
            "/api/ai/rag/query",
            json={"query": query, "collection": collection}
        )
    
    def rag_conversation(self, query: str, conversation_id: str, collection: str = "credit_documents") -> Dict[str, Any]:
        """Query RAG system with conversation context"""
        return self._make_request(
            "POST",
            "/api/ai/rag/conversation",
            json={
                "query": query, 
                "conversationId": conversation_id,
                "collection": collection
            }
        )
    
    def get_system_health(self) -> Dict[str, Any]:
        """Get system health status"""
        return self._make_request("GET", "/health")
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get system metrics"""
        return self._make_request("GET", "/metrics")

    def _get_demo_response(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Generate demo responses when API is not available"""
        import random
        from datetime import datetime, timedelta

        if endpoint == "/api/auth/login":
            return {
                "success": True,
                "data": {
                    "user": {
                        "id": "demo-user-123",
                        "email": kwargs.get("json", {}).get("email", "demo@example.com"),
                        "firstName": "Demo",
                        "lastName": "User",
                        "role": "ADMIN",
                        "permissions": ["*"]
                    },
                    "token": "demo-jwt-token-123",
                    "refreshToken": "demo-refresh-token-123",
                    "expiresAt": (datetime.now() + timedelta(hours=24)).isoformat()
                }
            }

        elif endpoint == "/api/auth/me":
            return {
                "success": True,
                "data": {
                    "id": "demo-user-123",
                    "email": "demo@example.com",
                    "firstName": "Demo",
                    "lastName": "User",
                    "role": "ADMIN",
                    "permissions": ["*"]
                }
            }

        elif endpoint == "/api/credit/applications":
            # Generate demo applications
            applications = []
            for i in range(20):
                applications.append({
                    "id": f"app-{i+1:03d}",
                    "applicationNumber": f"APP-20241201-{i+1:03d}",
                    "status": random.choice(["APPROVED", "DECLINED", "PENDING", "UNDER_REVIEW"]),
                    "requestedAmount": random.randint(10000, 100000),
                    "applicantName": f"Applicant {i+1}",
                    "submittedAt": (datetime.now() - timedelta(days=random.randint(0, 30))).isoformat(),
                    "creditScore": random.randint(600, 800)
                })

            return {
                "success": True,
                "data": {
                    "items": applications,
                    "pagination": {
                        "page": 1,
                        "limit": 20,
                        "total": 20,
                        "totalPages": 1
                    }
                }
            }

        elif endpoint == "/health":
            return {
                "success": True,
                "data": {
                    "status": "healthy",
                    "timestamp": datetime.now().isoformat(),
                    "services": {
                        "database": "healthy",
                        "redis": "healthy",
                        "ai": "demo"
                    }
                }
            }

        else:
            # Generic demo response
            return {
                "success": True,
                "data": {
                    "message": f"Demo response for {endpoint}",
                    "timestamp": datetime.now().isoformat(),
                    "demo_mode": True
                }
            }

# Global API client instance
api_client = APIClient()
