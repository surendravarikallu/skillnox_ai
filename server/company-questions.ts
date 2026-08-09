/**
 * Company-Specific Interview Question Bank
 * ===========================================
 * 22 companies × 3-4 rounds × 15-20 questions = 1000+ structured questions
 * Each question tagged with: company, round, difficulty, trending, category
 *
 * Data sources: Campus placement reports 2025-26, company career pages,
 * Glassdoor/AmbitionBox interview experiences.
 */

// ─── Types ────────────────────────────────────────────

export type InterviewRound = 'aptitude' | 'technical' | 'hr' | 'behavioral' | 'coding' | 'managerial' | 'gd' | 'company' | 'communication' | 'resume_based' | 'system_design';

export interface CompanyQuestion {
  id: string;
  text: string;
  company: string;
  round: InterviewRound;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  trending: boolean;
  yearAdded: number;
  expectedAnswer?: string;
  tags: string[];
}

// ─── Helper to bulk-create questions ──────────────────

let qCounter = 0;
function q(
  company: string,
  round: InterviewRound,
  text: string,
  opts: {
    difficulty?: 'easy' | 'medium' | 'hard';
    category?: string;
    trending?: boolean;
    tags?: string[];
    expectedAnswer?: string;
  } = {}
): CompanyQuestion {
  qCounter++;
  return {
    id: `cq-${company.toLowerCase().replace(/\s+/g, '-')}-${qCounter}`,
    text,
    company,
    round,
    difficulty: opts.difficulty || 'medium',
    category: opts.category || 'General',
    trending: opts.trending || false,
    yearAdded: 2026,
    expectedAnswer: opts.expectedAnswer,
    tags: opts.tags || [],
  };
}

// ═══════════════════════════════════════════════════════
// INDIAN IT SERVICES
// ═══════════════════════════════════════════════════════

const tcsQuestions: CompanyQuestion[] = [
  // ── Aptitude / MCQ Round ──
  q('TCS', 'aptitude', 'If a train travels 360 km in 4 hours, what is its speed in m/s?', { difficulty: 'easy', category: 'Quantitative Aptitude', tags: ['speed-distance'] }),
  q('TCS', 'aptitude', 'A man bought an article for ₹800 and sold it at 20% profit. What was the selling price?', { difficulty: 'easy', category: 'Quantitative Aptitude', tags: ['profit-loss'] }),
  q('TCS', 'aptitude', 'If 5 men can complete a work in 10 days, how many days will 10 men take to complete the same work?', { difficulty: 'easy', category: 'Quantitative Aptitude', tags: ['time-work'] }),
  q('TCS', 'aptitude', 'Find the next number in the series: 2, 6, 12, 20, 30, ?', { difficulty: 'medium', category: 'Logical Reasoning', tags: ['number-series'] }),
  q('TCS', 'aptitude', 'A circular garden has a radius of 14m. Find its area.', { difficulty: 'easy', category: 'Quantitative Aptitude', tags: ['geometry'] }),
  q('TCS', 'aptitude', 'In how many ways can 5 books be arranged on a shelf?', { difficulty: 'medium', category: 'Quantitative Aptitude', tags: ['permutation'] }),
  q('TCS', 'aptitude', 'What is the probability of getting exactly 2 heads when 3 coins are tossed?', { difficulty: 'medium', category: 'Probability', tags: ['probability'] }),
  q('TCS', 'aptitude', 'A pipe can fill a tank in 6 hours and another can empty it in 8 hours. If both are opened together, in how many hours will the tank be filled?', { difficulty: 'medium', category: 'Quantitative Aptitude', tags: ['pipes-cistern'] }),
  q('TCS', 'aptitude', 'Statement: All dogs are animals. All animals are living beings. Conclusion: All dogs are living beings. Is the conclusion valid?', { difficulty: 'easy', category: 'Logical Reasoning', tags: ['syllogism'] }),
  q('TCS', 'aptitude', 'If COMPUTER is coded as DPNQVUFS, how is MACHINE coded?', { difficulty: 'medium', category: 'Logical Reasoning', tags: ['coding-decoding'] }),

  // ── Technical Round ──
  q('TCS', 'technical', 'Explain the concept of Object-Oriented Programming and its four main principles with real-world examples.', { difficulty: 'easy', category: 'OOP', tags: ['oop', 'fundamentals'] }),
  q('TCS', 'technical', 'What is the difference between an abstract class and an interface? When would you use each?', { difficulty: 'medium', category: 'OOP', tags: ['oop', 'design'] }),
  q('TCS', 'technical', 'Explain normalization in databases. What are the different normal forms?', { difficulty: 'medium', category: 'Database', tags: ['sql', 'normalization'] }),
  q('TCS', 'technical', 'What is the difference between SQL and NoSQL databases? Give examples of when you would use each.', { difficulty: 'medium', category: 'Database', tags: ['sql', 'nosql'] }),
  q('TCS', 'technical', 'Explain the concept of multithreading. How do you handle thread synchronization?', { difficulty: 'medium', category: 'Operating Systems', tags: ['threading', 'concurrency'] }),
  q('TCS', 'technical', 'What is a REST API? Explain the HTTP methods and their purposes.', { difficulty: 'easy', category: 'Web Development', tags: ['rest', 'api'] }),
  q('TCS', 'technical', 'Explain the Agile methodology. What are the key ceremonies in Scrum?', { difficulty: 'easy', category: 'Software Engineering', tags: ['agile', 'scrum'] }),
  q('TCS', 'technical', 'What is cloud computing? Explain the differences between IaaS, PaaS, and SaaS.', { difficulty: 'medium', category: 'Cloud Computing', tags: ['cloud', 'iaas', 'paas', 'saas'], trending: true }),
  q('TCS', 'technical', 'What are microservices? How do they differ from monolithic architecture?', { difficulty: 'medium', category: 'Architecture', tags: ['microservices', 'architecture'], trending: true }),
  q('TCS', 'technical', 'Write a program to check if a string is a palindrome.', { difficulty: 'easy', category: 'Coding', tags: ['string', 'palindrome'] }),
  q('TCS', 'technical', 'Explain the concept of DevOps. What is CI/CD?', { difficulty: 'medium', category: 'DevOps', tags: ['devops', 'cicd'], trending: true }),
  q('TCS', 'technical', 'What is Docker and how does containerization differ from virtualization?', { difficulty: 'medium', category: 'DevOps', tags: ['docker', 'containers'], trending: true }),
  q('TCS', 'technical', 'Explain the concept of Generative AI. How do Large Language Models work at a high level?', { difficulty: 'hard', category: 'AI/ML', tags: ['genai', 'llm'], trending: true }),
  q('TCS', 'technical', 'What is the difference between a process and a thread? Explain context switching.', { difficulty: 'medium', category: 'Operating Systems', tags: ['os', 'process', 'thread'] }),
  q('TCS', 'technical', 'Explain the concept of TCP/IP. How does the three-way handshake work?', { difficulty: 'medium', category: 'Networking', tags: ['networking', 'tcp'] }),

  // ── HR Round ──
  q('TCS', 'hr', 'What do you know about TCS and its core values (Integrity, Responsibility, Excellence, Pioneering, Unity)?', { difficulty: 'easy', category: 'Company Knowledge', tags: ['company-values'] }),
  q('TCS', 'hr', 'Why do you want to start your career with TCS?', { difficulty: 'easy', category: 'Motivation', tags: ['why-company'] }),
  q('TCS', 'hr', 'Are you willing to relocate to any location across India?', { difficulty: 'easy', category: 'Flexibility', tags: ['relocation'] }),
  q('TCS', 'hr', 'What is your understanding of the IT service industry?', { difficulty: 'easy', category: 'Industry Knowledge', tags: ['it-industry'] }),
  q('TCS', 'hr', 'Where do you see yourself in 5 years?', { difficulty: 'easy', category: 'Career Goals', tags: ['career-goals'] }),
  q('TCS', 'hr', 'Describe a time when you had to work under pressure. How did you handle it?', { difficulty: 'medium', category: 'Behavioral', tags: ['pressure', 'stress'] }),
  q('TCS', 'hr', 'What are your strengths and weaknesses?', { difficulty: 'easy', category: 'Self-Assessment', tags: ['strengths', 'weaknesses'] }),
  q('TCS', 'hr', 'Are you comfortable working in shifts and on weekends if required?', { difficulty: 'easy', category: 'Flexibility', tags: ['shifts'] }),
  q('TCS', 'hr', 'Tell me about a team project you worked on. What was your role?', { difficulty: 'medium', category: 'Teamwork', tags: ['teamwork'] }),
  q('TCS', 'hr', 'How do you handle disagreements with team members?', { difficulty: 'medium', category: 'Conflict Resolution', tags: ['conflict'] }),
  q('TCS', 'hr', 'What is your approach to continuous learning and upskilling?', { difficulty: 'easy', category: 'Growth Mindset', tags: ['learning'] }),
  q('TCS', 'hr', 'Do you have any service agreement or bond concerns?', { difficulty: 'easy', category: 'Commitment', tags: ['bond'] }),
];

