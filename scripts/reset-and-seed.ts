import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function resetDatabase() {
  console.log('🗑️  Clearing all data...');

  // Delete in reverse order of dependencies
  await supabase.from('chat_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('  ✓ Cleared chat_messages');

  await supabase.from('tutor_flags').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('  ✓ Cleared tutor_flags');

  await supabase.from('practice_attempts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('  ✓ Cleared practice_attempts');

  await supabase.from('session_embeddings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('  ✓ Cleared session_embeddings');

  await supabase.from('tutoring_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('  ✓ Cleared tutoring_sessions');

  await supabase.from('goals').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('  ✓ Cleared goals');

  await supabase.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('  ✓ Cleared students');

  // Delete all auth users
  const { data: { users } } = await supabase.auth.admin.listUsers();
  for (const user of users) {
    await supabase.auth.admin.deleteUser(user.id);
  }
  console.log('  ✓ Cleared auth users');

  console.log('✅ Database cleared!\n');
}

async function main() {
  console.log('🔄 Resetting and re-seeding database...\n');

  await resetDatabase();

  console.log('Now running seed script...\n');

  // Import and run seed
  const { execSync } = require('child_process');
  execSync('npx tsx scripts/seed.ts', { stdio: 'inherit' });
}

main().catch(console.error);
