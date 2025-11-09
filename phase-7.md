# Phase 7: Mock Data + Deployment

**Goal**: Seed the database with realistic mock data for demonstration purposes and deploy the application to Vercel for production use.

**Duration**: ~2 days

## Requirements

1. Create comprehensive seed data:
   - Multiple students with varied profiles
   - Tutoring sessions with realistic transcripts
   - Goals (active and completed)
   - Practice attempts with varied accuracy
   - Chat messages
   - Tutor flags
2. Build database seeding script
3. Generate embeddings for all seeded transcripts
4. Configure production environment
5. Deploy to Vercel
6. Test end-to-end in production
7. Document demo flow for stakeholders

## Mock Data Structure

### Students (5 profiles)

1. **Sarah Johnson** - High performer
   - Email: sarah@example.com
   - Signup: 45 days ago
   - Session count: 8
   - Goals: SAT_Math (completed), College_Essays (active)

2. **Marcus Chen** - Needs nudge
   - Email: marcus@example.com
   - Signup: 6 days ago
   - Session count: 2
   - Goals: AP_Chemistry (active)

3. **Emily Rodriguez** - Struggling student
   - Email: emily@example.com
   - Signup: 20 days ago
   - Session count: 5
   - Goals: SAT_Math (active, low accuracy)

4. **David Kim** - Multi-goal learner
   - Email: david@example.com
   - Signup: 30 days ago
   - Session count: 12
   - Goals: AP_Physics (active), AP_Calculus (active), SAT_Math (completed)

5. **Isabella Martinez** - Inactive student
   - Email: isabella@example.com
   - Signup: 60 days ago
   - Session count: 3
   - Last session: 20 days ago
   - Goals: SAT_Verbal (paused)

### Tutoring Sessions (3-5 per student)

Sample transcripts for different subjects:
- SAT Math (algebra, geometry, statistics)
- AP Chemistry (stoichiometry, equilibrium)
- College Essays (brainstorming, structure)

### Practice Attempts (20-50 per student)

Varied patterns:
- High performers: 75-90% accuracy
- Struggling students: 50-65% accuracy in weak areas
- Mix of categories per goal

### Chat Messages (5-15 per student)

Realistic Q&A conversations about session content

## Implementation Steps

### 1. Create Sample Transcripts

**data/sample-transcripts.json**
```json
{
  "sat_math_1": "Today we focused on quadratic equations. Remember, the standard form is ax² + bx + c = 0. We practiced using the quadratic formula: x = (-b ± √(b² - 4ac)) / 2a. Sarah initially had trouble identifying the coefficients a, b, and c, but after working through five examples together, she mastered it. We also covered factoring when possible - look for two numbers that multiply to ac and add to b. For homework, complete problems 1-15 on page 42, focusing on both the formula and factoring methods.",

  "sat_math_2": "We worked on geometry problems today, specifically triangles and the Pythagorean theorem. The key is recognizing when you have a right triangle: a² + b² = c², where c is the hypotenuse. Sarah struggled with word problems at first but improved once we drew diagrams for each problem. We also covered special right triangles: 30-60-90 (sides in ratio 1:√3:2) and 45-45-90 (sides in ratio 1:1:√2). Practice: complete the triangle worksheet, and always start by drawing a picture!",

  "ap_chem_1": "Today's lesson covered stoichiometry and mole calculations. We started with the concept that one mole equals 6.022 × 10²³ particles (Avogadro's number). Marcus understood the math but struggled with setting up dimensional analysis correctly. The key is to always write units and cancel them systematically. We worked through several problems converting between grams, moles, and particles. For the reaction 2H₂ + O₂ → 2H₂O, we calculated how many grams of water form from 4 grams of hydrogen. Practice more dimensional analysis problems from chapter 3.",

  "college_essay_1": "We brainstormed essay topics today. Sarah has great experiences to write about: her volunteer work at the animal shelter and her robotics team project. The key is to show personal growth and reflection, not just list accomplishments. We discussed the 'show, don't tell' principle - use specific details and dialogue to bring stories to life. For next session: write a rough draft of the opening paragraph for the robotics essay, focusing on a specific moment when you faced a challenge."
}
```

### 2. Create Seeding Script