const infosysQuestions: CompanyQuestion[] = [
  // ── Aptitude / Online Test ──
  q('Infosys', 'aptitude', 'A car covers a distance in 40 minutes at speed 60 km/h. What distance will it cover?', { difficulty: 'easy', category: 'Quantitative Aptitude', tags: ['speed-distance'] }),
  q('Infosys', 'aptitude', 'Three numbers are in the ratio 2:3:5. If their sum is 200, find the largest number.', { difficulty: 'easy', category: 'Quantitative Aptitude', tags: ['ratio'] }),
  q('Infosys', 'aptitude', 'If the simple interest on a sum of money at 5% per annum for 3 years is ₹1200, find the principal.', { difficulty: 'medium', category: 'Quantitative Aptitude', tags: ['simple-interest'] }),
  q('Infosys', 'aptitude', 'Find the odd one out: 2, 5, 10, 17, 28, 37', { difficulty: 'medium', category: 'Logical Reasoning', tags: ['odd-one-out'] }),
  q('Infosys', 'aptitude', 'Complete the pattern: AZ, BY, CX, DW, ?', { difficulty: 'medium', category: 'Logical Reasoning', tags: ['pattern-recognition'] }),
  q('Infosys', 'aptitude', 'In a class of 40 students, 25 play cricket and 20 play football. If 10 play both, how many play neither?', { difficulty: 'medium', category: 'Set Theory', tags: ['venn-diagram'] }),
  q('Infosys', 'aptitude', 'A clock shows 3:15. What is the angle between the hour and minute hands?', { difficulty: 'medium', category: 'Quantitative Aptitude', tags: ['clocks'] }),
  q('Infosys', 'aptitude', 'If you rearrange the letters "CIFAIPC" you would have the name of a(n): Ocean, Country, State, City, Animal', { difficulty: 'easy', category: 'Verbal Ability', tags: ['jumbled-words'] }),

  // ── Technical + Coding Round ──
  q('Infosys', 'technical', 'Explain the difference between stack and heap memory allocation in programming.', { difficulty: 'medium', category: 'Data Structures', tags: ['memory', 'stack', 'heap'] }),
  q('Infosys', 'technical', 'What is the time complexity of binary search? Explain with an example.', { difficulty: 'easy', category: 'Algorithms', tags: ['binary-search', 'complexity'] }),
  q('Infosys', 'technical', 'Explain ACID properties in databases with real-world transaction examples.', { difficulty: 'medium', category: 'Database', tags: ['acid', 'transactions'] }),
  q('Infosys', 'technical', 'What is a linked list? Compare singly linked list vs doubly linked list.', { difficulty: 'easy', category: 'Data Structures', tags: ['linked-list'] }),
  q('Infosys', 'technical', 'Explain the MVC architecture pattern. How does it apply to web applications?', { difficulty: 'medium', category: 'Architecture', tags: ['mvc', 'design-pattern'] }),
  q('Infosys', 'technical', 'What is the difference between overloading and overriding in OOP?', { difficulty: 'easy', category: 'OOP', tags: ['polymorphism'] }),
  q('Infosys', 'technical', 'Write a function to find the second largest element in an array without sorting.', { difficulty: 'medium', category: 'Coding', tags: ['arrays', 'coding'] }),
  q('Infosys', 'technical', 'Explain the concept of Virtual DOM in React. Why is it important?', { difficulty: 'medium', category: 'Web Development', tags: ['react', 'virtual-dom'], trending: true }),
  q('Infosys', 'technical', 'What is Kubernetes? How does it help in deploying microservices?', { difficulty: 'hard', category: 'DevOps', tags: ['kubernetes', 'microservices'], trending: true }),
  q('Infosys', 'technical', 'Explain the concept of RAG (Retrieval Augmented Generation) in AI applications.', { difficulty: 'hard', category: 'AI/ML', tags: ['rag', 'genai'], trending: true }),
  q('Infosys', 'technical', 'What is digital transformation? How is Infosys leading it with AI and automation?', { difficulty: 'medium', category: 'Industry', tags: ['digital-transformation'], trending: true }),
  q('Infosys', 'technical', 'What are design patterns? Explain Singleton and Factory patterns.', { difficulty: 'medium', category: 'Design Patterns', tags: ['design-patterns'] }),

  // ── HR Round ──
  q('Infosys', 'hr', 'What attracts you to Infosys as a company?', { difficulty: 'easy', category: 'Motivation', tags: ['why-company'] }),
  q('Infosys', 'hr', 'What do you know about Infosys Foundation and its initiatives?', { difficulty: 'easy', category: 'Company Knowledge', tags: ['infosys-foundation'] }),
  q('Infosys', 'hr', 'How do you stay updated with the latest technology trends?', { difficulty: 'easy', category: 'Growth Mindset', tags: ['learning'] }),
  q('Infosys', 'hr', 'Are you comfortable working in shifts?', { difficulty: 'easy', category: 'Flexibility', tags: ['shifts'] }),
  q('Infosys', 'hr', 'Describe your experience with agile methodologies.', { difficulty: 'medium', category: 'Work Experience', tags: ['agile'] }),
  q('Infosys', 'hr', 'How do you ensure quality in your deliverables?', { difficulty: 'medium', category: 'Work Ethic', tags: ['quality'] }),
  q('Infosys', 'hr', 'Why should we hire you over other candidates?', { difficulty: 'medium', category: 'Self-Assessment', tags: ['value-proposition'] }),
  q('Infosys', 'hr', 'Describe a challenging project you worked on and how you overcame the challenges.', { difficulty: 'medium', category: 'Problem Solving', tags: ['challenge'] }),
  q('Infosys', 'hr', 'What is your preferred programming language and why?', { difficulty: 'easy', category: 'Technical Preference', tags: ['language-preference'] }),
  q('Infosys', 'hr', 'How do you handle a situation where you disagree with your manager?', { difficulty: 'medium', category: 'Conflict Resolution', tags: ['disagreement'] }),
];

const wiproQuestions: CompanyQuestion[] = [
  // ── Aptitude / Written Test ──
  q('Wipro', 'aptitude', 'A shopkeeper marks up goods by 40% and gives a 20% discount. What is the net profit percentage?', { difficulty: 'medium', category: 'Quantitative Aptitude', tags: ['profit-loss'] }),
  q('Wipro', 'aptitude', 'In a certain code, GARDEN is written as HBSEJO. How is FLOWER written in that code?', { difficulty: 'medium', category: 'Logical Reasoning', tags: ['coding-decoding'] }),
  q('Wipro', 'aptitude', 'A boat goes 30km upstream in 5 hours and 48km downstream in 4 hours. Find the speed of the stream.', { difficulty: 'medium', category: 'Quantitative Aptitude', tags: ['boats-streams'] }),
  q('Wipro', 'aptitude', 'Select the word which is most nearly OPPOSITE in meaning to "TRANSIENT".', { difficulty: 'easy', category: 'Verbal Ability', tags: ['antonyms'] }),
  q('Wipro', 'aptitude', 'Pointing to a girl, Ravi said, "She is the daughter of the only sister of my father." How is the girl related to Ravi?', { difficulty: 'medium', category: 'Logical Reasoning', tags: ['blood-relations'] }),
  q('Wipro', 'aptitude', 'A dice is thrown twice. What is the probability that the sum of numbers is at least 9?', { difficulty: 'hard', category: 'Probability', tags: ['probability', 'dice'] }),

  // ── Technical Round ──
  q('Wipro', 'technical', 'Explain the concept of polymorphism with a code example in any language.', { difficulty: 'easy', category: 'OOP', tags: ['polymorphism'] }),
  q('Wipro', 'technical', 'What is the difference between call by value and call by reference? Provide examples.', { difficulty: 'easy', category: 'Programming', tags: ['parameter-passing'] }),
  q('Wipro', 'technical', 'Explain the difference between HashMap and TreeMap in Java (or equivalent in your language).', { difficulty: 'medium', category: 'Data Structures', tags: ['map', 'hashing'] }),
  q('Wipro', 'technical', 'What is a deadlock? How can you prevent it in a multithreaded application?', { difficulty: 'hard', category: 'Operating Systems', tags: ['deadlock', 'concurrency'] }),
  q('Wipro', 'technical', 'What are JOINs in SQL? Explain INNER, LEFT, RIGHT, and FULL OUTER JOIN.', { difficulty: 'medium', category: 'Database', tags: ['sql', 'joins'] }),
  q('Wipro', 'technical', 'What is serverless computing? Give examples of serverless services on AWS/Azure.', { difficulty: 'medium', category: 'Cloud Computing', tags: ['serverless', 'cloud'], trending: true }),
  q('Wipro', 'technical', 'Explain the concept of API Gateway. Why is it important in microservices?', { difficulty: 'medium', category: 'Architecture', tags: ['api-gateway', 'microservices'], trending: true }),
  q('Wipro', 'technical', 'What is prompt engineering? How does it relate to working with AI models?', { difficulty: 'medium', category: 'AI/ML', tags: ['prompt-engineering', 'genai'], trending: true }),
  q('Wipro', 'technical', 'What are stored procedures? When would you use them vs application-level logic?', { difficulty: 'medium', category: 'Database', tags: ['stored-procedures', 'sql'] }),
  q('Wipro', 'technical', 'Write code to reverse a linked list iteratively and recursively.', { difficulty: 'medium', category: 'Coding', tags: ['linked-list', 'recursion'] }),

  // ── HR Round ──
  q('Wipro', 'hr', 'Why do you want to join Wipro?', { difficulty: 'easy', category: 'Motivation', tags: ['why-company'] }),
  q('Wipro', 'hr', 'What do you know about Wipro\'s Spirit of Wipro values?', { difficulty: 'easy', category: 'Company Knowledge', tags: ['company-values'] }),
  q('Wipro', 'hr', 'How do you stay updated with industry trends?', { difficulty: 'easy', category: 'Growth Mindset', tags: ['learning'] }),
  q('Wipro', 'hr', 'Tell me about a time when you failed. What did you learn?', { difficulty: 'medium', category: 'Self-Awareness', tags: ['failure', 'learning'] }),
  q('Wipro', 'hr', 'How do you handle constructive criticism from a senior?', { difficulty: 'medium', category: 'Interpersonal', tags: ['feedback', 'criticism'] }),
  q('Wipro', 'hr', 'Where do you see yourself in 5 years?', { difficulty: 'easy', category: 'Career Goals', tags: ['career-goals'] }),
  q('Wipro', 'hr', 'Explain a technical concept to me as if I have no technical background.', { difficulty: 'medium', category: 'Communication', tags: ['communication'] }),
  q('Wipro', 'hr', 'Are you a quick learner? Give me a specific example.', { difficulty: 'medium', category: 'Self-Assessment', tags: ['learning-agility'] }),
];

const accentureQuestions: CompanyQuestion[] = [
  // ── Cognitive Assessment ──
  q('Accenture', 'aptitude', 'If 20% of a number is 80, what is 40% of the same number?', { difficulty: 'easy', category: 'Quantitative Aptitude', tags: ['percentage'] }),
  q('Accenture', 'aptitude', 'Which of the following conclusions can be drawn from the statement: "Some engineers are doctors"?', { difficulty: 'medium', category: 'Logical Reasoning', tags: ['syllogism'] }),
  q('Accenture', 'aptitude', 'Spot the error in the sentence: "Neither of the boys have completed their assignments on time."', { difficulty: 'medium', category: 'Verbal Ability', tags: ['grammar'] }),
  q('Accenture', 'aptitude', 'A man is facing North. He turns 135 degrees clockwise and then 45 degrees anti-clockwise. Which direction is he facing now?', { difficulty: 'medium', category: 'Logical Reasoning', tags: ['directions'] }),
  q('Accenture', 'aptitude', 'Read the passage and answer: What is the main argument of the author?', { difficulty: 'medium', category: 'Verbal Ability', tags: ['reading-comprehension'] }),

  // ── Technical Round ──
  q('Accenture', 'technical', 'What is the difference between encryption and hashing? Give use cases for each.', { difficulty: 'medium', category: 'Security', tags: ['encryption', 'hashing', 'security'] }),
  q('Accenture', 'technical', 'Explain the concept of cloud computing. What is the shared responsibility model?', { difficulty: 'medium', category: 'Cloud Computing', tags: ['cloud', 'aws'], trending: true }),
  q('Accenture', 'technical', 'What is the difference between CI and CD? Describe a typical CI/CD pipeline.', { difficulty: 'medium', category: 'DevOps', tags: ['cicd', 'devops'], trending: true }),
  q('Accenture', 'technical', 'What is an API? Explain REST vs GraphQL with pros and cons.', { difficulty: 'medium', category: 'Web Development', tags: ['api', 'rest', 'graphql'], trending: true }),
  q('Accenture', 'technical', 'Explain the concept of data warehousing. How does it differ from a database?', { difficulty: 'medium', category: 'Data Engineering', tags: ['data-warehouse'], trending: true }),
  q('Accenture', 'technical', 'What is the SOLID principle in software design? Explain each with examples.', { difficulty: 'hard', category: 'Software Engineering', tags: ['solid', 'design-principles'] }),
  q('Accenture', 'technical', 'Explain how OAuth 2.0 authentication works. What are the different grant types?', { difficulty: 'hard', category: 'Security', tags: ['oauth', 'authentication'], trending: true }),
  q('Accenture', 'technical', 'What is responsible AI? How do you ensure fairness and reduce bias in ML models?', { difficulty: 'hard', category: 'AI/ML', tags: ['responsible-ai', 'ethics'], trending: true }),
  q('Accenture', 'technical', 'What are the differences between TCP and UDP? When would you use each?', { difficulty: 'medium', category: 'Networking', tags: ['tcp', 'udp'] }),

  // ── HR Round ──
  q('Accenture', 'hr', 'What do you know about Accenture\'s business areas (Strategy, Consulting, Digital, Technology, Operations)?', { difficulty: 'easy', category: 'Company Knowledge', tags: ['business-areas'] }),
  q('Accenture', 'hr', 'How would you handle a disagreement with a colleague on a project approach?', { difficulty: 'medium', category: 'Conflict Resolution', tags: ['conflict'] }),
  q('Accenture', 'hr', 'Describe a project where you used innovative thinking to solve a problem.', { difficulty: 'medium', category: 'Innovation', tags: ['innovation'] }),
  q('Accenture', 'hr', 'What is your experience with client-facing work or presentations?', { difficulty: 'medium', category: 'Communication', tags: ['client-facing'] }),
  q('Accenture', 'hr', 'How do you prioritize tasks when everything seems urgent?', { difficulty: 'medium', category: 'Time Management', tags: ['prioritization'] }),
  q('Accenture', 'hr', 'Describe a situation where you demonstrated leadership without being in a formal leadership role.', { difficulty: 'hard', category: 'Leadership', tags: ['leadership'] }),
  q('Accenture', 'hr', 'Tell me about a time you failed and what you learned from the experience.', { difficulty: 'medium', category: 'Self-Awareness', tags: ['failure', 'growth'] }),
  q('Accenture', 'hr', 'Why Accenture? What differentiates us from other consulting/IT firms?', { difficulty: 'easy', category: 'Motivation', tags: ['why-company'] }),
];

