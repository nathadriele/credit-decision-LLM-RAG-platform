# =============================================================================
# RAG EXPLORER PAGE - STREAMLIT CREDIT DECISION PLATFORM
# =============================================================================

import streamlit as st
import uuid
from datetime import datetime
from utils.api_client import api_client
from utils.auth import require_auth, has_permission

@require_auth
def show_rag_explorer():
    """RAG document explorer and query interface"""
    st.title("📚 RAG Knowledge Explorer")
    
    # Check permissions
    if not has_permission("ai:monitor"):
        st.info("ℹ️ This is a demo of the RAG explorer. In production, you would need AI monitoring permissions.")
    
    # Sidebar for conversation management
    with st.sidebar:
        st.subheader("💬 Conversation")
        
        # Conversation selector
        if "conversations" not in st.session_state:
            st.session_state.conversations = {}
        
        conversation_options = ["New Conversation"] + list(st.session_state.conversations.keys())
        selected_conversation = st.selectbox("Select Conversation", conversation_options)
        
        if selected_conversation == "New Conversation":
            if st.button("Start New Conversation"):
                conversation_id = f"conv_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                st.session_state.conversations[conversation_id] = {
                    "messages": [],
                    "created_at": datetime.now()
                }
                st.session_state.current_conversation = conversation_id
                st.rerun()
        else:
            st.session_state.current_conversation = selected_conversation
        
        # Clear conversation
        if st.session_state.get("current_conversation") and st.button("Clear Conversation"):
            if st.session_state.current_conversation in st.session_state.conversations:
                st.session_state.conversations[st.session_state.current_conversation]["messages"] = []
            st.rerun()
    
    # Main content tabs
    tab1, tab2, tab3 = st.tabs(["🔍 Query Interface", "📄 Document Explorer", "⚙️ Settings"])
    
    with tab1:
        show_query_interface()
    
    with tab2:
        show_document_explorer()
    
    with tab3:
        show_rag_settings()

def show_query_interface():
    """Main query interface for RAG system"""
    st.subheader("🔍 Ask Questions About Credit Policies")
    
    # Query input
    col1, col2 = st.columns([4, 1])
    
    with col1:
        query = st.text_input(
            "Enter your question:",
            placeholder="What is the minimum credit score required for personal loans?",
            key="rag_query_input"
        )
    
    with col2:
        use_conversation = st.checkbox("Use Context", value=True, help="Use conversation history for context")
    
    # Collection selector
    collection = st.selectbox(
        "Knowledge Base:",
        ["credit_policies", "risk_guidelines", "compliance_docs", "all_documents"],
        help="Select which document collection to search"
    )
    
    # Advanced options
    with st.expander("🔧 Advanced Options"):
        col1, col2, col3 = st.columns(3)
        
        with col1:
            top_k = st.slider("Top K Results", 1, 20, 5, help="Number of relevant documents to retrieve")
        
        with col2:
            enable_caching = st.checkbox("Enable Caching", value=True, help="Cache results for faster responses")
        
        with col3:
            temperature = st.slider("AI Temperature", 0.0, 1.0, 0.1, help="Creativity level of AI responses")
    
    # Query button
    if st.button("🔍 Search Knowledge Base", type="primary", use_container_width=True):
        if query.strip():
            with st.spinner("🤖 Searching knowledge base..."):
                process_rag_query(query, collection, use_conversation, top_k, enable_caching)
        else:
            st.warning("Please enter a question.")
    
    # Display conversation history
    display_conversation_history()

def process_rag_query(query: str, collection: str, use_conversation: bool, top_k: int, enable_caching: bool):
    """Process RAG query and display results"""
    try:
        # Determine which API endpoint to use
        if use_conversation and st.session_state.get("current_conversation"):
            conversation_id = st.session_state.current_conversation
            response = api_client.rag_conversation(query, conversation_id, collection)
        else:
            response = api_client.rag_query(query, collection)
        
        # Handle API response
        if response.get("success"):
            data = response["data"]
            
            # Store in conversation history
            store_conversation_message(query, data)
            
            # Display results
            display_rag_results(data)
            
        elif st.session_state.get("demo_mode"):
            # Demo mode - generate mock response
            mock_response = generate_mock_rag_response(query, collection)
            store_conversation_message(query, mock_response)
            display_rag_results(mock_response)
            
        else:
            st.error(f"Query failed: {response.get('error', 'Unknown error')}")
            
    except Exception as e:
        st.error(f"Error processing query: {str(e)}")
        
        # Fallback to demo response
        if st.session_state.get("demo_mode"):
            mock_response = generate_mock_rag_response(query, collection)
            store_conversation_message(query, mock_response)
            display_rag_results(mock_response)