**scripts/seed.ts**
```typescript
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
  signup_date: string;
  session_count: number;
}

const students: Student[] = [
  {
    email: 'sarah@example.com',
    name: 'Sarah Johnson',
    signup_date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    session_count: 8,
  },
  {
    email: 'marcus@example.com',
    name: 'Marcus Chen',
    signup_date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    session_count: 2,
  },
  {
    email: 'emily@example.com',
    name: 'Emily Rodriguez',
    signup_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    session_count: 5,
  },
  {
    email: 'david@example.com',
    name: 'David Kim',
    signup_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    session_count: 12,
  },
  {
    email: 'isabella@example.com',
    name: 'Isabella Martinez',
    signup_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    session_count: 3,
  },
];

async function seedDatabase() {
  console.log('🌱 Starting database seed...');

  // 1. Create students
  console.log('Creating students...');
  const { data: createdStudents, error: studentError } = await supabase
    .from('students')
    .insert(students)
    .select();

  if (studentError) {
    console.error('Error creating students:', studentError);
    return;
  }

  console.log(`✓ Created ${createdStudents.length} students`);

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

  const transcripts: any = sampleTranscripts;
  let sessionCount = 0;

  for (const student of createdStudents.slice(0, 3)) {
    // Create 3 sessions per student
    const sessionDates = [
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    ];

    for (let i = 0; i < 3; i++) {
      const transcriptKey = Object.keys(transcripts)[i % Object.keys(transcripts).length];
      const transcript = transcripts[transcriptKey];

      // Create session
      const { data: session, error: sessionError } = await supabase
        .from('tutoring_sessions')
        .insert({
          student_id: student.id,
          transcript,
          session_date: sessionDates[i].toISOString(),
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
      assistant: 'Of course! The quadratic formula is x = (-b ± √(b² - 4ac)) / 2a. In your last session, we used it to solve x² + 5x + 6 = 0. Here, a=1, b=5, c=6. Would you like to work through this example step by step?',
    },
    {
      user: 'What did we cover about stoichiometry?',
      assistant: 'In your session, we covered stoichiometry and mole calculations. The key concept is using dimensional analysis to convert between grams, moles, and particles. Remember Avogadro\'s number: 6.022 × 10²³. You practiced with the reaction 2H₂ + O₂ → 2H₂O. Would you like to review a specific problem?',
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
  console.log('\nPassword: any (mock auth accepts any password)');
}

seedDatabase().catch(console.error);
```

### 3. Create Package Script

Add to **package.json**:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "seed": "tsx scripts/seed.ts"
  }
}
```

Install tsx for running TypeScript scripts:
```bash
npm install -D tsx
```

### 4. Run Seeding Script

```bash
npm run seed
```

This will:
- Create 5 students with varied profiles
- Create 8 goals (active and completed)
- Create 9 tutoring sessions with embeddings
- Create 100+ practice attempts
- Create 12 chat messages
- Create 1 tutor flag

### 5. Pre-Deployment Checklist

**Environment Variables**
- [ ] NEXT_PUBLIC_SUPABASE_URL
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] OPENAI_API_KEY
- [ ] NEXT_PUBLIC_APP_URL (set to Vercel URL)

**Code Quality**
- [ ] All TypeScript errors resolved
- [ ] No console.errors in production code
- [ ] Environment variables properly accessed
- [ ] Error boundaries in place

**Database**
- [ ] All tables created
- [ ] Indexes created
- [ ] RPC functions deployed
- [ ] pgvector extension enabled
- [ ] Row Level Security policies (optional for MVP)

**Testing**
- [ ] Login works with all 5 test accounts
- [ ] Dashboard loads without errors
- [ ] Chat retrieves session context
- [ ] Practice problems load
- [ ] Goals display correctly
- [ ] Retention nudges trigger appropriately

### 6. Deploy to Vercel

**Option A: Vercel CLI**

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Follow prompts, deploy to production
vercel --prod
```

**Option B: GitHub Integration**

1. Push code to GitHub repository
2. Visit [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Configure environment variables
6. Click "Deploy"

**Vercel Configuration**

Create **vercel.json** (optional):
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/:path*"
    }
  ]
}
```

### 7. Post-Deployment Testing

**Smoke Tests**

1. **Authentication**
   - Visit deployed URL
   - Login with sarah@example.com
   - Verify redirect to dashboard

2. **Dashboard**
   - Stats summary displays correct numbers
   - Goals show progress bars
   - Quick actions link correctly

3. **Chat**
   - Navigate to /chat
   - Send message: "What did we cover about quadratics?"
   - Verify RAG retrieves session context
   - Response streams correctly

4. **Practice**
   - Navigate to /practice
   - Complete 5 problems
   - Verify feedback is accurate
   - Check stats update

5. **Goals**
   - View goal progress
   - Check accuracy calculations
   - Verify completion detection

6. **Retention**
   - Login as marcus@example.com
   - Should see retention nudge banner
   - Login as sarah@example.com
   - No nudge (session count sufficient)

### 8. Create Demo Guide

**docs/DEMO_GUIDE.md**
```markdown
# AI Study Companion - Demo Guide