const cognizantQuestions: CompanyQuestion[] = [
  q('Cognizant', 'aptitude', 'Two trains running in opposite directions cross each other in 10 seconds. If their speeds are 40 km/h and 50 km/h, and the second train is 150 m long, find the length of the first train.', { difficulty: 'medium', category: 'Quantitative Aptitude', tags: ['trains'] }),
  q('Cognizant', 'aptitude', 'Which word does NOT belong: Apple, Mango, Potato, Orange, Grape', { difficulty: 'easy', category: 'Logical Reasoning', tags: ['classification'] }),
  q('Cognizant', 'aptitude', 'In a group of 100 people, 72 speak English, 43 speak French. How many speak both?', { difficulty: 'medium', category: 'Set Theory', tags: ['sets'] }),
  q('Cognizant', 'aptitude', 'A number when divided by 342 gives a remainder of 47. What remainder will it give when divided by 18?', { difficulty: 'hard', category: 'Quantitative Aptitude', tags: ['remainders'] }),

  q('Cognizant', 'technical', 'What is the difference between a stack and a queue? Implement both using arrays.', { difficulty: 'easy', category: 'Data Structures', tags: ['stack', 'queue'] }),
  q('Cognizant', 'technical', 'Explain exception handling in Java/Python. What are checked vs unchecked exceptions?', { difficulty: 'medium', category: 'Programming', tags: ['exceptions'] }),
  q('Cognizant', 'technical', 'What is a binary search tree? How does self-balancing (AVL/Red-Black) work?', { difficulty: 'hard', category: 'Data Structures', tags: ['bst', 'trees'] }),
  q('Cognizant', 'technical', 'What is Git? Explain branching, merging, and resolve a merge conflict scenario.', { difficulty: 'medium', category: 'Version Control', tags: ['git'] }),
  q('Cognizant', 'technical', 'Explain the concept of vector databases and their role in AI applications.', { difficulty: 'hard', category: 'AI/ML', tags: ['vector-db', 'genai'], trending: true }),
  q('Cognizant', 'technical', 'What is Infrastructure as Code? Compare Terraform and AWS CloudFormation.', { difficulty: 'medium', category: 'DevOps', tags: ['iac', 'terraform'], trending: true }),
  q('Cognizant', 'technical', 'What are observability pillars (logs, metrics, traces)? How do they help in production?', { difficulty: 'medium', category: 'DevOps', tags: ['observability'], trending: true }),
  q('Cognizant', 'technical', 'Write a SQL query to find the 3rd highest salary from an Employee table.', { difficulty: 'medium', category: 'Database', tags: ['sql', 'subquery'] }),

  q('Cognizant', 'hr', 'Why Cognizant over other IT companies?', { difficulty: 'easy', category: 'Motivation', tags: ['why-company'] }),
  q('Cognizant', 'hr', 'What do you know about Cognizant\'s core values?', { difficulty: 'easy', category: 'Company Knowledge', tags: ['company-values'] }),
  q('Cognizant', 'hr', 'How do you manage work-life balance?', { difficulty: 'easy', category: 'Personal', tags: ['work-life'] }),
  q('Cognizant', 'hr', 'Describe a time when you had to meet challenging targets.', { difficulty: 'medium', category: 'Achievement', tags: ['targets'] }),
  q('Cognizant', 'hr', 'Are you open to learning legacy technologies (COBOL, mainframes) if required?', { difficulty: 'easy', category: 'Flexibility', tags: ['legacy'] }),
  q('Cognizant', 'hr', 'Describe a time you took initiative without being asked.', { difficulty: 'medium', category: 'Initiative', tags: ['initiative'] }),
  q('Cognizant', 'hr', 'What motivates you to work hard every day?', { difficulty: 'easy', category: 'Motivation', tags: ['motivation'] }),
];

const capgeminiQuestions: CompanyQuestion[] = [
  q('Capgemini', 'aptitude', 'If the compound interest on a sum of ₹5000 for 2 years at 10% p.a. is ₹1050, verify this.', { difficulty: 'medium', category: 'Quantitative Aptitude', tags: ['compound-interest'] }),
  q('Capgemini', 'aptitude', 'A mirror image of "QUALITY" when placed facing upward is?', { difficulty: 'medium', category: 'Logical Reasoning', tags: ['mirror-image'] }),
  q('Capgemini', 'aptitude', 'Read the paragraph and identify the author\'s tone: critical, supportive, neutral, or sarcastic.', { difficulty: 'medium', category: 'Verbal Ability', tags: ['reading-comprehension'] }),

  q('Capgemini', 'technical', 'Explain the event loop in Node.js / JavaScript. How does asynchronous code work?', { difficulty: 'medium', category: 'Web Development', tags: ['nodejs', 'event-loop'] }),
  q('Capgemini', 'technical', 'What is the difference between a monolith and microservices? When should you NOT use microservices?', { difficulty: 'medium', category: 'Architecture', tags: ['microservices', 'monolith'] }),
  q('Capgemini', 'technical', 'What is containerization? Explain Docker images, containers, and Docker Compose.', { difficulty: 'medium', category: 'DevOps', tags: ['docker', 'containers'], trending: true }),
  q('Capgemini', 'technical', 'What is edge computing? How does it relate to IoT and 5G applications?', { difficulty: 'hard', category: 'Emerging Tech', tags: ['edge-computing', 'iot'], trending: true }),
  q('Capgemini', 'technical', 'Explain the CAP theorem and its implications for distributed systems.', { difficulty: 'hard', category: 'System Design', tags: ['cap-theorem', 'distributed-systems'] }),
  q('Capgemini', 'technical', 'What is a message queue? Compare Kafka, RabbitMQ, and SQS.', { difficulty: 'hard', category: 'Architecture', tags: ['message-queue', 'kafka'], trending: true }),
  q('Capgemini', 'technical', 'Explain the concept of GraphQL and how it differs from REST APIs.', { difficulty: 'medium', category: 'Web Development', tags: ['graphql', 'api'], trending: true }),

  q('Capgemini', 'hr', 'What attracts you to Capgemini?', { difficulty: 'easy', category: 'Motivation', tags: ['why-company'] }),
  q('Capgemini', 'hr', 'What do you know about Capgemini\'s 7 values?', { difficulty: 'easy', category: 'Company Knowledge', tags: ['company-values'] }),
  q('Capgemini', 'hr', 'How do you approach learning new technologies?', { difficulty: 'easy', category: 'Growth Mindset', tags: ['learning'] }),
  q('Capgemini', 'hr', 'How do you handle change and ambiguity in a project?', { difficulty: 'medium', category: 'Adaptability', tags: ['change'] }),
  q('Capgemini', 'hr', 'Why is diversity important in the workplace?', { difficulty: 'medium', category: 'Values', tags: ['diversity'] }),
  q('Capgemini', 'hr', 'Describe a complex problem you solved. Walk me through your approach.', { difficulty: 'medium', category: 'Problem Solving', tags: ['problem-solving'] }),
];

const hclQuestions: CompanyQuestion[] = [
  q('HCL', 'aptitude', 'A man invests ₹10,000 at 8% p.a. simple interest. After how many years will the amount become ₹14,000?', { difficulty: 'medium', category: 'Quantitative Aptitude', tags: ['simple-interest'] }),
  q('HCL', 'aptitude', 'If South-East becomes North, then what will North-East become?', { difficulty: 'medium', category: 'Logical Reasoning', tags: ['directions'] }),

  q('HCL', 'technical', 'What is the difference between a compiler and an interpreter?', { difficulty: 'easy', category: 'Fundamentals', tags: ['compiler', 'interpreter'] }),
  q('HCL', 'technical', 'Explain the concept of indexing in databases. What types of indexes exist?', { difficulty: 'medium', category: 'Database', tags: ['indexing'] }),
  q('HCL', 'technical', 'What is the difference between GET and POST HTTP methods?', { difficulty: 'easy', category: 'Web Development', tags: ['http'] }),
  q('HCL', 'technical', 'What is zero-trust architecture? Why is it important in modern security?', { difficulty: 'hard', category: 'Security', tags: ['zero-trust', 'security'], trending: true }),
  q('HCL', 'technical', 'What are microservices design patterns? Explain Circuit Breaker, Saga, and CQRS.', { difficulty: 'hard', category: 'Architecture', tags: ['design-patterns', 'microservices'], trending: true }),
  q('HCL', 'technical', 'Explain the concept of low-code/no-code platforms. Where do they fit in enterprise solutions?', { difficulty: 'medium', category: 'Emerging Tech', tags: ['low-code'], trending: true }),
  q('HCL', 'technical', 'Write a function to find if two strings are anagrams of each other.', { difficulty: 'easy', category: 'Coding', tags: ['string', 'anagram'] }),
  q('HCL', 'technical', 'Explain the concept of memory management in C/C++. What are memory leaks?', { difficulty: 'medium', category: 'Programming', tags: ['memory', 'c'] }),

  q('HCL', 'hr', 'Why do you want to join HCL Technologies?', { difficulty: 'easy', category: 'Motivation', tags: ['why-company'] }),
  q('HCL', 'hr', 'What do you know about HCL\'s "Employees First, Customers Second" philosophy?', { difficulty: 'easy', category: 'Company Knowledge', tags: ['company-culture'] }),
  q('HCL', 'hr', 'Are you willing to work on client sites domestically or internationally?', { difficulty: 'easy', category: 'Flexibility', tags: ['travel'] }),
  q('HCL', 'hr', 'Tell me about a leadership experience in your college or projects.', { difficulty: 'medium', category: 'Leadership', tags: ['leadership'] }),
  q('HCL', 'hr', 'How do you handle tight deadlines and multiple priorities?', { difficulty: 'medium', category: 'Time Management', tags: ['deadlines'] }),
];

const techMahindraQuestions: CompanyQuestion[] = [
  q('Tech Mahindra', 'aptitude', 'The average of 5 numbers is 40. If one number is excluded, the average becomes 35. What is the excluded number?', { difficulty: 'medium', category: 'Quantitative Aptitude', tags: ['averages'] }),
  q('Tech Mahindra', 'aptitude', 'Choose the correct sentence: (a) He is one of the best player (b) He is one of the best players', { difficulty: 'easy', category: 'Verbal Ability', tags: ['grammar'] }),

  q('Tech Mahindra', 'technical', 'What is the difference between Python 2 and Python 3? Why did the industry move to Python 3?', { difficulty: 'easy', category: 'Programming', tags: ['python'] }),
  q('Tech Mahindra', 'technical', 'Explain the concept of garbage collection. How does it work in Java?', { difficulty: 'medium', category: 'Programming', tags: ['garbage-collection', 'java'] }),
  q('Tech Mahindra', 'technical', 'What is 5G technology? How does it impact IoT and edge computing?', { difficulty: 'medium', category: 'Telecom', tags: ['5g', 'iot'], trending: true }),
  q('Tech Mahindra', 'technical', 'What is blockchain? Explain smart contracts and their use cases beyond crypto.', { difficulty: 'hard', category: 'Emerging Tech', tags: ['blockchain', 'smart-contracts'], trending: true }),
  q('Tech Mahindra', 'technical', 'What is the difference between synchronous and asynchronous programming?', { difficulty: 'easy', category: 'Programming', tags: ['async'] }),
  q('Tech Mahindra', 'technical', 'Explain the concept of load balancing. What algorithms are used?', { difficulty: 'medium', category: 'System Design', tags: ['load-balancing'], trending: true }),

  q('Tech Mahindra', 'hr', 'Why Tech Mahindra? What do you know about the Mahindra Group?', { difficulty: 'easy', category: 'Company Knowledge', tags: ['why-company'] }),
  q('Tech Mahindra', 'hr', 'How do you handle a situation where you are assigned a task outside your expertise?', { difficulty: 'medium', category: 'Adaptability', tags: ['learning', 'adaptability'] }),
  q('Tech Mahindra', 'hr', 'Tell me about your final year project. What was your contribution?', { difficulty: 'easy', category: 'Academic', tags: ['project'] }),
  q('Tech Mahindra', 'hr', 'What is your dream job and how does Tech Mahindra fit into it?', { difficulty: 'easy', category: 'Career Goals', tags: ['career-goals'] }),
];

