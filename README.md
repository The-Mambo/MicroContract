# ContractGuard - AI Contract Analyzer

A React application that analyzes contracts using AI to identify potential risks and provide suggestions for improvement.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Get a free Groq API key:
   - Visit [Groq Console](https://console.groq.com/keys)
   - Create a free account
   - Generate an API key

3. Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

4. Add your Groq API key to the `.env` file:
```
VITE_GROQ_API_KEY=your_actual_api_key_here
```

5. Start the development server:
```bash
npm run dev
```

## Features

- Upload PDF and DOCX contracts
- AI-powered risk analysis using Groq's Llama model
- Plain-English explanations of contract risks
- Suggested improvements for problematic clauses
- Side-by-side comparison view
- Export functionality

## Supported File Types

- PDF files (.pdf)
- Microsoft Word documents (.docx)

## API Usage

The application uses Groq's free tier which includes:
- 30 requests per minute
- 6,000 requests per day
- No credit card required

Perfect for testing and small-scale usage.