## Demo Flow (10 minutes)

### 1. Problem Statement (1 min)
"Tutoring companies face 52% churn when students complete their initial goal.
Students with fewer than 3 sessions in the first week rarely return.
We built an AI companion to solve this."

### 2. Dashboard Overview (2 min)
Login as: sarah@example.com (any password)

Show:
- Stats summary (active goals, problems solved, accuracy)
- Multi-goal tracking (SAT Math completed, College Essays active)
- Recent activity timeline
- Practice recommendations

### 3. RAG-Powered Chat (2 min)
Navigate to Chat

Ask: "What did we cover about quadratic equations in my last session?"

Highlight:
- AI retrieves specific session context
- References exact problems from transcript
- Encourages booking tutor for complex questions

### 4. Adaptive Practice (2 min)
Navigate to Practice

Show:
- Problems adapt to weak areas
- Immediate feedback with explanations
- Accuracy tracking per category
- Struggling detection (3+ consecutive failures)

### 5. Retention Triggers (2 min)
Logout, login as: marcus@example.com

Show:
- Retention nudge banner (only 2 sessions in 6 days)
- Call-to-action to book next session

Navigate to Goals, complete a goal:
- Show related goal recommendations
- SAT Math → College Essays, SAT Verbal
- Conversion rates based on student patterns

### 6. Impact & ROI (1 min)
"This addresses all three retention drivers:
- Goal completion churn: Recommends related subjects
- Early dropout: Nudges inactive students
- Engagement gap: Daily practice and chat between sessions

Built in 2 weeks. Production-ready. ROI within 90 days."

## Test Accounts

| Email | Profile | Use Case |
|-------|---------|----------|
| sarah@example.com | High performer | Show completed goal, recommendations |
| marcus@example.com | New student | Show retention nudge (2 sessions, day 6) |
| emily@example.com | Struggling | Show tutor flags, weak categories |
| david@example.com | Multi-goal | Show advanced learner, multiple active goals |
| isabella@example.com | Inactive | Show inactivity detection |

All passwords: any (mock auth)

## Key Talking Points

- **Sophisticated AI**: RAG with pgvector, semantic search, context-aware responses
- **Proven retention tactics**: Based on actual churn data (52% "goal achieved")
- **Production-ready**: Deployed on Vercel, Supabase, scales to 1000s of students
- **Fast build**: 2 weeks from idea to deployed demo
- **Clear ROI**: Reduce churn 20% = $X in retained revenue
```

## Acceptance Criteria

- [ ] Database seeded with 5 diverse students
- [ ] All students have goals, sessions, practice attempts
- [ ] Embeddings generated for all transcripts
- [ ] Application deployed to Vercel
- [ ] All environment variables configured in production
- [ ] Login works with all 5 test accounts
- [ ] All features work in production (chat, practice, goals)
- [ ] Demo guide created for stakeholders
- [ ] No critical errors in production logs
- [ ] Performance is acceptable (< 3s page loads)

## Monitoring & Maintenance

**Post-Deployment**

1. Monitor Vercel logs for errors
2. Check OpenAI API usage (stay within budget)
3. Monitor Supabase database size
4. Test daily to ensure services are operational

**Cost Monitoring**

- Vercel: Free tier (100GB bandwidth/month)
- Supabase: Free tier (500MB database)
- OpenAI: ~$5-10/month for testing (monitor usage)

**Scaling Considerations**

If usage exceeds free tiers:
- Vercel Pro: $20/month
- Supabase Pro: $25/month
- OpenAI: Add rate limiting, caching

## Final Notes

This phase completes the end-to-end implementation. The application is now:
- Fully functional
- Deployed to production
- Seeded with realistic demo data
- Ready for stakeholder presentation

Next steps after demo:
- Gather feedback
- Iterate based on user testing
- Integrate with real tutoring platform
- Add production authentication
- Implement real notification system (email/SMS)
- Scale infrastructure as needed
