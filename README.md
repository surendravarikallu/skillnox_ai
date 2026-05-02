# Skilnox AI - AI-Powered Interview Preparation Platform

**Skilnox AI** is a cutting-edge, artificial intelligence-driven platform designed to help students and job seekers master their interviews. By leveraging advanced Natural Language Processing (NLP), Computer Vision, and Audio Analysis, Skilnox AI provides a comprehensive, real-time mock interview experience with personalized feedback.

## 🚀 Key Features

### 🧠 Intelligent Interview System
*   **Multi-Mode Interviews**: Practice for **Technical**, **HR**, **Behavioral**, and **Project-based** rounds.
*   **Company-Specific Drills**: Simulates interview patterns for top MNCs like **TCS, Infosys, Wipro, Accenture, Amazon**, and more.
*   **Dynamic Questioning**: Uses a **Local LLM (TinyLlama / Phi-3)** or rule-based logic to generate unique, context-aware questions.
*   **Real-time Feedback**: Instant analysis of your answers with scores for relevance, clarity, and depth.

### 📄 Advanced Resume Analysis
*   **Smart Parsing**: Automatically extracts skills, education, and experience from PDF resumes using AI.
*   **Skill Gap Analysis**: Compares your resume against job descriptions to identify missing key skills.
*   **Optimization Tips**: Provides actionable suggestions to improve your ATS score and resume impact.

### 🎯 Holistic Performance Metrics
*   **Placement Probability**: Predicts your chances of getting hired within 30, 60, or 90 days based on your performance.
*   **Emotion Analysis**: (Experimental) Analyzes confidence and facial expressions during video interviews.
*   **Voice Analysis**: (Experimental) Evaluates speech clarity and tone.
*   **Detailed Reports**: Comprehensive dashboard showing your progress across Technical, Communication, and Confidence metrics.

## 🛠️ Tech Stack

### Frontend
*   **Framework**: React (Vite)
*   **Styling**: TailwindCSS, Radix UI, Framer Motion
*   **State Management**: React Query, React Hook Form
*   **Language**: TypeScript

### Backend
*   **Runtime**: Node.js
*   **Framework**: Express.js
*   **Database**: PostgreSQL
*   **ORM**: Drizzle ORM
*   **Authentication**: Passport.js

### AI & Machine Learning Service
*   **Framework**: FastAPI (Python)
*   **ML Libraries**: PyTorch, Transformers (Hugging Face), Scikit-learn
*   **Local LLM**: TinyLlama-1.1B (Default) / Phi-3-mini
*   **Tools**: Better-Whisper (ASR), PDF.js

## 📦 Prerequisites

Ensure you have the following installed on your system:

*   **Node.js** (v18 or higher)
*   **Python** (v3.8 or higher)
*   **PostgreSQL** (Database server)
*   **Git**

## ⚡ Installation & Setup

Follow these steps to set up the project locally.

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/Skilnox-AI.git
cd Interview_ai
```

### 2. Install Dependencies

**Frontend & Backend (Node.js)**
```bash
npm install
```

**AI Service (Python)**
```bash
pip install -r python-ai/requirements.txt
```

### 3. Database Setup

1.  Make sure your PostgreSQL server is running.
2.  Create a `.env` file in the root directory (use `env.template` as a reference) and set your `DATABASE_URL`.
3.  Push the schema to the database:
    ```bash
    npm run db:push
    ```

### 4. Setup Local LLM
To enable the AI capabilities locally (downloads the model ~2GB):

**Windows:**
```bash
python-ai\install_llm.bat
```

**Linux/Mac:**
```bash
chmod +x python-ai/install_llm.sh
./python-ai/install_llm.sh
```

## 🏃‍♂️ Running the Application

You can start all services (Frontend, Backend, Python AI) with a single command:

**Windows:**
```bash
start-servers.bat
```
*Alternatively, run `npm run dev` in one terminal and start the python service separately.*

The application will be available at:
*   **Web App**: http://localhost:5000 (or the port specified in Vite)
*   **Python AI Service**: http://localhost:6000

## 📂 Project Structure

*   **/client**: React frontend application code.
*   **/server**: Node.js/Express backend API and database modules.
*   **/python-ai**: Python service handling LLM, Resume Analysis, and ML inference.
*   **/shared**: Shared TypeScript schemas and types.
*   **/migrations**: Database migration files.

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License
This project is licensed under the MIT License.


## Fine-Tuning Pipeline
SkillnoxAI uses a custom QLoRA fine-tuning pipeline targeting Qwen2.5-7B. See python-ai/training for the Colab notebook and extended datasets.