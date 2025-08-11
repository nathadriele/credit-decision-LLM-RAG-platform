// =============================================================================
// GLOBAL TEST TEARDOWN - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import { Client } from 'pg';
import Redis from 'ioredis';

export default async function globalTeardown() {
  console.log('🧹 Cleaning up test environment...');

  try {
    // Cleanup test database
    await cleanupTestDatabase();
    
    // Cleanup test Redis
    await cleanupTestRedis();
    
    // Cleanup test ChromaDB
    await cleanupTestChromaDB();
    
    console.log('✅ Test environment cleanup complete');
  } catch (error) {
    console.error('❌ Test environment cleanup failed:', error);
    // Don't throw error to avoid masking test failures
  }
}

async function cleanupTestDatabase() {
  const dbUrl = process.env.TEST_DATABASE_URL || 
    'postgresql://postgres:postgres@localhost:5432/credit_decision_test_db';
  
  // Parse database URL
  const url = new URL(dbUrl);
  const dbName = url.pathname.slice(1);
  const adminUrl = `${url.protocol}//${url.username}:${url.password}@${url.host}/postgres`;
  
  console.log('📊 Cleaning up test database...');
  
  // Connect to admin database to drop test database
  const adminClient = new Client({ connectionString: adminUrl });
  
  try {
    await adminClient.connect();
    
    // Terminate all connections to test database
    await adminClient.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = $1 AND pid <> pg_backend_pid()
    `, [dbName]);
    
    // Drop test database
    await adminClient.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    console.log(`✅ Test database "${dbName}" dropped`);
    
  } catch (error) {
    console.error('❌ Failed to cleanup test database:', error);
  } finally {
    await adminClient.end();
  }
}

async function cleanupTestRedis() {
  const redisUrl = process.env.TEST_REDIS_URL || 'redis://localhost:6379/1';
  
  console.log('🔴 Cleaning up test Redis...');
  
  const redis = new Redis(redisUrl);
  
  try {
    // Clear test database
    await redis.flushdb();
    console.log('✅ Test Redis cleaned up');
    
  } catch (error) {
    console.error('❌ Failed to cleanup test Redis:', error);
  } finally {
    redis.disconnect();
  }
}

async function cleanupTestChromaDB() {
  const chromaUrl = process.env.TEST_CHROMADB_URL || 'http://localhost:8000';
  
  console.log('🟣 Cleaning up test ChromaDB...');
  
  try {
    // Get all collections
    const collectionsResponse = await fetch(`${chromaUrl}/api/v1/collections`);
    
    if (collectionsResponse.ok) {
      const collections = await collectionsResponse.json();
      
      // Delete test collections
      for (const collection of collections) {
        if (collection.name.startsWith('test_')) {
          await fetch(`${chromaUrl}/api/v1/collections/${collection.name}`, {
            method: 'DELETE',
          });
        }
      }
      
      console.log('✅ Test ChromaDB collections cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Failed to cleanup test ChromaDB:', error);
  }
}