def display_rag_results(data: dict):
    """Display RAG query results"""
    # Main answer
    st.subheader("💡 Answer")
    answer = data.get("answer", "No answer available")
    st.markdown(answer)
    
    # Confidence score
    confidence = data.get("confidence", 0.0)
    confidence_color = "green" if confidence > 0.8 else "orange" if confidence > 0.6 else "red"
    st.markdown(f"**Confidence:** :{confidence_color}[{confidence:.1%}]")
    
    # Sources
    sources = data.get("sources", [])
    if sources:
        st.subheader("📄 Sources")
        
        for i, source in enumerate(sources[:5]):  # Show top 5 sources
            with st.expander(f"📄 Source {i+1}: {source.get('title', 'Unknown Document')} (Relevance: {source.get('score', 0):.1%})"):
                st.markdown(f"**Content:** {source.get('content', 'No content available')}")
                
                metadata = source.get('metadata', {})
                if metadata:
                    st.markdown("**Metadata:**")
                    for key, value in metadata.items():
                        st.markdown(f"- **{key}:** {value}")
    
    # Usage statistics
    usage = data.get("usage", {})
    if usage:
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Tokens Used", usage.get("totalTokens", 0))
        with col2:
            st.metric("Processing Time", f"{usage.get('processingTime', 0):.2f}s")
        with col3:
            st.metric("Sources Found", len(sources))

def store_conversation_message(query: str, response: dict):
    """Store message in conversation history"""
    if not st.session_state.get("current_conversation"):
        return
    
    conversation_id = st.session_state.current_conversation
    if conversation_id not in st.session_state.conversations:
        st.session_state.conversations[conversation_id] = {"messages": []}
    
    message = {
        "timestamp": datetime.now(),
        "query": query,
        "response": response,
        "id": str(uuid.uuid4())
    }
    
    st.session_state.conversations[conversation_id]["messages"].append(message)

def display_conversation_history():
    """Display conversation history"""
    if not st.session_state.get("current_conversation"):
        return
    
    conversation_id = st.session_state.current_conversation
    conversation = st.session_state.conversations.get(conversation_id)
    
    if not conversation or not conversation["messages"]:
        return
    
    st.subheader("💬 Conversation History")
    
    for message in reversed(conversation["messages"][-5:]):  # Show last 5 messages
        with st.container():
            st.markdown(f"**🙋 You:** {message['query']}")
            st.markdown(f"**🤖 Assistant:** {message['response'].get('answer', 'No response')}")
            st.caption(f"⏰ {message['timestamp'].strftime('%H:%M:%S')}")
            st.divider()

def show_document_explorer():
    """Document explorer interface"""
    st.subheader("📄 Document Collection Explorer")
    
    # Collection stats
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("📚 Total Documents", "1,247")
    
    with col2:
        st.metric("🔍 Indexed Chunks", "15,892")
    
    with col3:
        st.metric("📊 Collections", "4")
    
    with col4:
        st.metric("🔄 Last Updated", "2 hours ago")
    
    # Collection browser
    st.subheader("📁 Browse Collections")
    
    collections = {
        "credit_policies": {
            "name": "Credit Policies",
            "description": "Official credit policies and procedures",
            "documents": 342,
            "last_updated": "2024-12-01"
        },
        "risk_guidelines": {
            "name": "Risk Assessment Guidelines", 
            "description": "Risk evaluation criteria and methodologies",
            "documents": 156,
            "last_updated": "2024-11-28"
        },
        "compliance_docs": {
            "name": "Compliance Documentation",
            "description": "Regulatory compliance and legal requirements",
            "documents": 89,
            "last_updated": "2024-11-30"
        },
        "training_materials": {
            "name": "Training Materials",
            "description": "Staff training and educational content",
            "documents": 234,
            "last_updated": "2024-11-25"
        }
    }
    
    for collection_id, info in collections.items():
        with st.expander(f"📁 {info['name']} ({info['documents']} documents)"):
            st.markdown(f"**Description:** {info['description']}")
            st.markdown(f"**Documents:** {info['documents']}")
            st.markdown(f"**Last Updated:** {info['last_updated']}")
            
            col1, col2 = st.columns(2)
            with col1:
                if st.button(f"Browse {info['name']}", key=f"browse_{collection_id}"):
                    st.info(f"Browsing {info['name']} collection...")
            
            with col2:
                if st.button(f"Search in {info['name']}", key=f"search_{collection_id}"):
                    st.session_state.rag_query_input = f"Search in {info['name']}: "
                    st.rerun()

