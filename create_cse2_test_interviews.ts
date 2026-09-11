import 'dotenv/config';
import { db } from './server/db';
import { users, interviews, interviewQuestions } from './shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { buildStudentScheduleCredentialsEmail } from './server/email-templates';
import { sendEmail } from './server/email';

async function run() {
  console.log("🚀 Starting Slot Allotment & Interview Setup for CSE-2 (23JK1A0565 - 23JK1A05C6)...");

  // 1. Load exported CSE-2 student dataset
  const jsonPath = path.join(process.cwd(), 'scratch', 'cse2_students.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Dataset file not found at ${jsonPath}. Run python scratch/export_cse2_data.py first.`);
  }

  const studentMap: Record<string, { roll: string; name: string; email: string }> = JSON.parse(
    fs.readFileSync(jsonPath, 'utf-8')
  );

  const rolls = Object.keys(studentMap).sort();
  console.log(`📋 Loaded ${rolls.length} CSE-2 students from dataset.`);

  // 2. Define batch slot windows (20-min slots for today 13-08-2026)
  const slotWindows = [
    { start: '19:00', end: '19:20' },
    { start: '19:20', end: '19:40' },
    { start: '19:40', end: '20:00' },
    { start: '20:00', end: '20:20' },
    { start: '20:20', end: '20:40' },
    { start: '20:40', end: '21:00' }
  ];

  // Curated 15-question template for CSE-2 (Computer Science Engineering)
  const getCse2Questions = (studentName: string, rollNumber: string) => [
    {
      round: 'communication',
      q: `Welcome ${studentName} (${rollNumber}) to CONLOQUIUM '26! Please introduce yourself to the panel, highlighting your passion for Computer Science Engineering, key projects you have built, and your career aspirations.`
    },
    {
      round: 'communication',
      q: 'Explain the fundamental difference between Frontend and Backend development in web applications using a real-world restaurant analogy.'
    },
    {
      round: 'behavioral',
      q: 'Describe a situation where you faced a tough bug or technical blocker in a group coding project. How did you diagnose, debug, and resolve the issue?'
    },
    {
      round: 'behavioral',
      q: 'How do you divide tasks and collaborate effectively with peers when building a software application or preparing a technical presentation under tight deadlines?'
    },
    {
      round: 'behavioral',
      q: 'What new programming language, framework, or cloud tool are you currently learning or planning to master on your own this semester?'
    },
    {
      round: 'technical',
      q: 'What is the difference between Stack Memory and Heap Memory in C/C++/Java? Which memory segment is managed dynamically and how does garbage collection work?'
    },
    {
      round: 'technical',
      q: 'What is Big-O notation? Compare the Time and Space Complexities of Linear Search vs Binary Search, and explain why Binary Search requires a sorted array.'
    },
    {
      round: 'technical',
      q: 'Explain the structural differences between an Array and a Singly Linked List. Compare their time complexities for element insertion, deletion, and random access.'
    },
    {
      round: 'technical',
      q: 'What is a Binary Search Tree (BST)? Explain its insertion and search properties, and what happens to search time efficiency if the tree becomes skewed.'
    },
    {
      round: 'technical',
      q: 'Explain the 4 fundamental pillars of Object-Oriented Programming (OOP): Encapsulation, Abstraction, Inheritance, and Polymorphism with practical real-world code examples.'
    },
    {
      round: 'technical',
      q: 'What is the difference between SQL (Relational) databases like PostgreSQL/MySQL and NoSQL databases like MongoDB? Explain ACID properties vs BASE model.'
    },
    {
      round: 'technical',
      q: 'Explain the fundamental difference between a Process and a Thread. How do multi-threading, context switching, and deadlock prevention work in modern operating systems?'
    },
    {
      round: 'technical',
      q: 'Compare TCP (Transmission Control Protocol) and UDP (User Datagram Protocol). Why is TCP connection-oriented and where is UDP preferred?'
    },
    {
      round: 'technical',
      q: 'Explain Git version control workflow: What is the difference between git fetch and git pull, and how do you resolve a Git merge conflict?'
    },
    {
      round: 'hr',
      q: 'Where do you see yourself professionally in 3 to 5 years in the software engineering industry, and what technical and leadership milestones do you aspire to achieve?'
    }
  ];

  const allUsers = await db.select().from(users);

  console.log(`\n⚙️ Executing Database Upserts, Question Creation & Email Generation...\n`);

  let successCount = 0;
  let emailCount = 0;

  for (let idx = 0; idx < rolls.length; idx++) {
    const rollUpper = rolls[idx].toUpperCase();
    const stInfo = studentMap[rollUpper];
    const studentName = stInfo.name;
    const emailLower = stInfo.email.toLowerCase();

    // Assign slot window based on index (10 students per slot window)
    const slotIdx = Math.floor(idx / 10);
    const slotWindow = slotWindows[Math.min(slotIdx, slotWindows.length - 1)];

    let u = allUsers.find(x =>
      (x.rollNumber || '').toUpperCase() === rollUpper ||
      (x.email || '').toLowerCase() === emailLower
    );

    let userId: string;

    if (u) {
      userId = u.id;
      await db.update(users).set({
        rollNumber: rollUpper,
        firstName: studentName.split(' ')[0] || rollUpper,
        lastName: studentName.split(' ').slice(1).join(' ') || 'Candidate',
        department: 'CSE-2',
        slotDate: '13-08-2026',
        slotStartTime: slotWindow.start,
        slotEndTime: slotWindow.end,
        slotStatus: 'active'
      }).where(eq(users.id, userId));
      console.log(`[${idx+1}/${rolls.length}] 🔄 Updated CSE-2 user: ${rollUpper} (${studentName}) -> Slot: ${slotWindow.start}-${slotWindow.end}`);
    } else {
      const hashedPassword = await bcrypt.hash(rollUpper, 10);
      const [newUser] = await db.insert(users).values({
        rollNumber: rollUpper,
        firstName: studentName.split(' ')[0] || rollUpper,
        lastName: studentName.split(' ').slice(1).join(' ') || 'Candidate',
        email: emailLower,
        passwordHash: hashedPassword,
        department: 'CSE-2',
        slotDate: '13-08-2026',
        slotStartTime: slotWindow.start,
        slotEndTime: slotWindow.end,
        slotStatus: 'active'
      }).returning();
      userId = newUser.id;
      console.log(`[${idx+1}/${rolls.length}] ✨ Created new CSE-2 user: ${rollUpper} (${studentName}) -> Slot: ${slotWindow.start}-${slotWindow.end}`);
    }

    // Reset & recreate test interview for student
    const userInvs = await db.select().from(interviews).where(eq(interviews.userId, userId));
    for (const inv of userInvs) {
      await db.delete(interviewQuestions).where(eq(interviewQuestions.interviewId, inv.id));
      await db.delete(interviews).where(eq(interviews.id, inv.id));
    }

    const [newInv] = await db.insert(interviews).values({
      userId: userId,
      type: 'technical',
      types: ['communication', 'technical', 'hr'],
      difficulty: 'medium',
      company: "CONLOQUIUM '26 — CSE-2 Campus Placement Drive",
      status: 'pending',
      simulationMode: 'combined',
      trendingEnabled: true,
    }).returning();

    const questions = getCse2Questions(studentName, rollUpper);
    for (let qIdx = 0; qIdx < questions.length; qIdx++) {
      await db.insert(interviewQuestions).values({
        interviewId: newInv.id,
        question: questions[qIdx].q,
        round: questions[qIdx].round,
        orderIndex: qIdx,
      });
    }

    successCount++;

    // Build and send notification email
    const emailPayload = buildStudentScheduleCredentialsEmail({
      studentName: studentName,
      rollNumber: rollUpper,
      scheduledDate: '13 August 2026',
      scheduledTime: `${slotWindow.start} - ${slotWindow.end}`,
      department: 'CSE-2'
    });

    const emailSent = await sendEmail({
      to: emailLower,
      subject: emailPayload.subject,
      html: emailPayload.html
    });

    if (emailSent) emailCount++;
  }

  console.log(`\n==================================================`);
  console.log(`🎉 SUCCESS: CSE-2 Slot Allotment & Interview Setup Complete!`);
  console.log(`   Total Candidates Provisioned: ${successCount}`);
  console.log(`   Emails Sent via Brevo API: ${emailCount}`);
  console.log(`   Drive Event: CONLOQUIUM '26 — CSE-2 Campus Placement Drive`);
  console.log(`   Slot Date: 13-08-2026 (Staggered 19:00 - 21:00)`);
  console.log(`==================================================\n`);

  process.exit(0);
}

run().catch(e => {
  console.error('❌ Failed to set up CSE-2 interviews:', e);
  process.exit(1);
});