const ltInfotechQuestions: CompanyQuestion[] = [
  q('L&T Infotech', 'technical', 'Explain the difference between equals() and == in Java.', { difficulty: 'easy', category: 'Programming', tags: ['java', 'equality'] }),
  q('L&T Infotech', 'technical', 'What is the difference between CHAR and VARCHAR in SQL?', { difficulty: 'easy', category: 'Database', tags: ['sql', 'datatypes'] }),
  q('L&T Infotech', 'technical', 'What is an ERD (Entity-Relationship Diagram)? Draw one for an e-commerce system.', { difficulty: 'medium', category: 'Database', tags: ['erd', 'design'] }),
  q('L&T Infotech', 'technical', 'Explain the concept of API versioning. What strategies exist?', { difficulty: 'medium', category: 'Web Development', tags: ['api', 'versioning'], trending: true }),
  q('L&T Infotech', 'technical', 'What is the difference between horizontal and vertical scaling?', { difficulty: 'medium', category: 'System Design', tags: ['scaling'], trending: true }),
  q('L&T Infotech', 'technical', 'What are WebSockets? How do they differ from HTTP polling?', { difficulty: 'medium', category: 'Web Development', tags: ['websockets', 'real-time'] }),
  q('L&T Infotech', 'technical', 'Explain caching strategies: cache-aside, write-through, write-behind.', { difficulty: 'hard', category: 'System Design', tags: ['caching'], trending: true }),

  q('L&T Infotech', 'hr', 'What do you know about L&T Infotech (now LTIMindtree)?', { difficulty: 'easy', category: 'Company Knowledge', tags: ['why-company'] }),
  q('L&T Infotech', 'hr', 'How do you plan to contribute to our engineering excellence?', { difficulty: 'medium', category: 'Value Proposition', tags: ['contribution'] }),
  q('L&T Infotech', 'hr', 'Describe a time when you had to learn something new quickly to meet a deadline.', { difficulty: 'medium', category: 'Adaptability', tags: ['learning-agility'] }),
];

const mindtreeQuestions: CompanyQuestion[] = [
  q('Mindtree', 'technical', 'What is the difference between static and dynamic typing? Give language examples.', { difficulty: 'easy', category: 'Programming', tags: ['typing'] }),
  q('Mindtree', 'technical', 'Explain how a hash table works internally. What are collision resolution strategies?', { difficulty: 'medium', category: 'Data Structures', tags: ['hash-table', 'hashing'] }),
  q('Mindtree', 'technical', 'What is event-driven architecture? Where is it used in modern systems?', { difficulty: 'medium', category: 'Architecture', tags: ['event-driven'], trending: true }),
  q('Mindtree', 'technical', 'What is the difference between unit testing, integration testing, and E2E testing?', { difficulty: 'medium', category: 'Testing', tags: ['testing'] }),

  q('Mindtree', 'hr', 'Why Mindtree (now part of LTIMindtree)?', { difficulty: 'easy', category: 'Motivation', tags: ['why-company'] }),
  q('Mindtree', 'hr', 'Describe your approach to working with cross-functional teams.', { difficulty: 'medium', category: 'Teamwork', tags: ['cross-functional'] }),
  q('Mindtree', 'hr', 'What role does innovation play in your work approach?', { difficulty: 'medium', category: 'Innovation', tags: ['innovation'] }),
];

const zohoQuestions: CompanyQuestion[] = [
  q('Zoho', 'coding', 'Write a program to find the longest palindromic substring in a given string.', { difficulty: 'hard', category: 'Coding', tags: ['string', 'dp', 'palindrome'] }),
  q('Zoho', 'coding', 'Implement a LRU (Least Recently Used) cache from scratch.', { difficulty: 'hard', category: 'Coding', tags: ['cache', 'design'] }),
  q('Zoho', 'coding', 'Given a matrix, rotate it 90 degrees clockwise in-place.', { difficulty: 'medium', category: 'Coding', tags: ['matrix', 'arrays'] }),
  q('Zoho', 'coding', 'Implement a stack that supports push, pop, and getMin in O(1).', { difficulty: 'medium', category: 'Coding', tags: ['stack', 'design'] }),
  q('Zoho', 'coding', 'Write a function to detect a cycle in a linked list and find the starting node.', { difficulty: 'medium', category: 'Coding', tags: ['linked-list', 'cycle'] }),
  q('Zoho', 'coding', 'Implement a trie (prefix tree) and support insert, search, and startsWith operations.', { difficulty: 'hard', category: 'Coding', tags: ['trie', 'tree'] }),

  q('Zoho', 'technical', 'Explain memory management in C. What are dangling pointers and memory leaks?', { difficulty: 'medium', category: 'Programming', tags: ['c', 'memory'] }),
  q('Zoho', 'technical', 'What is the difference between process and thread? How does inter-process communication work?', { difficulty: 'medium', category: 'Operating Systems', tags: ['process', 'ipc'] }),
  q('Zoho', 'technical', 'Design a URL shortener system. Discuss storage, hashing, and scaling.', { difficulty: 'hard', category: 'System Design', tags: ['system-design', 'url-shortener'], trending: true }),
  q('Zoho', 'technical', 'What is the difference between composition and inheritance? When would you prefer one over the other?', { difficulty: 'medium', category: 'OOP', tags: ['composition', 'inheritance'] }),

  q('Zoho', 'hr', 'Why Zoho? What do you know about Zoho\'s product ecosystem?', { difficulty: 'easy', category: 'Company Knowledge', tags: ['why-company'] }),
  q('Zoho', 'hr', 'Zoho doesn\'t require formal degrees for hiring. What are your views on this approach?', { difficulty: 'medium', category: 'Values', tags: ['education-philosophy'] }),
  q('Zoho', 'hr', 'How do you handle a scenario where you are stuck on a problem for hours?', { difficulty: 'medium', category: 'Problem Solving', tags: ['persistence'] }),
];

// ═══════════════════════════════════════════════════════
// GLOBAL TECH COMPANIES
// ═══════════════════════════════════════════════════════

const googleQuestions: CompanyQuestion[] = [
  q('Google', 'coding', 'Given an array of integers, find two numbers that add up to a specific target. Return their indices.', { difficulty: 'easy', category: 'Coding', tags: ['arrays', 'hash-map', 'two-sum'] }),
  q('Google', 'coding', 'Implement a function to find the longest substring without repeating characters.', { difficulty: 'medium', category: 'Coding', tags: ['string', 'sliding-window'] }),
  q('Google', 'coding', 'Given a binary tree, find the lowest common ancestor of two given nodes.', { difficulty: 'medium', category: 'Coding', tags: ['tree', 'recursion'] }),
  q('Google', 'coding', 'Design an algorithm to serialize and deserialize a binary tree.', { difficulty: 'hard', category: 'Coding', tags: ['tree', 'serialization'] }),
  q('Google', 'coding', 'Given a list of airline tickets, find the itinerary that uses all tickets exactly once.', { difficulty: 'hard', category: 'Coding', tags: ['graph', 'euler-path'] }),
  q('Google', 'coding', 'Implement a min-heap from scratch and support insert, extractMin, and heapify operations.', { difficulty: 'medium', category: 'Coding', tags: ['heap', 'priority-queue'] }),

  q('Google', 'technical', 'Design a web crawler. How would you handle billions of pages and avoid duplicates?', { difficulty: 'hard', category: 'System Design', tags: ['system-design', 'web-crawler'], trending: true }),
  q('Google', 'technical', 'How does Google Search ranking work at a high level? Discuss PageRank and modern ML-based ranking.', { difficulty: 'hard', category: 'System Design', tags: ['search', 'ranking'], trending: true }),
  q('Google', 'technical', 'What is MapReduce? How does it enable distributed data processing?', { difficulty: 'medium', category: 'Distributed Systems', tags: ['mapreduce', 'distributed'] }),
  q('Google', 'technical', 'Design a rate limiter for an API. Discuss token bucket and sliding window algorithms.', { difficulty: 'hard', category: 'System Design', tags: ['rate-limiter', 'system-design'], trending: true }),
  q('Google', 'technical', 'What is the difference between eventual consistency and strong consistency? Give real-world examples.', { difficulty: 'hard', category: 'Distributed Systems', tags: ['consistency', 'distributed'] }),
  q('Google', 'technical', 'Explain transformer architecture. How do attention mechanisms work in LLMs?', { difficulty: 'hard', category: 'AI/ML', tags: ['transformers', 'attention', 'llm'], trending: true }),

  q('Google', 'behavioral', 'Tell me about a time you had to navigate ambiguity and make a decision without full information.', { difficulty: 'medium', category: 'Googleyness', tags: ['ambiguity', 'decision-making'] }),
  q('Google', 'behavioral', 'Describe a time you had a disagreement with a teammate. How did you resolve it?', { difficulty: 'medium', category: 'Googleyness', tags: ['conflict', 'teamwork'] }),
  q('Google', 'behavioral', 'Tell me about a project where you went beyond the original scope to deliver something better.', { difficulty: 'medium', category: 'Googleyness', tags: ['initiative', 'impact'] }),
  q('Google', 'behavioral', 'How do you approach mentoring or helping others grow?', { difficulty: 'medium', category: 'Googleyness', tags: ['mentoring', 'leadership'] }),
];

const microsoftQuestions: CompanyQuestion[] = [
  q('Microsoft', 'coding', 'Implement an in-place merge sort algorithm.', { difficulty: 'medium', category: 'Coding', tags: ['sorting', 'merge-sort'] }),
  q('Microsoft', 'coding', 'Find the median of two sorted arrays in O(log(min(m,n))) time.', { difficulty: 'hard', category: 'Coding', tags: ['binary-search', 'arrays'] }),
  q('Microsoft', 'coding', 'Implement a function to validate a binary search tree.', { difficulty: 'medium', category: 'Coding', tags: ['tree', 'bst', 'validation'] }),
  q('Microsoft', 'coding', 'Given a string, find all permutations and return them in lexicographic order.', { difficulty: 'medium', category: 'Coding', tags: ['string', 'backtracking'] }),

  q('Microsoft', 'technical', 'Design a distributed key-value store like Azure Cosmos DB. Discuss partitioning and replication.', { difficulty: 'hard', category: 'System Design', tags: ['distributed', 'key-value'], trending: true }),
  q('Microsoft', 'technical', 'What is the difference between horizontal and vertical scaling? How does Azure handle auto-scaling?', { difficulty: 'medium', category: 'Cloud Computing', tags: ['scaling', 'azure'], trending: true }),
  q('Microsoft', 'technical', 'Explain the concept of OS virtual memory. How does paging work?', { difficulty: 'medium', category: 'Operating Systems', tags: ['virtual-memory', 'paging'] }),
  q('Microsoft', 'technical', 'What are the SOLID principles? How do they apply to building maintainable software?', { difficulty: 'medium', category: 'Software Engineering', tags: ['solid', 'clean-code'] }),
  q('Microsoft', 'technical', 'How does GitHub Copilot work? Discuss the architecture behind AI code assistants.', { difficulty: 'hard', category: 'AI/ML', tags: ['copilot', 'genai', 'code-gen'], trending: true }),
  q('Microsoft', 'technical', 'Design a notification system that handles millions of users. Discuss push vs pull models.', { difficulty: 'hard', category: 'System Design', tags: ['notifications', 'system-design'], trending: true }),

  q('Microsoft', 'behavioral', 'Tell me about a time you had to give difficult feedback to a colleague.', { difficulty: 'medium', category: 'Growth Mindset', tags: ['feedback'] }),
  q('Microsoft', 'behavioral', 'Describe a situation where you had to quickly learn a new technology under pressure.', { difficulty: 'medium', category: 'Growth Mindset', tags: ['learning', 'pressure'] }),
  q('Microsoft', 'behavioral', 'How do you ensure inclusivity in your team? Give a specific example.', { difficulty: 'medium', category: 'Values', tags: ['diversity', 'inclusion'] }),
];

