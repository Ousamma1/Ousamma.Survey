/**
 * Index Application Script
 * Apply optimized indexes to all services
 *
 * Usage:
 *   node services/shared/database/apply-indexes.js
 *   Or call from service initialization
 */

const mongoose = require('mongoose');
const indexDefinitions = require('./index-definitions');

/**
 * Apply indexes to a collection
 * @param {string} databaseUri - MongoDB connection string
 * @param {string} collectionName - Collection name
 * @param {Array} indexes - Array of index definitions
 */
async function applyIndexes(databaseUri, collectionName, indexes) {
  try {
    const conn = await mongoose.createConnection(databaseUri).asPromise();
    const collection = conn.collection(collectionName);

    console.log(`\n📊 Applying indexes to ${collectionName}...`);

    for (const indexDef of indexes) {
      try {
        const indexName = await collection.createIndex(
          indexDef.fields,
          indexDef.options || {}
        );
        console.log(`  ✅ ${indexName}`);
      } catch (error) {
        if (error.code === 85 || error.code === 86) {
          // Index already exists or options differ
          console.log(`  ℹ️  Index exists: ${JSON.stringify(indexDef.fields)}`);
        } else {
          console.error(`  ❌ Failed: ${error.message}`);
        }
      }
    }

    await conn.close();
    console.log(`✅ Completed ${collectionName}`);
  } catch (error) {
    console.error(`❌ Error applying indexes to ${collectionName}:`, error.message);
  }
}

/**
 * Apply all indexes for a service
 * @param {string} serviceName - Service name
 * @param {string} databaseUri - MongoDB connection URI
 */
async function applyServiceIndexes(serviceName, databaseUri) {
  const serviceIndexes = indexDefinitions[serviceName];

  if (!serviceIndexes) {
    console.warn(`⚠️  No index definitions found for service: ${serviceName}`);
    return;
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  Applying Indexes for: ${serviceName.toUpperCase()}`);
  console.log(`${'═'.repeat(60)}`);

  for (const [collectionName, indexes] of Object.entries(serviceIndexes)) {
    await applyIndexes(databaseUri, collectionName, indexes);
  }

  console.log(`\n✅ All indexes applied for ${serviceName}`);
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Index Application...\n');

  const services = [
    {
      name: 'analytics',
      uri: process.env.MONGODB_URI || 'mongodb://mongodb:27017/analytics'
    },
    {
      name: 'geolocation',
      uri: process.env.MONGODB_URI || 'mongodb://mongodb:27017/geolocation'
    },
    {
      name: 'surveyor',
      uri: process.env.MONGODB_URI || 'mongodb://mongodb:27017/surveyor-service'
    },
    {
      name: 'project',
      uri: process.env.MONGODB_URI || 'mongodb://mongodb:27017/projects'
    },
    {
      name: 'notification',
      uri: process.env.MONGODB_URI || 'mongodb://mongodb:27017/notifications'
    },
    {
      name: 'admin',
      uri: process.env.MONGODB_URI || 'mongodb://mongodb:27017/admin_service'
    }
  ];

  for (const service of services) {
    try {
      await applyServiceIndexes(service.name, service.uri);
    } catch (error) {
      console.error(`Failed to apply indexes for ${service.name}:`, error);
    }
  }

  console.log('\n✅ Index application completed!');
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  applyIndexes,
  applyServiceIndexes
};
