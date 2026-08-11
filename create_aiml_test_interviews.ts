import { db } from './server/db';
import { users, interviews, interviewQuestions } from './shared/schema';
import { eq, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function run() {
  process.env.DATABASE_URL = 'postgresql://postgres:admin@127.0.0.1:5432/interviewai';

  const targetRolls = ['23JK1A05I7', '23JK1A05H4', '23JK1A05I5'];

  const testQuestions = [
    {
      round: 'communication',
      q: 'Tell me about yourself, your technical background in AI & Machine Learning, and what unique perspective or qualities set you apart from your peers.'
    },
    {
      round: 'technical',
      q: 'What is the difference between Supervised, Unsupervised, and Reinforcement Learning? Give one practical example of each.'
    },
    {
      round: 'technical',
      q: 'Explain what Overfitting means in Machine Learning models, and how techniques like Regularization (L1/L2) help prevent it.'
    },
    {
      round: 'communication',
      q: 'How would you explain a complex Machine Learning model\'s predictions to a non-technical stakeholder or business client?'
    },
    {
      round: 'hr',
      q: 'Where do you see yourself 3 to 5 years from now in your AI & Machine Learning career, and what technical skills do you plan to master?'
    },
    {
      round: 'hr',
      q: 'On a scale of 0 to 100%, what overall percentage score would you rate for yourself for your performance in this interview session today, and what is your rationale?'
    }
  ];

  const allUsers = await db.select().from(users);

  for (const roll of targetRolls) {
    const rollUpper = roll.toUpperCase();
    const emailLower = roll.toLowerCase() + '@gmail.com';

    let u = allUsers.find(x => 
      (x.rollNumber || '').toUpperCase() === rollUpper ||
      (x.email || '').toLowerCase() === emailLower
    );

    let userId: string;

    if (u) {
      userId = u.id;
      await db.update(users).set({
        rollNumber: rollUpper,
        slotDate: '10-08-2026',
        slotStartTime: '00:00',
        slotEndTime: '23:59',
        slotStatus: 'active'
      }).where(eq(users.id, userId));
      console.log(`🔄 Updated slot date to TODAY for ${rollUpper} (ID: ${userId})`);
    } else {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const [newUser] = await db.insert(users).values({
        rollNumber: rollUpper,
        firstName: rollUpper,
        lastName: 'Candidate',
        email: emailLower,
        passwordHash: hashedPassword,
        department: 'CSE-AIML',
        slotDate: '10-08-2026',
        slotStartTime: '00:00',
        slotEndTime: '23:59',
        slotStatus: 'active'
      }).returning();
      userId = newUser.id;
      console.log(`✨ Created new user for ${rollUpper} (ID: ${userId})`);
    }

    // Delete existing test interviews for fresh session
    const userInvs = await db.select().from(interviews).where(eq(interviews.userId, userId));
    for (const inv of userInvs) {
      await db.delete(interviewQuestions).where(eq(interviewQuestions.interviewId, inv.id));
      await db.delete(interviews).where(eq(interviews.id, inv.id));
    }

    // Create fresh pending test interview
    const [newInv] = await db.insert(interviews).values({
      userId: userId,
      type: 'technical',
      types: ['communication', 'technical', 'hr'],
      difficulty: 'medium',
      company: 'CONLOQUIUM \'26 AIML Drive (Test Session)',
      status: 'pending',
      simulationMode: 'combined',
      trendingEnabled: true,
    }).returning();

    for (let idx = 0; idx < testQuestions.length; idx++) {
      await db.insert(interviewQuestions).values({
        interviewId: newInv.id,
        question: testQuestions[idx].q,
        round: testQuestions[idx].round,
        orderIndex: idx,
      });
    }

    console.log(`✅ [${rollUpper}] UNLOCKED FOR TESTING TODAY!`);
    console.log(`   Interview ID: ${newInv.id}`);
    console.log(`   Local URL:  http://localhost:5070/interview/${newInv.id}/room`);
    console.log(`   Prod URL:   https://skillnoxai.kitaghire.in/interview/${newInv.id}/room\n`);
  }

  process.exit(0);
}

run().catch(e => {
  console.error('Failed to create test interviews:', e);
  process.exit(1);
});
