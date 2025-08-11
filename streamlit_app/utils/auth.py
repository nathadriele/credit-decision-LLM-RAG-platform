# =============================================================================
# AUTHENTICATION UTILITIES - STREAMLIT CREDIT DECISION PLATFORM
# =============================================================================

import streamlit as st
from typing import Optional, Dict, Any
import re
import time
from utils.api_client import api_client
from config import config

def validate_email(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password: str) -> tuple[bool, str]:
    """Validate password strength"""
    if len(password) < 6:
        return False, "Password must be at least 6 characters long"
    return True, ""

def check_authentication() -> bool:
    """Check if user is authenticated"""
    return "api_token" in st.session_state and "user_data" in st.session_state

def login_user(email: str, password: str) -> bool:
    """Login user and store session data"""
    try:
        # Try API login first
        response = api_client.login(email, password)
        
        if response.get("success") and "data" in response:
            # Store authentication data
            st.session_state.api_token = response["data"]["token"]
            st.session_state.user_data = response["data"]["user"]
            st.session_state.login_time = response["data"].get("expiresAt")
            return True
        else:
            # Fallback to demo credentials for testing
            demo_user = None
            for user_key, user_data in config.DEMO_CREDENTIALS.items():
                if user_data["email"] == email and user_data["password"] == password:
                    demo_user = user_data
                    break
            
            if demo_user:
                # Create mock session for demo
                st.session_state.api_token = f"demo_token_{user_key}"
                st.session_state.user_data = {
                    "id": f"demo_{user_key}",
                    "email": demo_user["email"],
                    "firstName": demo_user["name"].split()[0],
                    "lastName": demo_user["name"].split()[-1],
                    "role": demo_user["role"],
                    "permissions": ["*"] if demo_user["role"] == "ADMIN" else ["applications:view", "decisions:make"]
                }
                st.session_state.demo_mode = True
                return True
            
        return False
        
    except Exception as e:
        st.error(f"Login error: {str(e)}")
        return False

def logout_user():
    """Logout user and clear session"""
    # Clear all session state
    for key in list(st.session_state.keys()):
        del st.session_state[key]
    
    # Force rerun to refresh the app
    st.rerun()

def get_current_user() -> Optional[Dict[str, Any]]:
    """Get current user data"""
    return st.session_state.get("user_data")

def has_permission(permission: str) -> bool:
    """Check if current user has specific permission"""
    user_data = get_current_user()
    if not user_data:
        return False
    
    permissions = user_data.get("permissions", [])
    return "*" in permissions or permission in permissions

def require_auth(func):
    """Decorator to require authentication"""
    def wrapper(*args, **kwargs):
        if not check_authentication():
            show_login_form()
            return None
        return func(*args, **kwargs)
    return wrapper