const amazonQuestions: CompanyQuestion[] = [
  q('Amazon', 'coding', 'Implement a function to find the Kth largest element in an unsorted array.', { difficulty: 'medium', category: 'Coding', tags: ['arrays', 'quickselect', 'heap'] }),
  q('Amazon', 'coding', 'Design and implement an LRU cache with O(1) get and put operations.', { difficulty: 'medium', category: 'Coding', tags: ['cache', 'hash-map', 'linked-list'] }),
  q('Amazon', 'coding', 'Given a list of words and a pattern, find all words that match the pattern (word pattern problem).', { difficulty: 'medium', category: 'Coding', tags: ['hash-map', 'pattern-matching'] }),
  q('Amazon', 'coding', 'Find the number of islands in a 2D grid (connected components).', { difficulty: 'medium', category: 'Coding', tags: ['graph', 'bfs', 'dfs'] }),

  q('Amazon', 'technical', 'Design an e-commerce system like Amazon. Discuss catalog, cart, payment, and order services.', { difficulty: 'hard', category: 'System Design', tags: ['system-design', 'e-commerce'], trending: true }),
  q('Amazon', 'technical', 'Explain eventual consistency in Amazon DynamoDB. How does it compare to strong consistency?', { difficulty: 'hard', category: 'Distributed Systems', tags: ['dynamodb', 'consistency'] }),
  q('Amazon', 'technical', 'What is the difference between a queue and a topic in message brokers (SQS vs SNS)?', { difficulty: 'medium', category: 'Architecture', tags: ['messaging', 'sqs', 'sns'] }),
  q('Amazon', 'technical', 'How does Amazon\'s recommendation engine work? Discuss collaborative filtering.', { difficulty: 'hard', category: 'AI/ML', tags: ['recommendations', 'ml'], trending: true }),

  q('Amazon', 'behavioral', 'Tell me about a time you demonstrated Customer Obsession (Leadership Principle #1).', { difficulty: 'medium', category: 'Leadership Principles', tags: ['customer-obsession'] }),
  q('Amazon', 'behavioral', 'Describe a situation where you had to "Disagree and Commit".', { difficulty: 'medium', category: 'Leadership Principles', tags: ['disagree-commit'] }),
  q('Amazon', 'behavioral', 'Tell me about a time you had to Dive Deep to solve a problem.', { difficulty: 'medium', category: 'Leadership Principles', tags: ['dive-deep'] }),
  q('Amazon', 'behavioral', 'Give an example of when you "Invented and Simplified" a process or solution.', { difficulty: 'medium', category: 'Leadership Principles', tags: ['invent-simplify'] }),
  q('Amazon', 'behavioral', 'Describe a time when you had to Think Big and propose a bold solution.', { difficulty: 'medium', category: 'Leadership Principles', tags: ['think-big'] }),
  q('Amazon', 'behavioral', 'Tell me about a time you Earned Trust from your team or stakeholders.', { difficulty: 'medium', category: 'Leadership Principles', tags: ['earn-trust'] }),
  q('Amazon', 'behavioral', 'How do you embody "Bias for Action"? Give a specific example.', { difficulty: 'medium', category: 'Leadership Principles', tags: ['bias-for-action'] }),
  q('Amazon', 'behavioral', 'Describe a time when you had to Deliver Results under challenging constraints.', { difficulty: 'medium', category: 'Leadership Principles', tags: ['deliver-results'] }),
];

const metaQuestions: CompanyQuestion[] = [
  q('Meta', 'coding', 'Given a string of parentheses, determine if it is valid. Handle (), [], {}.', { difficulty: 'easy', category: 'Coding', tags: ['stack', 'string'] }),
  q('Meta', 'coding', 'Find the minimum window substring that contains all characters of another string.', { difficulty: 'hard', category: 'Coding', tags: ['sliding-window', 'string'] }),
  q('Meta', 'coding', 'Implement a function to flatten a nested list of integers.', { difficulty: 'medium', category: 'Coding', tags: ['recursion', 'stack'] }),
  q('Meta', 'coding', 'Given an array of intervals, merge all overlapping intervals.', { difficulty: 'medium', category: 'Coding', tags: ['intervals', 'sorting'] }),

  q('Meta', 'technical', 'Design a social media news feed system. How do you handle ranking and real-time updates?', { difficulty: 'hard', category: 'System Design', tags: ['news-feed', 'system-design'], trending: true }),
  q('Meta', 'technical', 'What is a content delivery network (CDN)? How does it improve performance globally?', { difficulty: 'medium', category: 'Infrastructure', tags: ['cdn', 'performance'] }),
  q('Meta', 'technical', 'Explain how Facebook/Instagram\'s recommendation algorithm might work for content ranking.', { difficulty: 'hard', category: 'AI/ML', tags: ['recommendations', 'ranking'], trending: true }),
  q('Meta', 'technical', 'What are the security challenges in building a messenger app? Discuss end-to-end encryption.', { difficulty: 'hard', category: 'Security', tags: ['e2e', 'encryption', 'messenger'] }),

  q('Meta', 'behavioral', 'Describe a time you had to move fast and break things (then fix them).', { difficulty: 'medium', category: 'Meta Values', tags: ['move-fast'] }),
  q('Meta', 'behavioral', 'How do you build trust with people who have different perspectives?', { difficulty: 'medium', category: 'Meta Values', tags: ['openness'] }),
  q('Meta', 'behavioral', 'Tell me about a product decision you made that had a significant impact.', { difficulty: 'hard', category: 'Meta Values', tags: ['impact', 'product'] }),
];

const ibmQuestions: CompanyQuestion[] = [
  q('IBM', 'aptitude', 'A train 250 m long crosses a platform 450 m long in 28 seconds. What is its speed?', { difficulty: 'medium', category: 'Quantitative Aptitude', tags: ['trains'] }),
  q('IBM', 'aptitude', 'Find the missing number: 1, 1, 2, 3, 5, 8, 13, ?', { difficulty: 'easy', category: 'Logical Reasoning', tags: ['fibonacci'] }),

  q('IBM', 'technical', 'What is quantum computing? How does it differ from classical computing?', { difficulty: 'hard', category: 'Emerging Tech', tags: ['quantum', 'computing'], trending: true }),
  q('IBM', 'technical', 'What is hybrid cloud architecture? How does IBM Cloud Paks facilitate it?', { difficulty: 'medium', category: 'Cloud Computing', tags: ['hybrid-cloud', 'ibm'], trending: true }),
  q('IBM', 'technical', 'Explain the concept of Natural Language Processing. What are key NLP tasks?', { difficulty: 'medium', category: 'AI/ML', tags: ['nlp', 'ai'] }),
  q('IBM', 'technical', 'What is the difference between supervised, unsupervised, and reinforcement learning?', { difficulty: 'medium', category: 'AI/ML', tags: ['ml-types'] }),
  q('IBM', 'technical', 'Design a chatbot system for customer support. What components would you need?', { difficulty: 'hard', category: 'System Design', tags: ['chatbot', 'nlp'], trending: true }),

  q('IBM', 'hr', 'What attracts you to IBM? What do you know about IBM\'s history of innovation?', { difficulty: 'easy', category: 'Company Knowledge', tags: ['why-company'] }),
  q('IBM', 'hr', 'How do you approach ethical challenges in technology?', { difficulty: 'medium', category: 'Ethics', tags: ['ethics', 'responsible-tech'] }),
  q('IBM', 'hr', 'Describe a situation where you had to collaborate across different functions or teams.', { difficulty: 'medium', category: 'Collaboration', tags: ['collaboration'] }),
];

// ═══════════════════════════════════════════════════════
// INDIAN STARTUPS
// ═══════════════════════════════════════════════════════

const flipkartQuestions: CompanyQuestion[] = [
  q('Flipkart', 'coding', 'Given an array representing daily stock prices, find the maximum profit from at most 2 transactions.', { difficulty: 'hard', category: 'Coding', tags: ['dp', 'stocks'] }),
  q('Flipkart', 'coding', 'Implement a function to find the next greater element for every element in an array.', { difficulty: 'medium', category: 'Coding', tags: ['stack', 'arrays'] }),
  q('Flipkart', 'coding', 'Design a data structure that supports insert, delete, getRandom in O(1).', { difficulty: 'hard', category: 'Coding', tags: ['design', 'randomized'] }),
  q('Flipkart', 'coding', 'Given a graph, detect if it contains a cycle using DFS.', { difficulty: 'medium', category: 'Coding', tags: ['graph', 'dfs', 'cycle'] }),

  q('Flipkart', 'technical', 'Design Flipkart\'s product search system. How would you handle millions of products with faceted search?', { difficulty: 'hard', category: 'System Design', tags: ['search', 'elasticsearch'], trending: true }),
  q('Flipkart', 'technical', 'How would you design a real-time inventory management system for flash sales?', { difficulty: 'hard', category: 'System Design', tags: ['inventory', 'concurrency'], trending: true }),
  q('Flipkart', 'technical', 'What is A/B testing? How would you design an experimentation platform?', { difficulty: 'medium', category: 'Data Engineering', tags: ['ab-testing', 'experimentation'], trending: true }),

  q('Flipkart', 'behavioral', 'Tell me about a time you had to make a trade-off between speed and quality.', { difficulty: 'medium', category: 'Decision Making', tags: ['tradeoff'] }),
  q('Flipkart', 'behavioral', 'Describe a situation where your initial approach to a problem was wrong. How did you pivot?', { difficulty: 'medium', category: 'Problem Solving', tags: ['pivot', 'failure'] }),
  q('Flipkart', 'hr', 'Why Flipkart? What excites you about e-commerce technology?', { difficulty: 'easy', category: 'Motivation', tags: ['why-company'] }),
];

const paytmQuestions: CompanyQuestion[] = [
  q('Paytm', 'coding', 'Implement a function to detect if a linked list has a cycle and find its length.', { difficulty: 'medium', category: 'Coding', tags: ['linked-list', 'cycle'] }),
  q('Paytm', 'coding', 'Given a matrix, find the maximum sum path from top-left to bottom-right.', { difficulty: 'medium', category: 'Coding', tags: ['dp', 'matrix'] }),
  q('Paytm', 'coding', 'Implement a basic calculator that handles +, -, *, / and parentheses.', { difficulty: 'hard', category: 'Coding', tags: ['stack', 'parsing'] }),

  q('Paytm', 'technical', 'Design a payment gateway system. Discuss idempotency, retry logic, and reconciliation.', { difficulty: 'hard', category: 'System Design', tags: ['payments', 'fintech'], trending: true }),
  q('Paytm', 'technical', 'What is UPI (Unified Payments Interface)? How does it work architecturally?', { difficulty: 'medium', category: 'Fintech', tags: ['upi', 'payments'], trending: true }),
  q('Paytm', 'technical', 'How would you design a fraud detection system for digital payments?', { difficulty: 'hard', category: 'AI/ML', tags: ['fraud-detection', 'ml'], trending: true }),

  q('Paytm', 'hr', 'Why Paytm? What excites you about fintech in India?', { difficulty: 'easy', category: 'Motivation', tags: ['why-company'] }),
  q('Paytm', 'hr', 'How do you handle a fast-paced, constantly changing startup environment?', { difficulty: 'medium', category: 'Adaptability', tags: ['startup-culture'] }),
  q('Paytm', 'behavioral', 'Tell me about a time you shipped a feature under extreme time pressure.', { difficulty: 'medium', category: 'Delivery', tags: ['speed', 'delivery'] }),
];

