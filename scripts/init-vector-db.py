#!/usr/bin/env python3
"""
=============================================================================
CREDIT DECISION LLM RAG PLATFORM - VECTOR DATABASE INITIALIZATION
=============================================================================

This script initializes the ChromaDB vector database with collections
and sample data for the credit decision platform.
"""

import os
import sys
import json
import logging
from typing import List, Dict, Any
import chromadb
from chromadb.config import Settings
import requests
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class VectorDBInitializer:
    """Initialize and configure ChromaDB for credit decision platform."""
    
    def __init__(self, host: str = "localhost", port: int = 8000, auth_token: str = None):
        """Initialize the ChromaDB client."""
        self.host = host
        self.port = port
        self.auth_token = auth_token
        
        # Configure ChromaDB client
        settings = Settings(
            chroma_server_host=host,
            chroma_server_http_port=port,
            chroma_server_auth_credentials=auth_token,
            chroma_server_auth_provider="chromadb.auth.token.TokenAuthServerProvider"
        )
        
        try:
            self.client = chromadb.HttpClient(
                host=host,
                port=port,
                settings=settings
            )
            logger.info(f"Connected to ChromaDB at {host}:{port}")
        except Exception as e:
            logger.error(f"Failed to connect to ChromaDB: {e}")
            sys.exit(1)
    
    def check_health(self) -> bool:
        """Check if ChromaDB is healthy and accessible."""
        try:
            response = requests.get(f"http://{self.host}:{self.port}/api/v1/heartbeat")
            if response.status_code == 200:
                logger.info("ChromaDB health check passed")
                return True
            else:
                logger.error(f"ChromaDB health check failed: {response.status_code}")
                return False
        except Exception as e:
            logger.error(f"ChromaDB health check error: {e}")
            return False
    
    def create_collections(self) -> None:
        """Create the necessary collections for the credit decision platform."""
        collections_config = [
            {
                "name": "credit_documents",
                "metadata": {
                    "description": "Credit application documents and policies",
                    "embedding_function": "all-MiniLM-L6-v2",
                    "distance_metric": "cosine"
                }
            },
            {
                "name": "credit_policies",
                "metadata": {
                    "description": "Credit policies and regulations",
                    "embedding_function": "all-MiniLM-L6-v2",
                    "distance_metric": "cosine"
                }
            },
            {
                "name": "risk_models",
                "metadata": {
                    "description": "Risk assessment models and documentation",
                    "embedding_function": "all-MiniLM-L6-v2",
                    "distance_metric": "cosine"
                }
            },
            {
                "name": "knowledge_base",
                "metadata": {
                    "description": "General knowledge base for credit decisions",
                    "embedding_function": "all-MiniLM-L6-v2",
                    "distance_metric": "cosine"
                }
            },
            {
                "name": "case_studies",
                "metadata": {
                    "description": "Historical case studies and decisions",
                    "embedding_function": "all-MiniLM-L6-v2",
                    "distance_metric": "cosine"
                }
            }
        ]
        
        for config in collections_config:
            try:
                # Check if collection already exists
                existing_collections = self.client.list_collections()
                collection_names = [col.name for col in existing_collections]
                
                if config["name"] in collection_names:
                    logger.info(f"Collection '{config['name']}' already exists, skipping...")
                    continue
                
                # Create collection
                collection = self.client.create_collection(
                    name=config["name"],
                    metadata=config["metadata"]
                )
                logger.info(f"Created collection: {config['name']}")
                
            except Exception as e:
                logger.error(f"Failed to create collection {config['name']}: {e}")
    
    def load_sample_data(self) -> None:
        """Load sample data into the collections."""
        
        # Sample credit policy documents
        credit_policies = [
            {
                "id": "policy_001",
                "document": "Credit applications must include proof of income, employment verification, and credit history. Minimum credit score requirement is 650 for personal loans and 700 for business loans.",
                "metadata": {
                    "type": "policy",
                    "category": "eligibility_criteria",
                    "version": "1.0",
                    "effective_date": "2024-01-01"
                }
            },
            {
                "id": "policy_002", 
                "document": "Debt-to-income ratio should not exceed 40% for personal loans and 35% for mortgage applications. Higher ratios require additional documentation and approval.",
                "metadata": {
                    "type": "policy",
                    "category": "financial_ratios",
                    "version": "1.0",
                    "effective_date": "2024-01-01"
                }
            },
            {
                "id": "policy_003",
                "document": "All loan applications above $100,000 require manual review by a senior underwriter. AI recommendations should be used as guidance but not as final decisions.",
                "metadata": {
                    "type": "policy",
                    "category": "approval_process",
                    "version": "1.0",
                    "effective_date": "2024-01-01"
                }
            }
        ]
        
        # Sample risk model documentation
        risk_models = [
            {
                "id": "risk_model_001",
                "document": "The credit scoring model uses logistic regression with features including payment history (35%), credit utilization (30%), length of credit history (15%), types of credit (10%), and new credit inquiries (10%).",
                "metadata": {
                    "type": "model_documentation",
                    "model_name": "credit_score_v1",
                    "version": "1.2.3",
                    "accuracy": 0.87
                }
            },
            {
                "id": "risk_model_002",
                "document": "Income stability model evaluates employment history, income variability, and industry risk factors. Stable employment for 2+ years in low-risk industries receives highest scores.",
                "metadata": {
                    "type": "model_documentation", 
                    "model_name": "income_stability_v1",
                    "version": "1.1.0",
                    "accuracy": 0.82
                }
            }
        ]
        
        # Sample knowledge base entries
        knowledge_base = [
            {
                "id": "kb_001",
                "document": "FICO scores range from 300 to 850. Scores above 750 are considered excellent, 700-749 good, 650-699 fair, 600-649 poor, and below 600 very poor.",
                "metadata": {
                    "type": "knowledge",
                    "category": "credit_scoring",
                    "source": "FICO documentation"
                }
            },
            {
                "id": "kb_002",
                "document": "The Fair Credit Reporting Act (FCRA) requires lenders to provide adverse action notices when credit is denied based on credit report information.",
                "metadata": {
                    "type": "knowledge",
                    "category": "regulations",
                    "source": "FCRA guidelines"
                }
            }
        ]
        
        # Load data into collections
        try:
            # Load credit policies
            policies_collection = self.client.get_collection("credit_policies")
            policies_collection.add(
                documents=[item["document"] for item in credit_policies],
                metadatas=[item["metadata"] for item in credit_policies],
                ids=[item["id"] for item in credit_policies]
            )
            logger.info(f"Loaded {len(credit_policies)} credit policies")
            
            # Load risk models
            risk_collection = self.client.get_collection("risk_models")
            risk_collection.add(
                documents=[item["document"] for item in risk_models],
                metadatas=[item["metadata"] for item in risk_models],
                ids=[item["id"] for item in risk_models]
            )
            logger.info(f"Loaded {len(risk_models)} risk model documents")
            
            # Load knowledge base
            kb_collection = self.client.get_collection("knowledge_base")
            kb_collection.add(
                documents=[item["document"] for item in knowledge_base],
                metadatas=[item["metadata"] for item in knowledge_base],
                ids=[item["id"] for item in knowledge_base]
            )
            logger.info(f"Loaded {len(knowledge_base)} knowledge base entries")
            
        except Exception as e:
            logger.error(f"Failed to load sample data: {e}")
    
    def test_collections(self) -> None:
        """Test the collections with sample queries."""
        test_queries = [
            {
                "collection": "credit_policies",
                "query": "What is the minimum credit score requirement?",
                "n_results": 2
            },
            {
                "collection": "risk_models", 
                "query": "How is credit score calculated?",
                "n_results": 2
            },
            {
                "collection": "knowledge_base",
                "query": "What is a good FICO score?",
                "n_results": 2
            }
        ]
        
        for test in test_queries:
            try:
                collection = self.client.get_collection(test["collection"])
                results = collection.query(
                    query_texts=[test["query"]],
                    n_results=test["n_results"]
                )
                
                logger.info(f"Test query '{test['query']}' in {test['collection']}:")
                for i, doc in enumerate(results["documents"][0]):
                    logger.info(f"  Result {i+1}: {doc[:100]}...")
                    
            except Exception as e:
                logger.error(f"Test query failed for {test['collection']}: {e}")
    
    def get_collection_stats(self) -> None:
        """Get statistics for all collections."""
        try:
            collections = self.client.list_collections()
            logger.info("Collection Statistics:")
            
            for collection in collections:
                col = self.client.get_collection(collection.name)
                count = col.count()
                logger.info(f"  {collection.name}: {count} documents")
                
        except Exception as e:
            logger.error(f"Failed to get collection stats: {e}")

def main():
    """Main function to initialize the vector database."""
    logger.info("Starting ChromaDB initialization...")
    
    # Get configuration from environment variables
    host = os.getenv("CHROMADB_HOST", "localhost")
    port = int(os.getenv("CHROMADB_PORT", "8000"))
    auth_token = os.getenv("CHROMADB_AUTH_TOKEN", "test-token")
    
    # Initialize the vector database
    initializer = VectorDBInitializer(host=host, port=port, auth_token=auth_token)
    
    # Check health
    if not initializer.check_health():
        logger.error("ChromaDB is not healthy, exiting...")
        sys.exit(1)
    
    # Create collections
    logger.info("Creating collections...")
    initializer.create_collections()
    
    # Load sample data
    logger.info("Loading sample data...")
    initializer.load_sample_data()
    
    # Test collections
    logger.info("Testing collections...")
    initializer.test_collections()
    
    # Get statistics
    initializer.get_collection_stats()
    
    logger.info("ChromaDB initialization completed successfully!")

if __name__ == "__main__":
    main()
