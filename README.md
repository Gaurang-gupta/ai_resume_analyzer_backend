# 📄 AI Resume Analyzer

AI Resume Analyzer is a modern, AI-driven web application that allows users to upload resumes, analyze them against job descriptions, and receive deep performance insights, scoring, and recommendations. It includes advanced analytics, visualizations, and downloadable reports — ideal for job seekers and professionals refining their resumes.

# 🚀 Features
## 📊 Resume Analysis

1. AI-powered scoring: Generates an overall resume quality score (0–100) based on skills, experience, and education alignment.
2. Breakdown metrics: Detailed component scores for skills match, experience match, and education match.
3. Insights & recommendations: Personalized suggestions to improve content and structure.

## 📈 Dashboard & Analytics

1. Trend charts: Visualize how scores evolve over multiple analyses.
2. Volatility & moving averages: Detect performance stability and trends over time.
3. Benchmark comparison: Compare scores against configurable targets.

## 📊 Additional Visualizations

1. Skill gap chart: Most frequently missing skills across analyses.
2. Experience mismatch analytics: Visualize gaps between required vs inferred levels.
3. Education pass/fail chart: Snapshot of whether education matched job requirements.
4. Score distribution histogram: Understand how scores spread across categories.

## 🤖 AI Narrative Summary & Reports

1. AI-generated summary: Human-friendly interpretation of resume performance.
2. PDF report export: Fully exportable performance report for sharing or documentation.

## 🧠 Backend & Storage

1. Supabase database integration for storing resumes and analysis records.
2. Realtime status tracking of analysis tasks.

# 📦 Tech Stack
| Layer                  |              Tools              |
|:-----------------------|:-------------------------------:|
| Frontend               |   	Next.js, React, TypeScript   |
| Charts & Visualization |            	Recharts            |
| Data Backend           |  	Supabase (PostgreSQL + APIs)  |
|AI Processing	| Custom models / API integration |
|Styling |	Tailwind CSS |

# 🛠️ Getting Started
## ✅ Requirements
1. Node.js 18+
2. NPM or Yarn
3. Supabase project with credentials

## 🔧 Installation
```bash
git clone https://github.com/Gaurang-gupta/AI_resume_analyzer.git
cd AI_resume_analyzer
npm install
```

Create a `.env.local` file in the root:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

## 🚀 Run Locally
```bash
npm run dev
```

Open in your browser:
```bash
http://localhost:3000
```

## 📊 Example Output
1. ✔ Trend analysis
2. ✔ Breakdown charts
3. ✔ AI-generated tips
4. ✔ Downloadable PDF performance report

## 📌 Usage
1. Upload a resume with job title & description.
2. Wait for AI analysis — status updates in dashboard.
3. Explore visual insights and recommendation panels.
4. Export PDF report with all metrics and charts.

## 🧪 Configurations
| Variable               |              Description        |
|:-----------------------|:-------------------------------:|
| NEXT_PUBLIC_SUPABASE_URL |	Your Supabase project URL |
|NEXT_PUBLIC_SUPABASE_ANON_KEY	|Supabase anon key|

## 👥 Contributing

Contributions are welcome!

1. Fork the repo
2. Create a branch (git checkout -b feature-name)
3. Commit your changes
4. Push and open a pull request

## 📝 License
This project is licensed under the MIT License.

## 🙌 Acknowledgements

Thanks to all open source communities and libraries that make AI-powered analytics and visualization possible.