def show_login_form():
    """Display modern login form with gradient background"""

    # Hide sidebar and main menu for login page
    st.markdown("""
        <style>
        /* Hide sidebar */
        .css-1d391kg {display: none}
        .css-1rs6os {display: none}
        .css-17eq0hr {display: none}

        /* Hide main menu and header completely on login page */
        #MainMenu {visibility: hidden !important;}
        header {visibility: hidden !important;}
        footer {visibility: hidden !important;}
        .stDeployButton {display: none !important;}
        .stDecoration {display: none !important;}
        .stToolbar {display: none !important;}

        /* Full screen gradient background */
        .stApp {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }

        /* Login container styling - REMOVED WHITE BACKGROUND */
        .login-container {
            background: transparent;
            backdrop-filter: none;
            border-radius: 0;
            padding: 3rem 2rem;
            box-shadow: none;
            border: none;
            max-width: 400px;
            margin: 0 auto;
            margin-top: 10vh;
        }

        /* Logo and title styling */
        .login-header {
            text-align: center;
            margin-bottom: 2rem;
        }

        .login-logo {
            font-size: 3rem;
            margin-bottom: 1rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .login-title {
            color: #ffffff !important;
            font-size: 2.2rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
            text-align: center;
        }

        .login-subtitle {
            color: #f8f9fa !important;
            font-size: 1rem;
            font-weight: 400;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }

        /* Form styling */
        .stTextInput > div > div > input {
            border-radius: 12px;
            border: 2px solid #e1e8ed;
            padding: 0.75rem 1rem;
            font-size: 1rem;
            transition: all 0.3s ease;
            background: rgba(255, 255, 255, 0.95);
            color: #2c3e50;
        }

        .stTextInput > div > div > input:focus {
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            outline: none;
        }

        .stTextInput > div > div > input::placeholder {
            color: #7f8c8d;
            opacity: 0.8;
        }

        /* Button styling */
        .stButton > button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 12px;
            padding: 0.75rem 2rem;
            font-size: 1rem;
            font-weight: 600;
            transition: all 0.3s ease;
            width: 100%;
            margin-top: 1rem;
        }

        .stButton > button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
        }

        /* Error message styling */
        .stAlert {
            border-radius: 12px;
            border: none;
            margin-top: 1rem;
        }

        /* Loading spinner */
        .stSpinner {
            text-align: center;
            margin: 1rem 0;
        }

        /* Footer - HIGH CONTRAST */
        .login-footer {
            text-align: center;
            margin-top: 2rem;
            color: #e8e8e8 !important;
            font-size: 0.9rem;
        }

        .login-footer p {
            color: #e8e8e8 !important;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }

        /* Labels and text styling - HIGH CONTRAST */
        .stTextInput label {
            font-weight: 600;
            color: #ffffff !important;
            margin-bottom: 0.5rem;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }

        .stCheckbox label {
            color: #ffffff !important;
            font-size: 0.9rem;
            font-weight: 500;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }

        /* Help text styling */
        .stTextInput .help {
            color: #e8e8e8 !important;
            font-size: 0.85rem;
        }

        /* Form container text */
        .login-container label {
            color: #2c3e50 !important;
            text-shadow: none !important;
        }

        .login-container .stCheckbox label {
            color: #2c3e50 !important;
            text-shadow: none !important;
        }

        /* Focus indicators */
        .stButton > button:focus {
            outline: 2px solid #667eea;
            outline-offset: 2px;
        }

        /* Loading state */
        .stSpinner > div {
            border-color: #667eea !important;
        }

        /* Expander styling - HIGH CONTRAST */
        .streamlit-expanderHeader {
            color: #ffffff !important;
            font-weight: 500;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }

        .streamlit-expanderContent {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            padding: 1rem;
            margin-top: 0.5rem;
        }

        /* Info and error messages */
        .stAlert {
            border-radius: 8px;
        }

        .stInfo {
            background: rgba(52, 152, 219, 0.1);
            border-left: 4px solid #3498db;
        }

        .stError {
            background: rgba(231, 76, 60, 0.1);
            border-left: 4px solid #e74c3c;
        }

        /* Responsive design */
        @media (max-width: 768px) {
            .login-container {
                margin: 5vh 1rem;
                padding: 2rem 1.5rem;
                border-radius: 15px;
            }

            .login-logo {
                font-size: 2.5rem;
            }

            .login-title {
                font-size: 1.5rem;
            }
        }

        @media (max-width: 480px) {
            .login-container {
                margin: 2vh 0.5rem;
                padding: 1.5rem 1rem;
            }

            .login-logo {
                font-size: 2rem;
            }

            .login-title {
                font-size: 1.3rem;
            }
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
            .login-container {
                background: rgba(30, 30, 30, 0.95);
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .login-title {
                color: #ffffff;
            }

            .login-subtitle {
                color: #b0b0b0;
            }

            .stTextInput > div > div > input {
                background: rgba(40, 40, 40, 0.9);
                color: #ffffff;
                border-color: #404040;
            }
        }
        </style>
    """, unsafe_allow_html=True)

    # Login container
    st.markdown('<div class="login-container">', unsafe_allow_html=True)

    # Header with logo and title
    st.markdown("""
        <div class="login-header">
            <div class="login-title">Credit Decision Analytics</div>
            <div class="login-subtitle">Secure access to your analytics platform</div>
        </div>
    """, unsafe_allow_html=True)

    # Login form
    with st.form("login_form", clear_on_submit=False):
        email = st.text_input(
            "Email Address",
            placeholder="Enter your email address",
            help="Use your corporate email address",
            key="login_email"
        )

        password = st.text_input(
            "Password",
            type="password",
            placeholder="Enter your password",
            help="Enter your secure password",
            key="login_password"
        )

        # Remember me option
        remember_me = st.checkbox("Remember me for 30 days", key="remember_me")

        submitted = st.form_submit_button("Sign In", use_container_width=True)

        if submitted:
            # Validation
            validation_errors = []

            if not email:
                validation_errors.append("Email address is required")
            elif not validate_email(email):
                validation_errors.append("Please enter a valid email address")

            if not password:
                validation_errors.append("Password is required")
            else:
                is_valid, error_msg = validate_password(password)
                if not is_valid:
                    validation_errors.append(error_msg)

            if validation_errors:
                for error in validation_errors:
                    st.error(f"⚠️ {error}")
            else:
                with st.spinner("🔐 Authenticating your credentials..."):
                    # Add small delay for better UX
                    time.sleep(1)

                    if login_user(email, password):
                        st.success("✅ Authentication successful! Redirecting...")
                        # Store remember me preference
                        if remember_me:
                            st.session_state.remember_me = True
                        time.sleep(1)  # Brief pause before redirect
                        st.rerun()
                    else:
                        st.error("❌ Invalid email or password. Please check your credentials and try again.")
                        st.info("💡 **Hint:** Try using demo credentials for testing purposes")

    # Help section for developers (expandable)
    with st.expander("🔧 Developer/Testing Information", expanded=False):
        st.markdown("""
        **For Testing & Development:**

        **Demo Accounts Available:**
        - **Admin:** `admin@creditdecision.com` / `admin123`
        - **Analyst:** `analyst@creditdecision.com` / `analyst123`

        **Features:**
        - Full dashboard access
        - RAG document exploration
        - Risk analysis tools
        - Real-time analytics

        **Note:** This is a demonstration environment with simulated data.
        """)

    # Footer
    st.markdown("""
        <div class="login-footer">
            <p><strong>Credit Decision Analytics Platform</strong> | Version 1.0.0</p>
            <p>Built using Streamlit | © 2025 Nathadriele</p>
        </div>
    """, unsafe_allow_html=True)

    st.markdown('</div>', unsafe_allow_html=True)

def show_user_info():
    """Display current user info in sidebar"""
    # Only show user info if user is authenticated
    if not check_authentication():
        return

    user_data = get_current_user()
    if user_data:
        st.sidebar.markdown("---")
        st.sidebar.markdown("**👤 Current User**")
        st.sidebar.write(f"**Name:** {user_data.get('firstName', '')} {user_data.get('lastName', '')}")
        st.sidebar.write(f"**Email:** {user_data.get('email', '')}")
        st.sidebar.write(f"**Role:** {user_data.get('role', '')}")

        if st.session_state.get("demo_mode"):
            st.sidebar.warning("🧪 Demo Mode")

        if st.sidebar.button("Logout", use_container_width=True):
            logout_user()
