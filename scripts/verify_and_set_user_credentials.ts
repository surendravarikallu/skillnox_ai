import 'dotenv/config';
import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq, or } from 'drizzle-orm';
import { hashPassword, comparePassword } from '../server/auth';

async function main() {
  console.log("Checking credentials for 23JK1A05I7 and admin...");

  // 1. Check/Set Student 23JK1A05I7
  const studentRoll = "23JK1A05I7";
  const studentPass = "23JK1A05I7";
  const studentEmail = `${studentRoll}@students.local`;

  let [existingStudent] = await db.select().from(users).where(
    or(
      eq(users.rollNumber, studentRoll),
      eq(users.email, studentEmail)
    )
  );

  const studentHash = await hashPassword(studentPass);

  if (existingStudent) {
    console.log(`Found student ${existingStudent.id} (${existingStudent.rollNumber || existingStudent.email})`);
    const valid = existingStudent.passwordHash ? await comparePassword(studentPass, existingStudent.passwordHash) : false;
    if (!valid) {
      console.log("Updating student password to 23JK1A05I7...");
      await db.update(users).set({
        passwordHash: studentHash,
        rollNumber: studentRoll,
      }).where(eq(users.id, existingStudent.id));
      console.log("✓ Student password updated.");
    } else {
      console.log("✓ Student password already matches 23JK1A05I7.");
    }
  } else {
    console.log("Student not found, creating student 23JK1A05I7...");
    await db.insert(users).values({
      email: studentEmail,
      rollNumber: studentRoll,
      passwordHash: studentHash,
      firstName: "Student",
      lastName: "Candidate",
      role: "student",
      department: "CSE",
      year: "4",
    });
    console.log("✓ Created student 23JK1A05I7.");
  }

  // 2. Check/Set Admin admin / tpcell@2026
  const adminIdentifier = "admin";
  const adminPass = "tpcell@2026";
  const adminEmail = "admin@interviewai.com";

  let [existingAdmin] = await db.select().from(users).where(
    or(
      eq(users.email, adminEmail),
      eq(users.email, "admin@skillnox.ai"),
      eq(users.role, "admin")
    )
  );

  const adminHash = await hashPassword(adminPass);

  if (existingAdmin) {
    console.log(`Found admin ${existingAdmin.id} (${existingAdmin.email})`);
    console.log("Updating admin password to tpcell@2026...");
    await db.update(users).set({
      passwordHash: adminHash,
      role: "admin",
    }).where(eq(users.id, existingAdmin.id));
    console.log("✓ Admin password updated to tpcell@2026.");
  } else {
    console.log("Admin not found, creating admin account...");
    await db.insert(users).values({
      email: adminEmail,
      passwordHash: adminHash,
      firstName: "Placement",
      lastName: "Officer",
      role: "admin",
      department: "T&P Cell",
    });
    console.log("✓ Created admin with password tpcell@2026.");
  }

  process.exit(0);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