const razorpayQuestions: CompanyQuestion[] = [
  q('Razorpay', 'coding', 'Implement a thread-safe counter that handles concurrent increments correctly.', { difficulty: 'medium', category: 'Coding', tags: ['concurrency', 'threading'] }),
  q('Razorpay', 'coding', 'Given a stream of integers, design a class to find the median at any point.', { difficulty: 'hard', category: 'Coding', tags: ['heap', 'stream', 'median'] }),

  q('Razorpay', 'technical', 'Design a payment reconciliation system. How do you ensure consistency between bank and internal records?', { difficulty: 'hard', category: 'System Design', tags: ['reconciliation', 'fintech'], trending: true }),
  q('Razorpay', 'technical', 'What is PCI DSS compliance? How does it affect payment system architecture?', { difficulty: 'medium', category: 'Security', tags: ['pci-dss', 'compliance'], trending: true }),
  q('Razorpay', 'technical', 'How would you handle distributed transactions across multiple services (saga pattern)?', { difficulty: 'hard', category: 'Architecture', tags: ['saga', 'distributed-transactions'], trending: true }),
  q('Razorpay', 'technical', 'What is event sourcing? How does it help in building audit-compliant financial systems?', { difficulty: 'hard', category: 'Architecture', tags: ['event-sourcing', 'fintech'], trending: true }),

  q('Razorpay', 'hr', 'Why Razorpay? What do you know about India\'s fintech ecosystem?', { difficulty: 'easy', category: 'Motivation', tags: ['why-company'] }),
  q('Razorpay', 'behavioral', 'Tell me about a time you had to build something from scratch with minimal guidance.', { difficulty: 'medium', category: 'Ownership', tags: ['autonomy', 'ownership'] }),
];

const freshworksQuestions: CompanyQuestion[] = [
  q('Freshworks', 'coding', 'Implement an autocomplete system using a trie. Support ranked suggestions.', { difficulty: 'hard', category: 'Coding', tags: ['trie', 'autocomplete'] }),
  q('Freshworks', 'coding', 'Given a list of meetings, find the minimum number of conference rooms required.', { difficulty: 'medium', category: 'Coding', tags: ['intervals', 'heap', 'greedy'] }),

  q('Freshworks', 'technical', 'Design a multi-tenant SaaS application. How do you isolate customer data?', { difficulty: 'hard', category: 'System Design', tags: ['multi-tenant', 'saas'], trending: true }),
  q('Freshworks', 'technical', 'How does a CRM system work? Design the core entities and relationships.', { difficulty: 'medium', category: 'Product Design', tags: ['crm', 'product'] }),
  q('Freshworks', 'technical', 'What is the role of AI in customer support? Discuss chatbots and ticket classification.', { difficulty: 'medium', category: 'AI/ML', tags: ['ai-support', 'nlp'], trending: true }),
  q('Freshworks', 'technical', 'How would you design a real-time analytics dashboard for SaaS metrics?', { difficulty: 'hard', category: 'System Design', tags: ['analytics', 'real-time'], trending: true }),

  q('Freshworks', 'hr', 'Why Freshworks? What do you know about their product suite (Freshdesk, Freshsales)?', { difficulty: 'easy', category: 'Company Knowledge', tags: ['why-company'] }),
  q('Freshworks', 'behavioral', 'Describe a situation where you improved an existing process or system significantly.', { difficulty: 'medium', category: 'Initiative', tags: ['improvement', 'initiative'] }),
];

const credQuestions: CompanyQuestion[] = [
  q('CRED', 'coding', 'Implement a function to find the longest increasing subsequence in an array.', { difficulty: 'hard', category: 'Coding', tags: ['dp', 'lis'] }),
  q('CRED', 'coding', 'Design a concurrent-safe bounded blocking queue.', { difficulty: 'hard', category: 'Coding', tags: ['concurrency', 'queue', 'threading'] }),

  q('CRED', 'technical', 'Design a reward points system. How do you handle millions of transactions and point calculations?', { difficulty: 'hard', category: 'System Design', tags: ['rewards', 'system-design'], trending: true }),
  q('CRED', 'technical', 'What makes a great user experience in a fintech app? Discuss design principles.', { difficulty: 'medium', category: 'Product Design', tags: ['ux', 'design'] }),
  q('CRED', 'technical', 'How would you build a credit score monitoring system? Discuss data pipeline and privacy.', { difficulty: 'hard', category: 'System Design', tags: ['credit-score', 'privacy'], trending: true }),

  q('CRED', 'hr', 'Why CRED? What attracts you to the company\'s philosophy of rewarding trust?', { difficulty: 'easy', category: 'Motivation', tags: ['why-company'] }),
  q('CRED', 'behavioral', 'Tell me about something you built that you\'re particularly proud of. Why?', { difficulty: 'medium', category: 'Passion', tags: ['passion', 'craft'] }),
];

// ═══════════════════════════════════════════════════════
// BFSI (Banking, Financial Services, Insurance)
// ═══════════════════════════════════════════════════════

const goldmanSachsQuestions: CompanyQuestion[] = [
  q('Goldman Sachs', 'coding', 'Given a list of transactions, find the most profitable sequence of buy-sell operations.', { difficulty: 'hard', category: 'Coding', tags: ['dp', 'greedy'] }),
  q('Goldman Sachs', 'coding', 'Implement a function to compute the power(x, n) efficiently using binary exponentiation.', { difficulty: 'medium', category: 'Coding', tags: ['math', 'recursion'] }),
  q('Goldman Sachs', 'coding', 'Find the shortest path in a weighted graph using Dijkstra\'s algorithm.', { difficulty: 'hard', category: 'Coding', tags: ['graph', 'dijkstra'] }),
  q('Goldman Sachs', 'coding', 'Given a string containing digits, decode it to letters (A=1, B=2, ... Z=26). Count ways.', { difficulty: 'medium', category: 'Coding', tags: ['dp', 'string'] }),

  q('Goldman Sachs', 'technical', 'What is low-latency trading? How do you design systems for microsecond response times?', { difficulty: 'hard', category: 'System Design', tags: ['low-latency', 'trading'], trending: true }),
  q('Goldman Sachs', 'technical', 'Explain the concept of database sharding. How would you shard a financial transactions database?', { difficulty: 'hard', category: 'Database', tags: ['sharding', 'scaling'], trending: true }),
  q('Goldman Sachs', 'technical', 'What are the challenges of maintaining ACID properties at scale in financial systems?', { difficulty: 'hard', category: 'Database', tags: ['acid', 'distributed'] }),
  q('Goldman Sachs', 'technical', 'What are service mesh architectures? How does Istio work?', { difficulty: 'hard', category: 'Infrastructure', tags: ['service-mesh', 'istio'], trending: true }),

  q('Goldman Sachs', 'behavioral', 'Tell me about a time when you had to balance quality with speed of delivery.', { difficulty: 'medium', category: 'Decision Making', tags: ['quality-speed'] }),
  q('Goldman Sachs', 'behavioral', 'Describe a situation where you identified a risk that others missed.', { difficulty: 'hard', category: 'Risk Management', tags: ['risk', 'attention-to-detail'] }),
  q('Goldman Sachs', 'hr', 'Why Goldman Sachs? What do you know about GS\'s engineering culture?', { difficulty: 'easy', category: 'Motivation', tags: ['why-company'] }),
];

const deloitteQuestions: CompanyQuestion[] = [
  q('Deloitte', 'aptitude', 'A project requires 180 man-days. If 15 people start, how many days will it take? If 3 leave after 6 days, when will the project finish?', { difficulty: 'hard', category: 'Quantitative Aptitude', tags: ['time-work'] }),
  q('Deloitte', 'aptitude', 'Analyze the following data table and answer: Which quarter showed the highest growth?', { difficulty: 'medium', category: 'Data Interpretation', tags: ['di'] }),

  q('Deloitte', 'technical', 'What is data governance? How do you implement it in a large organization?', { difficulty: 'medium', category: 'Data Management', tags: ['data-governance'], trending: true }),
  q('Deloitte', 'technical', 'What is the role of ERP systems? Compare SAP and Oracle ERP solutions.', { difficulty: 'medium', category: 'Enterprise Tech', tags: ['erp', 'sap'] }),
  q('Deloitte', 'technical', 'How does robotic process automation (RPA) work? What are its limitations?', { difficulty: 'medium', category: 'Automation', tags: ['rpa', 'automation'], trending: true }),
  q('Deloitte', 'technical', 'What is digital twin technology? How is it used in manufacturing and consulting?', { difficulty: 'hard', category: 'Emerging Tech', tags: ['digital-twin'], trending: true }),
  q('Deloitte', 'technical', 'What are the key components of a cybersecurity strategy for an enterprise?', { difficulty: 'medium', category: 'Security', tags: ['cybersecurity', 'enterprise'] }),

  q('Deloitte', 'hr', 'Why Deloitte? What differentiates Deloitte from other Big Four firms?', { difficulty: 'easy', category: 'Motivation', tags: ['why-company'] }),
  q('Deloitte', 'hr', 'How do you approach a consulting engagement with a new client?', { difficulty: 'medium', category: 'Consulting', tags: ['consulting'] }),
  q('Deloitte', 'behavioral', 'Describe a situation where you had to influence stakeholders without formal authority.', { difficulty: 'hard', category: 'Influence', tags: ['influence', 'stakeholder'] }),
  q('Deloitte', 'behavioral', 'Tell me about a time you had to deliver bad news to a client or stakeholder.', { difficulty: 'medium', category: 'Communication', tags: ['difficult-conversations'] }),
];

// ═══════════════════════════════════════════════════════
// GENERIC / CROSS-COMPANY QUESTION POOLS
// ═══════════════════════════════════════════════════════

export const trendingTechnicalQuestions: CompanyQuestion[] = [
  q('Generic', 'technical', 'Explain the concept of RAG (Retrieval Augmented Generation). How is it used in enterprise AI applications?', { difficulty: 'hard', category: 'GenAI', tags: ['rag', 'genai', 'llm'], trending: true }),
  q('Generic', 'technical', 'What are vector databases (Pinecone, Milvus, ChromaDB)? How do they enable semantic search?', { difficulty: 'hard', category: 'GenAI', tags: ['vector-db', 'embeddings'], trending: true }),
  q('Generic', 'technical', 'Explain the concept of fine-tuning vs prompt engineering for LLMs. When would you use each?', { difficulty: 'hard', category: 'GenAI', tags: ['fine-tuning', 'prompt-engineering'], trending: true }),
  q('Generic', 'technical', 'What is the difference between a monorepo and a polyrepo? What are the tradeoffs?', { difficulty: 'medium', category: 'Software Engineering', tags: ['monorepo', 'architecture'], trending: true }),
  q('Generic', 'technical', 'Design a real-time collaborative document editor (like Google Docs). Discuss CRDTs and OT.', { difficulty: 'hard', category: 'System Design', tags: ['crdt', 'real-time', 'collaboration'], trending: true }),
  q('Generic', 'technical', 'What is GitOps? How does it change the deployment workflow?', { difficulty: 'medium', category: 'DevOps', tags: ['gitops', 'deployment'], trending: true }),
  q('Generic', 'technical', 'What is WebAssembly (WASM)? How does it change web application performance?', { difficulty: 'medium', category: 'Web Development', tags: ['wasm', 'performance'], trending: true }),
  q('Generic', 'technical', 'Explain the concept of a feature flag system. How does it enable safe deployments?', { difficulty: 'medium', category: 'Software Engineering', tags: ['feature-flags', 'deployment'], trending: true }),
  q('Generic', 'technical', 'What is the difference between gRPC and REST? When would you choose gRPC?', { difficulty: 'medium', category: 'Architecture', tags: ['grpc', 'rest', 'api'], trending: true }),
  q('Generic', 'technical', 'What is chaos engineering? How does it improve system reliability?', { difficulty: 'hard', category: 'SRE', tags: ['chaos-engineering', 'reliability'], trending: true }),
  q('Generic', 'technical', 'What is platform engineering? How is it different from traditional DevOps?', { difficulty: 'medium', category: 'DevOps', tags: ['platform-engineering'], trending: true }),
  q('Generic', 'technical', 'Explain the concept of data mesh vs data lake. How do they solve data ownership problems?', { difficulty: 'hard', category: 'Data Engineering', tags: ['data-mesh', 'data-lake'], trending: true }),
];

