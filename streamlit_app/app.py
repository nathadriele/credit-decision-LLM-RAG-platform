# =============================================================================
# MAIN STREAMLIT APPLICATION - CREDIT DECISION LLM RAG PLATFORM
# =============================================================================

import streamlit as st
from streamlit_option_menu import option_menu
import sys
import os

# Add current directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config import config
from utils.auth import check_authentication, show_login_form, show_user_info
from pages.dashboard import show_dashboard
from pages.rag_explorer import show_rag_explorer

# Page configuration
st.set_page_config(
    page_title=config.APP_TITLE,
    page_icon=config.APP_ICON,
    layout="wide",
    initial_sidebar_state="expanded",
    menu_items={
        'Get Help': 'https://docs.creditdecision.com',
        'Report a bug': 'https://github.com/your-org/credit-decision-llm-rag/issues',
        'About': f"""
        # {config.APP_TITLE}
        
        **Version:** 1.0.0
        **Built with:** Streamlit + Python
        
        This is an internal analytics platform for credit decision analysis,
        AI model testing, and RAG document exploration.
        
        **Features:**
        - 📊 Real-time dashboards
        - 🤖 AI model testing
        - 📚 RAG knowledge explorer
        - 🔍 Risk analysis tools
        """
    }
)

# Custom CSS
st.markdown("""
<style>
    .main-header {
        font-size: 2.5rem;
        font-weight: bold;
        color: #1f77b4;
        text-align: center;
        margin-bottom: 2rem;
    }
    
    .metric-container {
        background-color: #f8f9fa;
        padding: 1rem;
        border-radius: 0.5rem;
        border-left: 4px solid #1f77b4;
    }
    
    .sidebar .sidebar-content {
        background-color: #f8f9fa;
    }
    
    .stAlert > div {
        padding: 1rem;
    }
    
    .demo-badge {
        background-color: #fff3cd;
        color: #856404;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.875rem;
        font-weight: bold;
    }
</style>
""", unsafe_allow_html=True)

def main():
    """Main application function"""

    # Check authentication
    if not check_authentication():
        show_login_form()
        return

    # Show user info in sidebar (only for authenticated users)
    show_user_info()

    # Main navigation (only for authenticated users)
    with st.sidebar:
        st.markdown("---")
        selected = option_menu(
            menu_title="📋 Navigation",
            options=[
                "Dashboard",
                "RAG Explorer", 
                "Model Testing",
                "Risk Analysis",
                "Reports"
            ],
            icons=[
                "speedometer2",
                "search", 
                "cpu",
                "shield-check",
                "file-earmark-text"
            ],
            menu_icon="list",
            default_index=0,
            styles={
                "container": {"padding": "0!important", "background-color": "#fafafa"},
                "icon": {"color": "#1f77b4", "font-size": "18px"}, 
                "nav-link": {
                    "font-size": "16px", 
                    "text-align": "left", 
                    "margin": "0px",
                    "--hover-color": "#eee"
                },
                "nav-link-selected": {"background-color": "#1f77b4"},
            }
        )
    
    # Demo mode indicator
    if st.session_state.get("demo_mode"):
        st.sidebar.markdown("""
        <div class="demo-badge">
            🧪 DEMO MODE
        </div>
        """, unsafe_allow_html=True)
        st.sidebar.caption("Using mock data for demonstration")
    
    # Main content area
    if selected == "Dashboard":
        show_dashboard()
    
    elif selected == "RAG Explorer":
        show_rag_explorer()
    
    elif selected == "Model Testing":
        show_model_testing()
    
    elif selected == "Risk Analysis":
        show_risk_analysis()
    
    elif selected == "Reports":
        show_reports()

def show_model_testing():
    """AI Model testing interface"""
    st.title("🤖 AI Model Testing")
    
    st.info("🚧 **Coming Soon**: AI model testing interface for evaluating different models and parameters.")
    
    # Placeholder content
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("📊 Model Performance")
        st.metric("Current Model", "GPT-4", "v1.2")
        st.metric("Accuracy", "94.2%", "↑ 2.1%")
        st.metric("Avg Response Time", "1.8s", "↓ 0.3s")
    
    with col2:
        st.subheader("🔧 Test Configuration")
        
        model_version = st.selectbox("Model Version", ["GPT-4 v1.2", "GPT-3.5 Turbo", "Claude-2"])
        test_dataset = st.selectbox("Test Dataset", ["Validation Set", "Production Sample", "Custom"])
        
        if st.button("🚀 Run Model Test"):
            with st.spinner("Running model evaluation..."):
                import time
                time.sleep(2)
                st.success("✅ Model test completed!")

def show_risk_analysis():
    """Risk analysis tools"""
    st.title("🛡️ Risk Analysis Tools")
    
    st.info("🚧 **Coming Soon**: Advanced risk analysis and modeling tools.")
    
    # Placeholder content
    tab1, tab2, tab3 = st.tabs(["📊 Risk Metrics", "🎯 Scenario Analysis", "📈 Trend Analysis"])
    
    with tab1:
        st.subheader("📊 Current Risk Metrics")
        
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Portfolio Risk", "Medium", "↓ Low")
        with col2:
            st.metric("Default Rate", "3.2%", "↓ 0.5%")
        with col3:
            st.metric("Avg Risk Score", "42.3", "↓ 2.1")
        with col4:
            st.metric("VaR (95%)", "$1.2M", "↑ $0.1M")
    
    with tab2:
        st.subheader("🎯 Scenario Analysis")
        st.write("Analyze portfolio performance under different economic scenarios.")
        
        scenario = st.selectbox("Economic Scenario", ["Base Case", "Recession", "High Growth", "Custom"])
        if st.button("Run Scenario Analysis"):
            st.info("Scenario analysis would run here...")
    
    with tab3:
        st.subheader("📈 Risk Trend Analysis")
        st.write("Historical risk trends and forecasting.")
        
        time_period = st.selectbox("Time Period", ["Last 30 Days", "Last 90 Days", "Last Year"])
        if st.button("Generate Trend Report"):
            st.info("Trend analysis would be generated here...")

def show_reports():
    """Reports and analytics"""
    st.title("📊 Reports & Analytics")
    
    st.info("🚧 **Coming Soon**: Comprehensive reporting and analytics dashboard.")
    
    # Placeholder content
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("📋 Available Reports")
        
        reports = [
            "📊 Daily Operations Report",
            "📈 Weekly Performance Summary", 
            "🎯 Monthly Risk Assessment",
            "📋 Quarterly Portfolio Review",
            "🔍 Compliance Audit Report"
        ]
        
        for report in reports:
            if st.button(report, use_container_width=True):
                st.info(f"Generating {report}...")
    
    with col2:
        st.subheader("⚙️ Report Settings")
        
        report_format = st.selectbox("Format", ["PDF", "Excel", "CSV", "JSON"])
        date_range = st.date_input("Date Range", value=[])
        include_charts = st.checkbox("Include Charts", value=True)
        
        if st.button("📥 Generate Custom Report"):
            st.success("Custom report generation started!")

# Footer
def show_footer():
    """Show application footer"""
    st.markdown("---")
    st.markdown("""
    <div style='text-align: center; color: white; padding: 1rem;'>
        <p><strong>Credit Decision Analytics Platform</strong> | Version 1.0.0</p>
        <p>Built using Streamlit</p>
    </div>
    """, unsafe_allow_html=True)

if __name__ == "__main__":
    main()
    show_footer()
