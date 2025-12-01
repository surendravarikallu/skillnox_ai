/**
 * Test script to verify Python AI service connection from Node.js
 * Run with: npx tsx server/test-python-connection.ts
 */

import * as pythonAI from "./pythonAI";

async function testConnection() {
  console.log("\n" + "=".repeat(60));
  console.log("Testing Python AI Service Connection");
  console.log("=".repeat(60));

  const PYTHON_AI_SERVICE_URL = process.env.PYTHON_AI_SERVICE_URL || 'http://localhost:8000';

  // Test 1: Health check
  console.log("\n1. Testing health endpoint...");
  try {
    const healthResponse = await fetch(`${PYTHON_AI_SERVICE_URL}/health`);
    if (healthResponse.ok) {
      const data = await healthResponse.json();
      console.log(`✅ Health check passed:`, data);
    } else {
      console.log(`❌ Health check failed: ${healthResponse.status}`);
      return false;
    }
  } catch (error: any) {
    console.log(`❌ Cannot connect to Python service: ${error.message}`);
    console.log(`   Make sure Python service is running on ${PYTHON_AI_SERVICE_URL}`);
    console.log(`   Start it with: cd python-ai && python services/api_service.py`);
    return false;
  }

  // Test 2: Question generation
  console.log("\n2. Testing question generation...");
  try {
    const question = await pythonAI.generateQuestion("technical");
    if (question) {
      console.log(`✅ Question generated: ${question.substring(0, 100)}...`);
    } else {
      console.log(`❌ Question generation returned null`);
      return false;
    }
  } catch (error: any) {
    console.log(`❌ Error generating question: ${error.message}`);
    return false;
  }

  // Test 3: Answer evaluation
  console.log("\n3. Testing answer evaluation...");
  try {
    const result = await pythonAI.evaluateAnswer(
      "Object-Oriented Programming is a programming paradigm based on objects.",
      "What is OOP?"
    );
    if (result) {
      console.log(`✅ Answer evaluated: Score=${result.score}, Feedback=${result.feedback?.substring(0, 50)}...`);
    } else {
      console.log(`❌ Answer evaluation returned null`);
      return false;
    }
  } catch (error: any) {
    console.log(`❌ Error evaluating answer: ${error.message}`);
    return false;
  }

  // Test 4: Resume parsing
  console.log("\n4. Testing resume parsing...");
  try {
    const result = await pythonAI.parseResume("John Doe\nSoftware Engineer\nSkills: Python, JavaScript");
    if (result) {
      console.log(`✅ Resume parsed: Skills found=${result.skills?.length || 0}`);
    } else {
      console.log(`⚠️  Resume parsing returned null (may be expected if model not trained)`);
    }
  } catch (error: any) {
    console.log(`⚠️  Resume parsing error (may be expected): ${error.message}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ All connection tests passed!");
  console.log("=".repeat(60));
  return true;
}

// Run tests
testConnection()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("\n❌ Test suite failed:", error);
    process.exit(1);
  });

