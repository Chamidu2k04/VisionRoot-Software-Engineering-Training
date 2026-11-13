import fs from 'node:fs';
import path from 'node:path';
import { query, closePool } from './connection';

/**
 * Resolves the directory containing SQL migration files across different execution contexts.
 */
function resolveMigrationsDirectory(): string {
  const candidatePaths = [
    path.resolve(__dirname, '../../../database/migrations'),
    path.resolve(__dirname, '../../database/migrations'),
    path.resolve(process.cwd(), '../database/migrations'),
    path.resolve(process.cwd(), 'database/migrations'),
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
  }

  // Fallback to default expected path
  return path.resolve(__dirname, '../../../database/migrations');
}

/**
 * Migration runner: reads, sorts, and executes all .sql migration files sequentially.
 */
export async function runMigrations(): Promise<void> {
  const migrationsDir = resolveMigrationsDirectory();
  console.log('====================================================');
  console.log(' PostgreSQL Schema Migration Runner');
  console.log(` Migrations Directory: ${migrationsDir}`);
  console.log('====================================================');

  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found at: ${migrationsDir}`);
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No SQL migration files found to execute.');
    return;
  }

  console.log(`Discovered ${files.length} migration file(s):\n${files.map((f) => `  - ${f}`).join('\n')}\n`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    console.log(`[Migrate] Executing migration: ${file}...`);
    const sql = fs.readFileSync(filePath, 'utf-8');

    const startTime = Date.now();
    await query(sql);
    const duration = Date.now() - startTime;

    console.log(`[Migrate] Successfully applied: ${file} (${duration}ms)`);
  }

  console.log('\n====================================================');
  console.log('>>> ALL MIGRATIONS APPLIED SUCCESSFULLY! <<<');
  console.log('====================================================');
}

// Execute directly if run as a script
if (require.main === module || process.argv[1]?.includes('migrate')) {
  runMigrations()
    .then(async () => {
      await closePool();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error('\n[Migration Error] Migration failed:', error instanceof Error ? error.message : error);
      await closePool().catch(() => {});
      process.exit(1);
    });
}
