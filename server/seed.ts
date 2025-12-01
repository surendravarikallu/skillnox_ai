/**
 * Seed script to create test users (admin and students)
 * Run with: tsx server/seed.ts
 */

// Load environment variables FIRST - before any other imports
import "./load-env";

// Now import modules that depend on env vars
import { storage } from "./storage";
import { hashPassword } from "./auth";

const testUsers = [
  {
    email: "admin@interviewai.com",
    password: "admin123",
    firstName: "Admin",
    lastName: "User",
    role: "admin" as const,
  },
  {
    email: "student1@interviewai.com",
    password: "student123",
    firstName: "John",
    lastName: "Doe",
    role: "student" as const,
    year: 3,
    department: "Computer Science",
    college: "Tech University",
  },
  {
    email: "student2@interviewai.com",
    password: "student123",
    firstName: "Jane",
    lastName: "Smith",
    role: "student" as const,
    year: 4,
    department: "Information Technology",
    college: "Tech University",
  },
  {
    email: "student3@interviewai.com",
    password: "student123",
    firstName: "Alex",
    lastName: "Johnson",
    role: "student" as const,
    year: 2,
    department: "Computer Science",
    college: "Tech University",
  },
];

async function seedUsers() {
  console.log("=".repeat(60));
  console.log("Seeding Test Users");
  console.log("=".repeat(60));

  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error("\n❌ ERROR: DATABASE_URL not set!");
    console.log("\nPlease update .env file with your database connection string");
    console.log("\nExample:");
    console.log("  DATABASE_URL=postgresql://user:password@localhost:5432/dbname");
    console.log("\nOr use a cloud database (Neon, Supabase, etc.)");
    process.exit(1);
  }

  try {
    for (const userData of testUsers) {
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      
      if (existingUser) {
        console.log(`⚠ User ${userData.email} already exists, skipping...`);
        continue;
      }

      // Hash password
      const passwordHash = await hashPassword(userData.password);

      // Create user
      const user = await storage.upsertUser({
        email: userData.email,
        passwordHash,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        year: userData.year || null,
        department: userData.department || null,
        college: userData.college || null,
      } as any);

      console.log(`✓ Created ${userData.role}: ${userData.email}`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("✓ Seeding complete!");
    console.log("=".repeat(60));
    console.log("\nTest Accounts Created:");
    console.log("\n📧 Admin Account:");
    console.log("   Email: admin@interviewai.com");
    console.log("   Password: admin123");
    console.log("\n👨‍🎓 Student Accounts:");
    console.log("   Email: student1@interviewai.com");
    console.log("   Password: student123");
    console.log("   Email: student2@interviewai.com");
    console.log("   Password: student123");
    console.log("   Email: student3@interviewai.com");
    console.log("   Password: student123");
    console.log("\n" + "=".repeat(60));

  } catch (error) {
    console.error("Error seeding users:", error);
    process.exit(1);
  }
}

// Run seed
seedUsers()
  .then(() => {
    console.log("\n✓ Seed script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("✗ Seed script failed:", error);
    process.exit(1);
  });