def show_rag_settings():
    """RAG system settings and configuration"""
    st.subheader("⚙️ RAG System Configuration")
    
    # Model settings
    st.markdown("### 🤖 AI Model Settings")
    
    col1, col2 = st.columns(2)
    
    with col1:
        model_name = st.selectbox(
            "Language Model",
            ["gpt-4", "gpt-3.5-turbo", "claude-2", "llama-2"],
            help="Select the language model for generating responses"
        )
        
        max_tokens = st.slider(
            "Max Response Tokens",
            100, 4000, 2000,
            help="Maximum length of AI responses"
        )
    
    with col2:
        temperature = st.slider(
            "Response Creativity",
            0.0, 1.0, 0.1,
            help="Higher values make responses more creative but less focused"
        )
        
        top_p = st.slider(
            "Response Diversity",
            0.1, 1.0, 0.9,
            help="Controls diversity of word choices in responses"
        )
    
    # Retrieval settings
    st.markdown("### 🔍 Document Retrieval Settings")
    
    col1, col2 = st.columns(2)
    
    with col1:
        chunk_size = st.slider(
            "Document Chunk Size",
            500, 2000, 1000,
            help="Size of text chunks for document processing"
        )
        
        chunk_overlap = st.slider(
            "Chunk Overlap",
            0, 500, 200,
            help="Overlap between consecutive chunks"
        )
    
    with col2:
        similarity_threshold = st.slider(
            "Similarity Threshold",
            0.0, 1.0, 0.7,
            help="Minimum similarity score for relevant documents"
        )
        
        max_sources = st.slider(
            "Max Sources per Query",
            1, 20, 5,
            help="Maximum number of source documents to retrieve"
        )
    
    # Cache settings
    st.markdown("### 💾 Caching Settings")
    
    col1, col2 = st.columns(2)
    
    with col1:
        enable_query_cache = st.checkbox("Enable Query Caching", value=True)
        cache_ttl = st.slider("Cache TTL (minutes)", 5, 1440, 60)
    
    with col2:
        enable_embedding_cache = st.checkbox("Enable Embedding Caching", value=True)
        max_cache_size = st.slider("Max Cache Size (MB)", 100, 2000, 500)
    
    # Save settings
    if st.button("💾 Save Configuration", type="primary"):
        st.success("✅ Configuration saved successfully!")
        st.info("ℹ️ Settings will take effect on next query.")

def generate_mock_rag_response(query: str, collection: str) -> dict:
    """Generate mock RAG response for demo purposes"""
    import random
    
    # Mock responses based on query content
    if "credit score" in query.lower():
        answer = """Based on our credit policies, the minimum credit score requirements are:

- **Personal Loans**: 650 minimum credit score
- **Business Loans**: 700 minimum credit score  
- **Auto Loans**: 620 minimum credit score
- **Home Loans**: 680 minimum credit score

These requirements may be adjusted based on other factors such as income, debt-to-income ratio, and collateral."""
        
        sources = [
            {
                "title": "Personal Loan Credit Policy",
                "content": "Minimum credit score of 650 is required for personal loans up to $50,000.",
                "score": 0.95,
                "metadata": {"document": "credit_policy_v2.1.pdf", "page": 3}
            },
            {
                "title": "Credit Scoring Guidelines",
                "content": "Credit score requirements vary by loan type and risk assessment.",
                "score": 0.87,
                "metadata": {"document": "scoring_guidelines.pdf", "page": 1}
            }
        ]
    
    elif "risk" in query.lower():
        answer = """Our risk assessment framework evaluates multiple factors:

1. **Credit History**: Payment history, credit utilization, length of credit history
2. **Financial Stability**: Income verification, employment history, debt-to-income ratio
3. **Collateral**: Asset valuation and loan-to-value ratios
4. **External Factors**: Economic conditions, industry-specific risks

Risk scores range from 0-100, with scores below 30 considered low risk and scores above 70 considered high risk."""
        
        sources = [
            {
                "title": "Risk Assessment Framework",
                "content": "Comprehensive risk evaluation considers credit, financial, and external factors.",
                "score": 0.92,
                "metadata": {"document": "risk_framework_v3.0.pdf", "page": 5}
            }
        ]
    
    else:
        answer = f"""I found information related to your query about "{query}" in our {collection} collection. 

This is a demo response showing how the RAG system would provide contextual answers based on your organization's documents and policies. In a production environment, this would be generated using your actual document collection and AI models."""
        
        sources = [
            {
                "title": "General Policy Document",
                "content": f"Information related to {query} can be found in our policy documentation.",
                "score": 0.75,
                "metadata": {"document": "general_policies.pdf", "page": random.randint(1, 20)}
            }
        ]
    
    return {
        "answer": answer,
        "sources": sources,
        "confidence": random.uniform(0.7, 0.95),
        "usage": {
            "totalTokens": random.randint(150, 500),
            "processingTime": random.uniform(1.2, 3.5)
        }
    }
