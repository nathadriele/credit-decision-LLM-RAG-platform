// =============================================================================
// GLOBAL TEST SETUP - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import { execSync } from 'child_process';
import { Client } from 'pg';
import Redis from 'ioredis';

export default async function globalSetup() {
  console.log('🧪 Setting up test environment...');

  try {
    // Setup test database
    await setupTestDatabase();
    
    // Setup test Redis
    await setupTestRedis();
    
    // Setup test ChromaDB (if needed)
    await setupTestChromaDB();
    
    console.log('✅ Test environment setup complete');
  } catch (error) {
    console.error('❌ Test environment setup failed:', error);
    throw error;
  }
}

async function setupTestDatabase() {
  const dbUrl = process.env.TEST_DATABASE_URL || 
    'postgresql://postgres:postgres@localhost:5432/credit_decision_test_db';
  
  // Parse database URL
  const url = new URL(dbUrl);
  const dbName = url.pathname.slice(1);
  const adminUrl = `${url.protocol}//${url.username}:${url.password}@${url.host}/postgres`;
  
  console.log('📊 Setting up test database...');
  
  // Connect to admin database to create test database
  const adminClient = new Client({ connectionString: adminUrl });
  
  try {
    await adminClient.connect();
    
    // Drop test database if exists
    try {
      await adminClient.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    } catch (error) {
      // Ignore error if database doesn't exist
    }
    
    // Create test database
    await adminClient.query(`CREATE DATABASE "${dbName}"`);
    console.log(`✅ Test database "${dbName}" created`);
    
  } finally {
    await adminClient.end();
  }
  
  // Connect to test database and run migrations
  const testClient = new Client({ connectionString: dbUrl });
  
  try {
    await testClient.connect();
    
    // Run basic schema setup
    await testClient.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    `);
    
    console.log('✅ Test database schema initialized');
    
  } finally {
    await testClient.end();
  }
}

async function setupTestRedis() {
  const redisUrl = process.env.TEST_REDIS_URL || 'redis://localhost:6379/1';
  
  console.log('🔴 Setting up test Redis...');
  
  const redis = new Redis(redisUrl);
  
  try {
    // Test connection
    await redis.ping();
    
    // Clear test database
    await redis.flushdb();
    
    console.log('✅ Test Redis setup complete');
    
  } finally {
    redis.disconnect();
  }
}

async function setupTestChromaDB() {
  const chromaUrl = process.env.TEST_CHROMADB_URL || 'http://localhost:8000';
  
  console.log('🟣 Setting up test ChromaDB...');
  
  try {
    // Test ChromaDB connection
    const response = await fetch(`${chromaUrl}/api/v1/heartbeat`);
    
    if (!response.ok) {
      console.log('⚠️  ChromaDB not available, skipping vector tests');
      process.env.SKIP_VECTOR_TESTS = 'true';
      return;
    }
    
    // Clear test collections (if any)
    try {
      const collectionsResponse = await fetch(`${chromaUrl}/api/v1/collections`);
      if (collectionsResponse.ok) {
        const collections = await collectionsResponse.json();
        
        for (const collection of collections) {
          if (collection.name.startsWith('test_')) {
            await fetch(`${chromaUrl}/api/v1/collections/${collection.name}`, {
              method: 'DELETE',
            });
          }
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
    
    console.log('✅ Test ChromaDB setup complete');
    
  } catch (error) {
    console.log('⚠️  ChromaDB not available, skipping vector tests');
    process.env.SKIP_VECTOR_TESTS = 'true';
  }
}

// Cleanup function for graceful shutdown
process.on('SIGINT', async () => {
  console.log('🧹 Cleaning up test environment...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🧹 Cleaning up test environment...');
  process.exit(0);
});
