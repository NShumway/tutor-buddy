import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { generateEmbeddings } from '../lib/openai';
import { chunkText } from '../lib/chunking';
import sampleTranscripts from '../data/sample-transcripts.json';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Student {
  email: string;
  name: string;
  created_at: string;
}

const students: Student[] = [
  {
    email: 'sarah@example.com',
    name: 'Sarah Johnson',
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    email: 'marcus@example.com',
    name: 'Marcus Chen',
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    email: 'emily@example.com',
    name: 'Emily Rodriguez',
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    email: 'david@example.com',
    name: 'David Kim',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    email: 'isabella@example.com',
    name: 'Isabella Martinez',
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

async function seedDatabase() {
  console.log('🌱 Starting database seed...');

  // 1. Create Supabase Auth users and students
  console.log('Creating auth users and student profiles...');
  const createdStudents = [];
  const defaultPassword = 'password123'; // Default password for demo accounts

  for (const student of students) {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: student.email,
      password: defaultPassword,
      email_confirm: true,
    });

    if (authError) {
      console.error(`Error creating auth user for ${student.email}:`, authError);
      continue;
    }

    // Create student record with same ID as auth user
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .insert({
        id: authData.user.id,
        email: student.email,
        name: student.name,
        created_at: student.created_at,
      })
      .select()
      .single();

    if (studentError) {
      console.error(`Error creating student profile for ${student.email}:`, studentError);
      // Rollback: delete auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      continue;
    }

    createdStudents.push(studentData);
  }

  if (createdStudents.length === 0) {
    console.error('No students were created successfully');
    return;
  }

  console.log(`✓ Created ${createdStudents.length} students with auth users`);

  // 2. Create goals for each student
  console.log('Creating goals...');
  const goals = [
    // Sarah - high performer
    {
      student_id: createdStudents[0].id,
      goal_type: 'SAT_Math',
      status: 'completed',
      current_accuracy: 0.88,
      target_accuracy: 0.75,
      problems_completed: 45,
      completed_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      student_id: createdStudents[0].id,
      goal_type: 'College_Essays',
      status: 'active',
      current_accuracy: 0.0,
      target_accuracy: 0.75,
      problems_completed: 0,
    },
    // Marcus - needs nudge
    {
      student_id: createdStudents[1].id,
      goal_type: 'AP_Chemistry',
      status: 'active',
      current_accuracy: 0.62,
      target_accuracy: 0.75,
      problems_completed: 18,
    },
    // Emily - struggling
    {
      student_id: createdStudents[2].id,
      goal_type: 'SAT_Math',
      status: 'active',
      current_accuracy: 0.55,
      target_accuracy: 0.75,
      problems_completed: 32,
    },
    // David - multi-goal
    {
      student_id: createdStudents[3].id,
      goal_type: 'SAT_Math',
      status: 'completed',
      current_accuracy: 0.82,
      target_accuracy: 0.75,
      problems_completed: 50,
      completed_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      student_id: createdStudents[3].id,
      goal_type: 'AP_Physics',
      status: 'active',
      current_accuracy: 0.78,
      target_accuracy: 0.75,
      problems_completed: 38,
    },
    {
      student_id: createdStudents[3].id,
      goal_type: 'AP_Calculus',
      status: 'active',
      current_accuracy: 0.71,
      target_accuracy: 0.75,
      problems_completed: 28,
    },
    // Isabella - inactive
    {
      student_id: createdStudents[4].id,
      goal_type: 'SAT_Verbal',
      status: 'paused',
      current_accuracy: 0.68,
      target_accuracy: 0.75,
      problems_completed: 22,
    },
  ];

  const { data: createdGoals, error: goalsError } = await supabase
    .from('goals')
    .insert(goals)
    .select();

  if (goalsError) {
    console.error('Error creating goals:', goalsError);
    return;
  }

  console.log(`✓ Created ${createdGoals.length} goals`);

  // 3. Create tutoring sessions with embeddings
  console.log('Creating tutoring sessions with embeddings...');

  const transcripts: Record<string, string> = sampleTranscripts;
  const transcriptKeys = Object.keys(transcripts);
  let sessionCount = 0;

  // Create sessions for first 3 students with varied dates
  for (let i = 0; i < 3; i++) {
    const student = createdStudents[i];
    const sessionDates = [
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    ];

    for (let j = 0; j < 3; j++) {
      const transcriptKey = transcriptKeys[(i * 3 + j) % transcriptKeys.length];
      const transcript = transcripts[transcriptKey];

      // Create session
      const { data: session, error: sessionError } = await supabase
        .from('tutoring_sessions')
        .insert({
          student_id: student.id,
          transcript,
          session_date: sessionDates[j].toISOString(),
          duration_minutes: 60,
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Error creating session:', sessionError);
        continue;
      }

      // Generate embeddings
      const chunks = chunkText(transcript, 500, 50);
      const embeddings = await generateEmbeddings(chunks.map((c) => c.text));

      const embeddingRecords = chunks.map((chunk, idx) => ({
        session_id: session.id,
        student_id: student.id,
        chunk_text: chunk.text,
        embedding: JSON.stringify(embeddings[idx]),
        chunk_index: chunk.index,
      }));

      await supabase.from('session_embeddings').insert(embeddingRecords);

      sessionCount++;
      console.log(`  ✓ Session ${sessionCount} created with ${chunks.length} embeddings`);
    }
  }

  // 4. Create practice attempts
  console.log('Creating practice attempts...');

  const categories = [
    'SAT_Math_Algebra',
    'SAT_Math_Geometry',
    'AP_Chem_Stoichiometry',
  ];

  let attemptCount = 0;

  for (const goal of createdGoals.filter((g) => g.problems_completed > 0)) {
    const attemptsToCreate = goal.problems_completed;
    const targetCorrectRate = goal.current_accuracy;

    for (let i = 0; i < attemptsToCreate; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const correct = Math.random() < targetCorrectRate;

      await supabase.from('practice_attempts').insert({
        student_id: goal.student_id,
        goal_id: goal.id,
        problem_id: `problem_${Math.floor(Math.random() * 1000)}`,
        category,
        correct,
        student_answer: correct ? 'correct_answer' : 'wrong_answer',
        time_spent_seconds: Math.floor(Math.random() * 120) + 30,
      });

      attemptCount++;
    }
  }

  console.log(`✓ Created ${attemptCount} practice attempts`);

  // 5. Create chat messages
  console.log('Creating chat messages...');

  const sampleConversations = [
    {
      user: 'Can you explain the quadratic formula again?',
      assistant:
        "Of course! The quadratic formula is x = (-b ± √(b² - 4ac)) / 2a. In your last session, we used it to solve x² + 5x + 6 = 0. Here, a=1, b=5, c=6. Would you like to work through this example step by step?",
    },
    {
      user: 'What did we cover about stoichiometry?',
      assistant:
        "In your session, we covered stoichiometry and mole calculations. The key concept is using dimensional analysis to convert between grams, moles, and particles. Remember Avogadro's number: 6.022 × 10²³. You practiced with the reaction 2H₂ + O₂ → 2H₂O. Would you like to review a specific problem?",
    },
  ];

  let messageCount = 0;

  for (const student of createdStudents.slice(0, 3)) {
    for (const conv of sampleConversations) {
      await supabase.from('chat_messages').insert([
        {
          student_id: student.id,
          role: 'user',
          content: conv.user,
        },
        {
          student_id: student.id,
          role: 'assistant',
          content: conv.assistant,
        },
      ]);
      messageCount += 2;
    }
  }

  console.log(`✓ Created ${messageCount} chat messages`);

  // 6. Create tutor flags for struggling student
  console.log('Creating tutor flags...');

  await supabase.from('tutor_flags').insert({
    student_id: createdStudents[2].id, // Emily - struggling
    flag_type: 'struggling',
    category: 'SAT_Math_Algebra',
    message: 'Student failed 4 consecutive algebra problems',
    resolved: false,
  });

  console.log('✓ Created tutor flag');

  console.log('\n✅ Database seeding complete!');
  console.log('\nTest accounts:');
  console.log('- sarah@example.com (high performer)');
  console.log('- marcus@example.com (needs nudge)');
  console.log('- emily@example.com (struggling)');
  console.log('- david@example.com (multi-goal)');
  console.log('- isabella@example.com (inactive)');
  console.log('\nDefault password for all demo accounts: password123');
}

seedDatabase().catch(console.error);
