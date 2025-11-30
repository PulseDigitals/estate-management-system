/**
 * Chart of Accounts Migration Script
 * This script updates the Chart of Accounts to the new Modified Cash-Based structure
 * for Magodo Residents Association - South East Zone
 * 
 * Run this with: npx tsx server/migrate-chart-of-accounts.ts
 */

import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function migrateChartOfAccounts() {
  console.log('🚀 Starting Chart of Accounts Migration...\n');
  
  const sql = neon(databaseUrl!);
  
  try {
    // Read the SQL migration file
    const sqlFilePath = path.join(__dirname, 'seed-new-chart-complete.sql');
    const migrationSQL = fs.readFileSync(sqlFilePath, 'utf-8');
    
    // Remove comment-only lines first
    const cleanedSQL = migrationSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--') || line.trim().length === 0)
      .join('\n');
    
    // Split the SQL into individual statements (split by semicolon)
    const statements = cleanedSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
    
    // Execute each statement
    let successCount = 0;
    let skipCount = 0;
    
    for (const statement of statements) {
      // Skip comment-only lines
      if (statement.trim().startsWith('--')) {
        continue;
      }
      
      try {
        // Execute the statement
        await sql(statement);
        
        // Count inserts for reporting
        if (statement.toUpperCase().includes('INSERT INTO')) {
          successCount++;
        }
        
      } catch (error: any) {
        // Handle duplicate key errors gracefully (account already exists)
        if (error.message?.includes('duplicate key') || error.message?.includes('already exists')) {
          skipCount++;
          continue;
        } else {
          console.error(`❌ Error executing statement:`, statement.substring(0, 100) + '...');
          console.error(`Error: ${error.message}\n`);
          throw error;
        }
      }
    }
    
    console.log('✅ Migration completed successfully!\n');
    console.log(`📊 Summary:`);
    console.log(`   - New accounts created: ${successCount}`);
    console.log(`   - Accounts skipped (already exist): ${skipCount}`);
    console.log(`\n💡 Note: Old accounts have been deactivated to preserve historical data`);
    console.log(`   You can view them in the Chart of Accounts page (they will be marked as inactive)\n`);
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
migrateChartOfAccounts()
  .then(() => {
    console.log('✨ Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