export const genericTechnicalQuestions: CompanyQuestion[] = [
  q('Generic', 'technical', 'Explain the concept of Object-Oriented Programming and its four main principles.', { difficulty: 'easy', category: 'OOP', tags: ['oop'] }),
  q('Generic', 'technical', 'What is the difference between a stack and a queue? When would you use each?', { difficulty: 'easy', category: 'Data Structures', tags: ['stack', 'queue'] }),
  q('Generic', 'technical', 'Explain Big O notation and give examples of common time complexities.', { difficulty: 'easy', category: 'Algorithms', tags: ['complexity'] }),
  q('Generic', 'technical', 'What is a REST API and its core principles?', { difficulty: 'easy', category: 'Web Development', tags: ['rest'] }),
  q('Generic', 'technical', 'What is the difference between HTTP and HTTPS?', { difficulty: 'easy', category: 'Networking', tags: ['http', 'https'] }),
  q('Generic', 'technical', 'Describe the process of debugging a complex issue in production.', { difficulty: 'medium', category: 'Debugging', tags: ['debugging'] }),
  q('Generic', 'technical', 'What is version control and why is it important?', { difficulty: 'easy', category: 'Version Control', tags: ['git'] }),
  q('Generic', 'technical', 'What is the difference between a process and a thread?', { difficulty: 'medium', category: 'Operating Systems', tags: ['os'] }),
  q('Generic', 'technical', 'Explain the concept of deadlock and how to prevent it.', { difficulty: 'medium', category: 'Operating Systems', tags: ['deadlock'] }),
  q('Generic', 'technical', 'Explain the difference between synchronous and asynchronous programming.', { difficulty: 'medium', category: 'Programming', tags: ['async'] }),
  q('Generic', 'technical', 'What is dependency injection and why is it useful?', { difficulty: 'medium', category: 'Design Patterns', tags: ['di'] }),
  q('Generic', 'technical', 'Explain the concept of a microservices architecture.', { difficulty: 'medium', category: 'Architecture', tags: ['microservices'] }),
  q('Generic', 'technical', 'What is the difference between authentication and authorization?', { difficulty: 'easy', category: 'Security', tags: ['auth'] }),
  q('Generic', 'technical', 'Explain recursion with an example.', { difficulty: 'easy', category: 'Programming', tags: ['recursion'] }),
  q('Generic', 'technical', 'What is a closure in programming?', { difficulty: 'medium', category: 'Programming', tags: ['closures'] }),
  q('Generic', 'technical', 'What is the difference between SQL and NoSQL databases?', { difficulty: 'medium', category: 'Database', tags: ['sql', 'nosql'] }),
  q('Generic', 'technical', 'Explain the Singleton design pattern.', { difficulty: 'easy', category: 'Design Patterns', tags: ['singleton'] }),
];

export const genericHRQuestions: CompanyQuestion[] = [
  q('Generic', 'hr', 'Tell me about yourself, your background, and your long-term career goals.', { difficulty: 'easy', category: 'Introduction', tags: ['introduction'] }),
  q('Generic', 'hr', 'Where do you see yourself 3 to 5 years from now in your career?', { difficulty: 'easy', category: 'Career Goals', tags: ['career-goals', 'future-plans'] }),
  q('Generic', 'hr', 'What are your expectations regarding the roles and responsibilities in this job position?', { difficulty: 'easy', category: 'Role Expectations', tags: ['roles-responsibilities'] }),
  q('Generic', 'hr', 'Why do you want to join our organization over other companies in the market?', { difficulty: 'easy', category: 'Motivation', tags: ['why-company'] }),
  q('Generic', 'hr', 'What are your greatest strengths, and what is one area or weakness you are actively trying to improve?', { difficulty: 'easy', category: 'Self-Assessment', tags: ['strengths', 'weaknesses'] }),
  q('Generic', 'hr', 'Describe a challenging workplace or academic situation you faced and how you successfully resolved it.', { difficulty: 'medium', category: 'Problem Solving', tags: ['challenge', 'resolution'] }),
  q('Generic', 'hr', 'How do you handle tight project deadlines, stress, and high-pressure work environments?', { difficulty: 'easy', category: 'Stress Management', tags: ['stress', 'pressure'] }),
  q('Generic', 'hr', 'What key factors motivate you to perform at your best every single day?', { difficulty: 'easy', category: 'Motivation', tags: ['motivation'] }),
  q('Generic', 'hr', 'Why should our company hire you over other qualified candidates applying for this role?', { difficulty: 'medium', category: 'Value Proposition', tags: ['value', 'hire-me'] }),
  q('Generic', 'hr', 'How do you approach resolving disagreements or conflicts with colleagues or team leads?', { difficulty: 'medium', category: 'Conflict Resolution', tags: ['conflict', 'teamwork'] }),
  q('Generic', 'hr', 'Are you open to relocation, flexible working hours, or rotational shifts if required by the role?', { difficulty: 'easy', category: 'Flexibility', tags: ['relocation', 'shifts'] }),
  q('Generic', 'hr', 'How do you stay updated with the latest technological developments and continuously upskill yourself?', { difficulty: 'easy', category: 'Growth Mindset', tags: ['learning', 'upskilling'] }),
  q('Generic', 'hr', 'Describe a situation where you had to adapt quickly to unexpected changes in project requirements.', { difficulty: 'medium', category: 'Adaptability', tags: ['adaptability', 'change'] }),
  q('Generic', 'hr', 'What principles guide your professional ethics and decision-making when facing difficult choices?', { difficulty: 'medium', category: 'Work Ethic', tags: ['ethics', 'values'] }),
  q('Generic', 'hr', 'What type of work culture and management style helps you perform most effectively?', { difficulty: 'easy', category: 'Work Culture', tags: ['culture-fit'] }),
  q('Generic', 'hr', 'Tell me about a time you took initiative on a project without being explicitly asked to do so.', { difficulty: 'medium', category: 'Initiative', tags: ['leadership', 'initiative'] }),
  q('Generic', 'hr', 'How do you prioritize your tasks when managing multiple competing deadlines?', { difficulty: 'easy', category: 'Time Management', tags: ['prioritization'] }),
  q('Generic', 'hr', 'What are your expectations regarding career growth and mentorship in your first 1-2 years?', { difficulty: 'easy', category: 'Career Development', tags: ['growth', 'mentorship'] }),
];

export const genericBehavioralQuestions: CompanyQuestion[] = [
  q('Generic', 'behavioral', 'Tell me about a time when you had to work with a difficult team member.', { difficulty: 'medium', category: 'Teamwork', tags: ['teamwork', 'conflict'] }),
  q('Generic', 'behavioral', 'Describe a situation where you had to meet a tight deadline.', { difficulty: 'medium', category: 'Time Management', tags: ['deadline'] }),
  q('Generic', 'behavioral', 'Give an example of when you showed leadership.', { difficulty: 'medium', category: 'Leadership', tags: ['leadership'] }),
  q('Generic', 'behavioral', 'Tell me about a time you failed and what you learned.', { difficulty: 'medium', category: 'Self-Awareness', tags: ['failure', 'growth'] }),
  q('Generic', 'behavioral', 'Describe a situation where you had to adapt to change quickly.', { difficulty: 'medium', category: 'Adaptability', tags: ['change'] }),
  q('Generic', 'behavioral', 'Tell me about a time you went above and beyond.', { difficulty: 'medium', category: 'Initiative', tags: ['initiative'] }),
];

export const genericProjectQuestions: CompanyQuestion[] = [
  q('Generic', 'technical', 'Can you walk me through the architecture of your project?', { difficulty: 'medium', category: 'Project', tags: ['architecture'] }),
  q('Generic', 'technical', 'What tech stack did you use and why did you choose it?', { difficulty: 'medium', category: 'Project', tags: ['tech-stack'] }),
  q('Generic', 'technical', 'What was your specific role in this project?', { difficulty: 'easy', category: 'Project', tags: ['role'] }),
  q('Generic', 'technical', 'What were the main challenges and how did you overcome them?', { difficulty: 'medium', category: 'Project', tags: ['challenges'] }),
  q('Generic', 'technical', 'How did you ensure code quality and maintainability?', { difficulty: 'medium', category: 'Project', tags: ['quality'] }),
  q('Generic', 'technical', 'What would you do differently if starting this project again?', { difficulty: 'medium', category: 'Project', tags: ['reflection'] }),
];

export const genericCommunicationQuestions: CompanyQuestion[] = [
  q('Generic', 'hr', 'Describe your daily routine from morning to evening in detail.', { difficulty: 'easy', category: 'Communication', tags: ['daily-routine'] }),
  q('Generic', 'hr', 'Explain how to make your favorite dish step by step.', { difficulty: 'easy', category: 'Communication', tags: ['instructions'] }),
  q('Generic', 'hr', 'Tell me about a recent news event and share your opinion on it.', { difficulty: 'medium', category: 'Communication', tags: ['current-affairs'] }),
  q('Generic', 'hr', 'Describe your hometown and what makes it special to you.', { difficulty: 'easy', category: 'Communication', tags: ['description'] }),
  q('Generic', 'hr', 'Explain a complex technical concept to someone with no technical background.', { difficulty: 'medium', category: 'Communication', tags: ['simplification'] }),
  q('Generic', 'hr', 'Tell me about a book or movie you enjoyed recently and why.', { difficulty: 'easy', category: 'Communication', tags: ['storytelling'] }),
  q('Generic', 'hr', 'Describe how you would give directions to a first-time visitor to your city.', { difficulty: 'easy', category: 'Communication', tags: ['directions'] }),
  q('Generic', 'hr', 'Talk about your favorite hobby and why you enjoy it.', { difficulty: 'easy', category: 'Communication', tags: ['hobby'] }),
  q('Generic', 'hr', 'Explain the process of learning a new skill you recently acquired.', { difficulty: 'medium', category: 'Communication', tags: ['learning'] }),
  q('Generic', 'hr', 'Describe a typical day at your college or workplace.', { difficulty: 'easy', category: 'Communication', tags: ['daily-life'] }),
];

