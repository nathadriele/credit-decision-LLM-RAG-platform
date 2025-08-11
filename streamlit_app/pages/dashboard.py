# =============================================================================
# DASHBOARD PAGE - STREAMLIT CREDIT DECISION PLATFORM
# =============================================================================

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import numpy as np
from datetime import datetime, timedelta
from utils.api_client import api_client
from utils.auth import require_auth, has_permission

@require_auth
def show_dashboard():
    """Main dashboard page"""
    st.title("Credit Decision Dashboard")
    
    # Check permissions
    if not has_permission("applications:view"):
        st.error("You don't have permission to view this dashboard.")
        return
    
    # Dashboard tabs
    tab1, tab2, tab3, tab4 = st.tabs(["📈 Overview", "🎯 Risk Analysis", "💰 Portfolio", "⚡ Real-time"])
    
    with tab1:
        show_overview_dashboard()
    
    with tab2:
        show_risk_analysis_dashboard()
    
    with tab3:
        show_portfolio_dashboard()
    
    with tab4:
        show_realtime_dashboard()

def show_overview_dashboard():
    """Overview dashboard with key metrics"""
    st.subheader("Key Performance Indicators")
    
    # Generate sample data (in real app, this would come from API)
    sample_data = generate_sample_dashboard_data()
    
    # Key metrics row
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric(
            label="📋 Applications Today",
            value="127",
            delta="12",
            delta_color="normal"
        )
    
    with col2:
        st.metric(
            label="✅ Approval Rate",
            value="73.2%",
            delta="2.1%",
            delta_color="normal"
        )
    
    with col3:
        st.metric(
            label="💰 Avg Loan Amount",
            value="$45,230",
            delta="-$1,200",
            delta_color="inverse"
        )
    
    with col4:
        st.metric(
            label="⚡ Avg Decision Time",
            value="2.3 min",
            delta="-0.8 min",
            delta_color="inverse"
        )
    
    # Charts row
    col1, col2 = st.columns(2)
    
    with col1:
        # Applications over time
        fig_apps = px.line(
            sample_data["daily_apps"],
            x="date",
            y="applications",
            title="📈 Daily Applications (Last 30 Days)",
            color_discrete_sequence=["#1f77b4"]
        )
        fig_apps.update_layout(height=400)
        st.plotly_chart(fig_apps, use_container_width=True)
    
    with col2:
        # Decision distribution
        fig_decisions = px.pie(
            sample_data["decisions"],
            values="count",
            names="decision",
            title="🎯 Decision Distribution (Last 7 Days)",
            color_discrete_map={
                "Approved": "#2ecc71",
                "Declined": "#e74c3c", 
                "Pending": "#f39c12",
                "Conditional": "#9b59b6"
            }
        )
        fig_decisions.update_layout(height=400)
        st.plotly_chart(fig_decisions, use_container_width=True)
    
    # Risk score distribution
    st.subheader("Risk Score Distribution")
    fig_risk = px.histogram(
        sample_data["risk_scores"],
        x="risk_score",
        nbins=20,
        title="Risk Score Distribution (Current Portfolio)",
        color_discrete_sequence=["#3498db"]
    )
    fig_risk.update_layout(height=400)
    st.plotly_chart(fig_risk, use_container_width=True)

def show_risk_analysis_dashboard():
    """Risk analysis dashboard"""
    st.subheader("🎯 Risk Analysis Dashboard")
    
    # Risk filters
    col1, col2, col3 = st.columns(3)
    
    with col1:
        risk_grade = st.selectbox("Risk Grade", ["All", "AAA", "AA", "A", "BBB", "BB", "B", "CCC"])
    
    with col2:
        loan_purpose = st.selectbox("Loan Purpose", ["All", "Personal", "Business", "Auto", "Home"])
    
    with col3:
        amount_range = st.select_slider(
            "Amount Range",
            options=["$0-10K", "$10K-25K", "$25K-50K", "$50K-100K", "$100K+"],
            value="$25K-50K"
        )
    
    # Generate risk analysis data
    risk_data = generate_risk_analysis_data()
    
    # Risk metrics
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric("📊 Avg Risk Score", "42.3", "-2.1")
    
    with col2:
        st.metric("🎯 Default Rate", "3.2%", "-0.5%")
    
    with col3:
        st.metric("💰 Expected Loss", "1.8%", "-0.3%")
    
    # Risk analysis charts
    col1, col2 = st.columns(2)
    
    with col1:
        # Risk vs Amount scatter
        fig_scatter = px.scatter(
            risk_data["risk_amount"],
            x="amount",
            y="risk_score",
            color="decision",
            title="🎯 Risk Score vs Loan Amount",
            color_discrete_map={
                "Approved": "#2ecc71",
                "Declined": "#e74c3c",
                "Pending": "#f39c12"
            }
        )
        st.plotly_chart(fig_scatter, use_container_width=True)
    
    with col2:
        # Risk factors heatmap
        fig_heatmap = px.imshow(
            risk_data["risk_factors"],
            title="🔥 Risk Factors Correlation",
            color_continuous_scale="RdYlBu_r"
        )
        st.plotly_chart(fig_heatmap, use_container_width=True)

