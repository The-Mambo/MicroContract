import Groq from 'groq-sdk';

// Initialize Groq client only if API key is available
const getGroqClient = () => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('Groq API key not found. Please add VITE_GROQ_API_KEY to your .env file.');
  }
  return new Groq({
    apiKey,
    dangerouslyAllowBrowser: true
  });
};

export interface RiskItem {
  id: string;
  type: 'high' | 'medium' | 'low';
  category: string;
  description: string;
  explanation: string;
  suggestion: string;
  location: string;
  originalClause?: string;
  suggestedClause?: string;
}

export interface AnalysisResult {
  risks: RiskItem[];
  overallScore: number;
  totalClauses: number;
  originalText: string;
  revisedSections: Array<{
    section: string;
    original: string;
    revised: string;
  }>;
}

export async function extractTextFromFile(file: File): Promise<string> {
  if (file.type === 'application/pdf') {
    // For now, we'll show a helpful message for PDF files
    // PDF parsing in the browser is complex and requires backend processing
    throw new Error('PDF files are not yet supported. Please convert your contract to a DOCX file or copy/paste the text into a new Word document and upload that instead.');
  } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    // For DOCX files, we'll use mammoth
    try {
      const mammoth = await import('mammoth');
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } catch (error) {
      throw new Error('Error reading DOCX file. Please ensure the file is not corrupted.');
    }
  } else if (file.type === 'text/plain') {
    // Support plain text files
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Error reading text file'));
      reader.readAsText(file);
    });
  } else {
    throw new Error('Unsupported file type. Please upload a DOCX or TXT file.');
  }
}

export async function analyzeContract(contractText: string): Promise<AnalysisResult> {
  const prompt = `
You are a legal expert analyzing a contract for potential risks. Analyze the following contract text and identify problematic clauses.

Contract Text:
${contractText}

Please analyze this contract and identify risks in the following categories:
1. Payment Terms (vague timelines, unclear amounts, no late fees)
2. Intellectual Property (unclear ownership, missing IP clauses)
3. Scope of Work (unlimited revisions, vague deliverables)
4. Termination (no notice period, unfair termination clauses)
5. Liability (unlimited liability, missing limitation clauses)
6. Non-compete (overly broad restrictions)
7. Confidentiality (missing or weak NDAs)

For each risk found, provide:
- Risk level (high/medium/low)
- Category
- Brief description
- Plain English explanation of why it's problematic
- Specific suggestion for improvement
- Location in contract (section/clause reference if available)
- Original problematic clause text (exact quote from contract)
- Suggested replacement clause text

Also provide:
- Overall risk score (0-100, where 100 is safest)
- Total number of clauses analyzed
- For the top 3-5 most important risks, provide revised sections showing original vs improved text

Format your response as a JSON object with this structure:
{
  "risks": [
    {
      "type": "high|medium|low",
      "category": "category name",
      "description": "brief description",
      "explanation": "why this is problematic",
      "suggestion": "specific improvement suggestion",
      "location": "section reference"
      "originalClause": "exact text from contract",
      "suggestedClause": "improved replacement text"
    }
  ],
  "overallScore": number,
  "totalClauses": number,
  "revisedSections": [
    {
      "section": "section name/number",
      "original": "original problematic text",
      "revised": "improved text with changes highlighted"
    }
  ]
}

Only return the JSON object, no other text.
`;

  try {
    const groq = getGroqClient();
    
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 4000,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from AI analysis');
    }

    // Clean and parse the JSON response
    const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();
    const analysisData = JSON.parse(cleanResponse);
    
    // Add unique IDs to each risk
    const risksWithIds = analysisData.risks.map((risk: any, index: number) => ({
      ...risk,
      id: `risk-${index + 1}`
    }));

    return {
      risks: risksWithIds,
      overallScore: analysisData.overallScore,
      totalClauses: analysisData.totalClauses,
      originalText: contractText,
      revisedSections: analysisData.revisedSections || []
    };
  } catch (error) {
    console.error('Error analyzing contract:', error);
    
    // Re-throw the error to be handled by the UI
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('An unexpected error occurred during analysis');
    }
  }
}