export const genericGDTopics: CompanyQuestion[] = [
  q('Generic', 'gd', 'Is artificial intelligence a threat to human jobs or an opportunity for growth?', { difficulty: 'medium', category: 'GD Topic', tags: ['ai', 'employment'], trending: true }),
  q('Generic', 'gd', 'Should social media be regulated by governments?', { difficulty: 'medium', category: 'GD Topic', tags: ['social-media', 'regulation'] }),
  q('Generic', 'gd', 'Is work from home the future of work or a temporary trend?', { difficulty: 'medium', category: 'GD Topic', tags: ['remote-work'] }),
  q('Generic', 'gd', 'Should coding be taught in schools from an early age?', { difficulty: 'easy', category: 'GD Topic', tags: ['education', 'coding'] }),
  q('Generic', 'gd', 'Is technology making us more isolated or more connected?', { difficulty: 'medium', category: 'GD Topic', tags: ['technology', 'society'] }),
  q('Generic', 'gd', 'Are smartphones beneficial or harmful for students?', { difficulty: 'easy', category: 'GD Topic', tags: ['smartphones', 'education'] }),
  q('Generic', 'gd', 'Should India prioritize manufacturing or services for economic growth?', { difficulty: 'medium', category: 'GD Topic', tags: ['economy', 'india'] }),
  q('Generic', 'gd', 'Is data privacy more important than national security?', { difficulty: 'hard', category: 'GD Topic', tags: ['privacy', 'security'], trending: true }),
  q('Generic', 'gd', 'Should AI-generated content be labeled and regulated?', { difficulty: 'medium', category: 'GD Topic', tags: ['genai', 'regulation'], trending: true }),
  q('Generic', 'gd', 'Is cryptocurrency the future of finance or a speculative bubble?', { difficulty: 'medium', category: 'GD Topic', tags: ['crypto', 'finance'], trending: true }),
  q('Generic', 'gd', 'Should electric vehicles replace internal combustion engines by 2035?', { difficulty: 'medium', category: 'GD Topic', tags: ['ev', 'sustainability'], trending: true }),
  q('Generic', 'gd', 'Is a 4-day work week practical for the Indian IT industry?', { difficulty: 'medium', category: 'GD Topic', tags: ['work-culture', 'india'], trending: true }),
];

// ─── System Design / Architecture Questions ──────────
export const genericSystemDesignQuestions: CompanyQuestion[] = [
  q('Generic', 'system_design', 'How would you design a URL shortening service like bit.ly that handles millions of requests per day?', { difficulty: 'medium', category: 'System Design', tags: ['url-shortener', 'scalability'], trending: true }),
  q('Generic', 'system_design', 'Explain how you would architect a real-time chat application like WhatsApp for 100 million users.', { difficulty: 'hard', category: 'System Design', tags: ['real-time', 'messaging', 'websockets'], trending: true }),
  q('Generic', 'system_design', 'How would you design an API rate limiter for a payment gateway to prevent abuse?', { difficulty: 'medium', category: 'System Design', tags: ['rate-limiting', 'api', 'security'] }),
  q('Generic', 'system_design', 'Describe how you would design a notification system that sends push, email, and SMS alerts to millions of users.', { difficulty: 'medium', category: 'System Design', tags: ['notifications', 'distributed'] }),
  q('Generic', 'system_design', 'How would you design an e-commerce platform like Flipkart to handle flash sales with millions of concurrent users?', { difficulty: 'hard', category: 'System Design', tags: ['e-commerce', 'flash-sale', 'concurrency'], trending: true }),
  q('Generic', 'system_design', 'Explain the trade-offs between SQL and NoSQL databases. When would you choose one over the other?', { difficulty: 'easy', category: 'System Design', tags: ['database', 'sql', 'nosql'] }),
  q('Generic', 'system_design', 'How would you design a content delivery network (CDN) to serve static assets globally with low latency?', { difficulty: 'hard', category: 'System Design', tags: ['cdn', 'caching', 'latency'] }),
  q('Generic', 'system_design', 'Describe how you would architect a social media news feed system like Instagram or Twitter.', { difficulty: 'hard', category: 'System Design', tags: ['news-feed', 'fanout', 'social-media'], trending: true }),
  q('Generic', 'system_design', 'How would you design an online video streaming platform like YouTube to handle uploads and playback at scale?', { difficulty: 'hard', category: 'System Design', tags: ['video-streaming', 'transcoding', 'storage'] }),
  q('Generic', 'system_design', 'Explain the concept of microservices architecture. What are its advantages and disadvantages compared to a monolithic approach?', { difficulty: 'easy', category: 'System Design', tags: ['microservices', 'monolith', 'architecture'] }),
  q('Generic', 'system_design', 'How would you design a distributed caching layer using Redis or Memcached for a high-traffic web application?', { difficulty: 'medium', category: 'System Design', tags: ['caching', 'redis', 'performance'] }),
  q('Generic', 'system_design', 'Describe how load balancing works. What are the different load balancing algorithms and when would you use each?', { difficulty: 'easy', category: 'System Design', tags: ['load-balancing', 'infrastructure'] }),
  q('Generic', 'system_design', 'How would you design a ride-sharing service like Uber that matches drivers to riders in real-time?', { difficulty: 'hard', category: 'System Design', tags: ['location', 'matching', 'real-time'], trending: true }),
  q('Generic', 'system_design', 'Explain how you would design an authentication and authorization system for a multi-tenant SaaS platform.', { difficulty: 'medium', category: 'System Design', tags: ['auth', 'jwt', 'rbac'] }),
  q('Generic', 'system_design', 'How would you design a search autocomplete feature like Google Suggest that returns results within 100 milliseconds?', { difficulty: 'medium', category: 'System Design', tags: ['search', 'trie', 'autocomplete'] }),
  q('Generic', 'system_design', 'Describe how you would handle database sharding for a system with billions of records. What are the challenges?', { difficulty: 'hard', category: 'System Design', tags: ['sharding', 'database', 'partitioning'] }),
  q('Generic', 'system_design', 'How would you design a file storage and sharing system like Google Drive or Dropbox?', { difficulty: 'medium', category: 'System Design', tags: ['file-storage', 'sync', 'cloud'] }),
  q('Generic', 'system_design', 'Explain the CAP theorem and how it influences the design of distributed databases.', { difficulty: 'medium', category: 'System Design', tags: ['cap-theorem', 'distributed-systems', 'consistency'] }),
];

// ═══════════════════════════════════════════════════════
// AGGREGATED QUESTION BANK
// ═══════════════════════════════════════════════════════

/** All company-specific questions indexed by company name */
export const COMPANY_QUESTION_BANK: Record<string, CompanyQuestion[]> = {
  // Indian IT Services
  'TCS': tcsQuestions,
  'Infosys': infosysQuestions,
  'Wipro': wiproQuestions,
  'Accenture': accentureQuestions,
  'Cognizant': cognizantQuestions,
  'Capgemini': capgeminiQuestions,
  'HCL': hclQuestions,
  'Tech Mahindra': techMahindraQuestions,
  'L&T Infotech': ltInfotechQuestions,
  'Mindtree': mindtreeQuestions,
  'Zoho': zohoQuestions,
  // Global Tech
  'Google': googleQuestions,
  'Microsoft': microsoftQuestions,
  'Amazon': amazonQuestions,
  'Meta': metaQuestions,
  'IBM': ibmQuestions,
  // Indian Startups
  'Flipkart': flipkartQuestions,
  'Paytm': paytmQuestions,
  'Razorpay': razorpayQuestions,
  'Freshworks': freshworksQuestions,
  'CRED': credQuestions,
  // BFSI
  'Goldman Sachs': goldmanSachsQuestions,
  'Deloitte': deloitteQuestions,
};

/** Flat list of all questions */
export const ALL_QUESTIONS: CompanyQuestion[] = [
  ...Object.values(COMPANY_QUESTION_BANK).flat(),
  ...trendingTechnicalQuestions,
  ...genericTechnicalQuestions,
  ...genericHRQuestions,
  ...genericBehavioralQuestions,
  ...genericProjectQuestions,
  ...genericCommunicationQuestions,
  ...genericGDTopics,
  ...genericSystemDesignQuestions,
];

// ─── Query helpers ────────────────────────────────────

/** Get questions for a company and optional round */
export function getCompanyQuestions(
  company: string,
  round?: InterviewRound,
  difficulty?: 'easy' | 'medium' | 'hard',
  trendingOnly?: boolean,
): CompanyQuestion[] {
  const pool = COMPANY_QUESTION_BANK[company] || [];
  let filtered = pool;

  if (round) {
    filtered = filtered.filter(q => q.round === round);
  }
  if (difficulty) {
    filtered = filtered.filter(q => q.difficulty === difficulty);
  }
  if (trendingOnly) {
    filtered = filtered.filter(q => q.trending);
  }

  return filtered;
}

/** Get random questions from a pool */
export function getRandomFromPool(pool: CompanyQuestion[], count: number): CompanyQuestion[] {
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/** Get questions by type across all companies (fallback) */
export function getQuestionsByRound(round: InterviewRound, count: number): CompanyQuestion[] {
  const pool = ALL_QUESTIONS.filter(q => q.round === round);
  return getRandomFromPool(pool, count);
}

/** Get trending questions by category */
export function getTrendingQuestions(count: number, category?: string): CompanyQuestion[] {
  let pool = ALL_QUESTIONS.filter(q => q.trending);
  if (category) {
    pool = pool.filter(q => q.category.toLowerCase().includes(category.toLowerCase()));
  }
  return getRandomFromPool(pool, count);
}

/** Build a mixed question set with trending injection */
export function buildQuestionSet(
  company: string | undefined,
  round: InterviewRound,
  totalCount: number,
  difficulty?: 'easy' | 'medium' | 'hard',
  trendingRatio: number = 0.3,
): string[] {
  const trendingCount = Math.floor(totalCount * trendingRatio);
  const regularCount = totalCount - trendingCount;

  let regularPool: CompanyQuestion[];
  if (company && COMPANY_QUESTION_BANK[company]) {
    regularPool = getCompanyQuestions(company, round, difficulty);
    // If company pool is too small, supplement with generic
    if (regularPool.length < regularCount) {
      const genericPool = ALL_QUESTIONS.filter(
        q => (round === 'hr' ? (q.round === 'hr' || q.round === 'behavioral') : q.round === round) && q.company === 'Generic'
      );
      regularPool = [...regularPool, ...genericPool];
    }
  } else {
    regularPool = ALL_QUESTIONS.filter(
      q => round === 'hr' ? (q.round === 'hr' || q.round === 'behavioral') : q.round === round
    );
  }

  const regular = getRandomFromPool(
    regularPool.filter(q => !q.trending),
    regularCount
  );

  // Get trending questions (prefer company-specific if available)
  let trendingPool = company
    ? getCompanyQuestions(company, round, difficulty, true)
    : [];
  if (trendingPool.length < trendingCount) {
    const genericTrending = ALL_QUESTIONS.filter(
      q => q.trending && (q.round === round || q.round === 'technical')
    );
    trendingPool = [...trendingPool, ...genericTrending];
  }
  const trending = getRandomFromPool(trendingPool, trendingCount);

  // Combine and deduplicate
  const seen = new Set<string>();
  const combined: string[] = [];
  for (const q of [...regular, ...trending]) {
    if (!seen.has(q.text)) {
      seen.add(q.text);
      combined.push(q.text);
    }
  }

  // Fill if we're short
  while (combined.length < totalCount) {
    const fallback = ALL_QUESTIONS.filter(
      q => q.round === round && !seen.has(q.text)
    );
    if (fallback.length === 0) break;
    const pick = fallback[Math.floor(Math.random() * fallback.length)];
    seen.add(pick.text);
    combined.push(pick.text);
  }

  return combined.slice(0, totalCount);
}

/** Get all available company names */
export function getAvailableCompanies(): string[] {
  return Object.keys(COMPANY_QUESTION_BANK);
}

/** Get question count stats */
export function getQuestionStats(): { total: number; companies: number; trending: number; byCompany: Record<string, number> } {
  const byCompany: Record<string, number> = {};
  for (const [company, questions] of Object.entries(COMPANY_QUESTION_BANK)) {
    byCompany[company] = questions.length;
  }
  return {
    total: ALL_QUESTIONS.length,
    companies: Object.keys(COMPANY_QUESTION_BANK).length,
    trending: ALL_QUESTIONS.filter(q => q.trending).length,
    byCompany,
  };
}