def show_portfolio_dashboard():
    """Portfolio analysis dashboard"""
    st.subheader("💰 Portfolio Analysis")
    
    # Portfolio metrics
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("💼 Total Portfolio", "$12.4M", "↑ $1.2M")
    
    with col2:
        st.metric("📈 Active Loans", "1,247", "↑ 23")
    
    with col3:
        st.metric("💸 Monthly Revenue", "$234K", "↑ $12K")
    
    with col4:
        st.metric("⚠️ At Risk Loans", "47", "↓ 5")
    
    # Portfolio composition
    portfolio_data = generate_portfolio_data()
    
    col1, col2 = st.columns(2)
    
    with col1:
        # Portfolio by purpose
        fig_purpose = px.treemap(
            portfolio_data["by_purpose"],
            path=["purpose"],
            values="amount",
            title="💰 Portfolio by Loan Purpose"
        )
        st.plotly_chart(fig_purpose, use_container_width=True)
    
    with col2:
        # Portfolio performance
        fig_performance = px.bar(
            portfolio_data["performance"],
            x="month",
            y=["revenue", "losses"],
            title="📊 Monthly Performance",
            barmode="group"
        )
        st.plotly_chart(fig_performance, use_container_width=True)

def show_realtime_dashboard():
    """Real-time monitoring dashboard"""
    st.subheader("⚡ Real-time Monitoring")
    
    # Auto-refresh option
    auto_refresh = st.checkbox("🔄 Auto-refresh (30s)", value=False)
    
    if auto_refresh:
        # Auto-refresh every 30 seconds
        import time
        time.sleep(30)
        st.rerun()
    
    # Real-time metrics
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric("🔄 Processing Queue", "23", "↑ 3")
    
    with col2:
        st.metric("⚡ Avg Response Time", "1.2s", "↓ 0.3s")
    
    with col3:
        st.metric("🤖 AI Model Load", "67%", "↑ 5%")
    
    # System health
    st.subheader("🏥 System Health")
    
    # Try to get real system health
    try:
        health_response = api_client.get_system_health()
        if health_response.get("success"):
            st.success("✅ All systems operational")
        else:
            st.warning("⚠️ Some services may be unavailable")
    except:
        st.info("ℹ️ System health check unavailable (demo mode)")
    
    # Recent activity
    st.subheader("📋 Recent Activity")
    
    recent_activity = pd.DataFrame({
        "Time": [
            "14:32:15", "14:31:45", "14:31:20", "14:30:55", "14:30:30"
        ],
        "Event": [
            "Application APP-20241201-ABC123 approved",
            "Risk assessment completed for APP-20241201-DEF456", 
            "New application submitted: APP-20241201-GHI789",
            "Decision review requested for APP-20241201-JKL012",
            "AI model prediction completed"
        ],
        "Status": ["✅ Success", "✅ Success", "ℹ️ Info", "⚠️ Warning", "✅ Success"]
    })
    
    st.dataframe(recent_activity, use_container_width=True, hide_index=True)

def generate_sample_dashboard_data():
    """Generate sample data for dashboard"""
    # Daily applications
    dates = pd.date_range(end=datetime.now(), periods=30, freq='D')
    daily_apps = pd.DataFrame({
        "date": dates,
        "applications": np.random.poisson(85, 30) + np.random.randint(-10, 20, 30)
    })
    
    # Decision distribution
    decisions = pd.DataFrame({
        "decision": ["Approved", "Declined", "Pending", "Conditional"],
        "count": [156, 43, 28, 19]
    })
    
    # Risk scores
    risk_scores = pd.DataFrame({
        "risk_score": np.random.beta(2, 3, 1000) * 100
    })
    
    return {
        "daily_apps": daily_apps,
        "decisions": decisions,
        "risk_scores": risk_scores
    }

def generate_risk_analysis_data():
    """Generate sample risk analysis data"""
    n_samples = 500
    
    # Risk vs Amount data
    amounts = np.random.lognormal(10, 0.8, n_samples)
    risk_scores = 30 + (amounts / 1000) * 0.5 + np.random.normal(0, 15, n_samples)
    risk_scores = np.clip(risk_scores, 0, 100)
    
    decisions = []
    for score in risk_scores:
        if score < 30:
            decisions.append("Approved")
        elif score < 70:
            decisions.append(np.random.choice(["Approved", "Pending"], p=[0.7, 0.3]))
        else:
            decisions.append("Declined")
    
    risk_amount = pd.DataFrame({
        "amount": amounts,
        "risk_score": risk_scores,
        "decision": decisions
    })
    
    # Risk factors correlation matrix
    factors = ["Credit Score", "Income", "DTI Ratio", "Employment", "Assets"]
    correlation_matrix = np.random.rand(5, 5)
    correlation_matrix = (correlation_matrix + correlation_matrix.T) / 2
    np.fill_diagonal(correlation_matrix, 1)
    
    risk_factors = pd.DataFrame(correlation_matrix, index=factors, columns=factors)
    
    return {
        "risk_amount": risk_amount,
        "risk_factors": risk_factors
    }

def generate_portfolio_data():
    """Generate sample portfolio data"""
    # Portfolio by purpose
    by_purpose = pd.DataFrame({
        "purpose": ["Personal", "Business", "Auto", "Home", "Education"],
        "amount": [4200000, 3800000, 2100000, 1900000, 400000]
    })
    
    # Monthly performance
    months = ["Oct", "Nov", "Dec"]
    performance = pd.DataFrame({
        "month": months,
        "revenue": [220000, 234000, 245000],
        "losses": [12000, 8000, 15000]
    })
    
    return {
        "by_purpose": by_purpose,
        "performance": performance
    }
