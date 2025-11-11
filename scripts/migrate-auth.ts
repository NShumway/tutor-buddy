import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const defaultPassword = 'password123';

async function migrateExistingStudents() {
  console.log('🔄 Migrating existing students to Supabase Auth...');

  // Fetch all existing students
  const { data: students, error: fetchError } = await supabase
    .from('students')
    .select('*');

  if (fetchError) {
    console.error('Error fetching students:', fetchError);
    return;
  }

  if (!students || students.length === 0) {
    console.log('No students found to migrate');
    return;
  }

  console.log(`Found ${students.length} students to migrate`);

  for (const student of students) {
    console.log(`\nProcessing ${student.email}...`);

    // Check if auth user already exists
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error(`Error listing users:`, listError);
      continue;
    }

    const existingAuthUser = users.find(u => u.email === student.email);

    if (existingAuthUser) {
      console.log(`  ✓ Auth user already exists for ${student.email}`);

      // Update student ID to match auth user ID if different
      if (student.id !== existingAuthUser.id) {
        console.log(`  ⚠ Student ID mismatch. Auth ID: ${existingAuthUser.id}, Student ID: ${student.id}`);
        console.log(`  → Skipping ID update to preserve data integrity`);
      }
      continue;
    }

    // Create auth user with the same ID as the student record
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: student.email,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: {
        name: student.name,
      },
    });

    if (authError) {
      console.error(`  ✗ Error creating auth user:`, authError);
      continue;
    }

    console.log(`  ✓ Created auth user for ${student.email}`);

    // Update the student record to use the auth user's ID
    const { error: updateError } = await supabase
      .from('students')
      .update({ id: authData.user.id })
      .eq('id', student.id);

    if (updateError) {
      console.error(`  ✗ Error updating student ID:`, updateError);
      // Rollback: delete the auth user we just created
      await supabase.auth.admin.deleteUser(authData.user.id);
      continue;
    }

    console.log(`  ✓ Updated student record to use auth ID`);
  }

  console.log('\n✅ Migration complete!');
  console.log('\nAll demo accounts now use password: password123');
}

migrateExistingStudents().catch(console.error);
