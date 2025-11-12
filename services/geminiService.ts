/**
 * Eburon Content Brain
 * 
 * This service orchestrates a multi-step analysis using the Gemini API 
 * to determine the authenticity of social media content.
 */
import { GoogleGenAI, Type } from "@google/genai";
import type { AnalysisResult, AnalysisStep } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

const analyzeImage = async (imageFile: File): Promise<string> => {
  const imagePart = await fileToGenerativePart(imageFile);
  const prompt = "You are an expert in detecting AI-generated images. Analyze this image (a snapshot from a video) for any artifacts, inconsistencies, or tell-tale signs of AI generation (e.g., strange hands, odd textures, morphing objects, unnatural lighting). Provide a concise summary of your findings. If no signs are found, state that.";
  
  const response = await ai.models.generateContent({
    model: 'gemini-flash-latest',
    contents: { parts: [imagePart, { text: prompt }] },
  });

  return response.text;
};

const factCheckWithSearch = async (description: string, url: string): Promise<{ text: string; sources: { uri: string; title: string; }[] }> => {
  const context = url ? `The content is reportedly from this URL: ${url}. Prioritize analyzing the content at this URL.` : '';
  const prompt = `You are a fact-checker. Search the web based on the following information. Your primary goal is to find the original source or the earliest appearance of this content. Also, find any relevant context, news, or discussions about its authenticity.
${context}
User Description: '${description}'.
Summarize your findings concisely.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources = groundingChunks
    .filter(chunk => chunk.web)
    .map(chunk => ({
      uri: chunk.web?.uri || '',
      title: chunk.web?.title || 'Untitled',
    }))
    .filter(source => source.uri);

  return { text: response.text, sources };
};

const inferMetadata = async (description: string, imageFile: File | null, url: string): Promise<string> => {
    const urlContext = url ? `URL Provided: "${url}" (Analyze for clues like domain reputation, user handle, platform-specific patterns).` : '';
    const prompt = `You are a digital forensics expert specializing in social media content. Based on the provided information, analyze and infer potential metadata.
    
    Description: "${description}"
    ${urlContext}

    Your task is to speculate on the following, explaining your reasoning:
    - **Creation Date:** Estimate a plausible creation date or timeframe based on the events described.
    - **Device Used:** Infer the type of device likely used (e.g., specific smartphone model, professional DSLR, drone) based on visual cues in the image (if provided) or context from the description.
    - **Software Tags:** Look for any visible watermarks or artifacts that might suggest specific editing software (e.g., Adobe Premiere, CapCut, TikTok's native editor).
    
    Provide a concise summary of your inferences. If there is not enough information, state that clearly.`;

    const parts: any[] = [{ text: prompt }];
    if (imageFile) {
        const imagePart = await fileToGenerativePart(imageFile);
        parts.unshift(imagePart);
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts },
    });

    return response.text;
};

const analyzeTranscript = async (transcript: string): Promise<string> => {
  const prompt = `You are a linguistic analyst specializing in detecting AI-generated or manipulated speech. Analyze the following transcript for signs that it may not be genuine human speech.
  
  Transcript: "${transcript}"

  Look for:
  - Unnatural phrasing or grammar.
  - Lack of filler words (uh, um) or natural pauses.
  - Overly formal or robotic language.
  - Out-of-character statements or vocabulary for the supposed speaker.

  Provide a concise summary of your findings. If the transcript seems natural, state that and explain why.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return response.text;
};

const synthesizeResults = async (
  url: string,
  description: string, 
  visualAnalysis: string, 
  webAnalysis: { text: string; sources: any[] },
  metadataInference: string,
  speechAnalysis: string
): Promise<AnalysisResult> => {
  const prompt = `
    You are an expert AI content and disinformation analyst, branded as the Eburon Content Brain. Your task is to produce a definitive "Proof-of-Concept" report determining if a piece of social media content is AI-generated or real.

    **Evidence Provided:**
    - **Source URL:** ${url || "Not provided"}
    - **Content Description:** "${description}"
    - **Visual Analysis:** ${visualAnalysis}
    - **Web Fact-Check:** ${webAnalysis.text}
    - **Metadata Inference:** ${metadataInference}
    - **Speech/Transcript Analysis:** ${speechAnalysis}

    **Your Task:**
    Synthesize all the evidence into a final assessment. Your response MUST be a single, valid JSON object with the specified structure, and no other text or markdown formatting.

    **JSON Structure:**
    {
      "verdict": "Likely AI-Generated" | "Likely Real" | "Inconclusive",
      "confidence": number (from 0.0 to 1.0),
      "summary": "A concise, one-sentence summary of your conclusion.",
      "full_report": "A detailed, well-structured report in Markdown format. Combine all evidence into a coherent narrative. Use headings (e.g., '### Detailed Reasoning', '### Visual Analysis', '### Web & Fact-Check Findings') to organize the report. Explain HOW you reached your conclusion and justify the confidence score by referencing specific pieces of evidence.",
      "methodology_note": "A brief note explaining the methodology. Describe that this analysis is a synthesis of multiple AI-driven checks: visual inspection, web fact-checking, linguistic analysis, and metadata inference. State that the verdict is a probabilistic conclusion based on the combined weight of evidence."
    }

    **Confidence Score Calculation:**
    Calculate the confidence score based on the **convergence and strength of the evidence**.
    - If multiple strong signals point to the same conclusion (e.g., clear visual artifacts AND web sources debunking the content), the confidence should be high (e.g., > 0.9).
    - If evidence is conflicting or weak (e.g., slightly odd visuals but no web sources), the confidence should be lower, and the verdict might be 'Inconclusive'.
    - Your reasoning for the score must be explained in the 'full_report'.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
            verdict: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            full_report: { type: Type.STRING },
            methodology_note: { type: Type.STRING },
        }
      }
    },
  });

  const resultText = response.text.trim();
  try {
    const parsedResult = JSON.parse(resultText);
    return { ...parsedResult, web_sources: webAnalysis.sources };
  } catch (e) {
    console.error("Failed to parse JSON from synthesis model:", resultText);
    throw new Error("The final analysis could not be processed. The model returned an unexpected format.");
  }
};


export const orchestrateAnalysis = async (
  url: string,
  description: string,
  imageFile: File | null,
  transcript: string,
  onProgress: (step: AnalysisStep) => void
): Promise<AnalysisResult> => {
  let visualAnalysisResult = "No image was provided for visual analysis.";
  if (imageFile) {
    onProgress({ message: 'Analyzing visual content...', status: 'pending' });
    try {
      visualAnalysisResult = await analyzeImage(imageFile);
      onProgress({ message: 'Visual content analyzed.', status: 'completed' });
    } catch (e) {
      onProgress({ message: 'Failed to analyze visual content.', status: 'error' });
      throw e;
    }
  }

  onProgress({ message: 'Fact-checking with Google Search...', status: 'pending' });
  let factCheckResult;
  try {
    factCheckResult = await factCheckWithSearch(description, url);
    onProgress({ message: 'Fact-checking complete.', status: 'completed' });
  } catch (e) {
    onProgress({ message: 'Failed to fact-check with Google Search.', status: 'error' });
    throw e;
  }
  
  onProgress({ message: 'Inferring metadata clues...', status: 'pending' });
  let metadataInferenceResult;
  try {
    metadataInferenceResult = await inferMetadata(description, imageFile, url);
    onProgress({ message: 'Metadata clues inferred.', status: 'completed' });
  } catch (e) {
    onProgress({ message: 'Failed to infer metadata.', status: 'error' });
    throw e;
  }

  let speechAnalysisResult = "No transcript was provided for speech analysis.";
  if (transcript && transcript.trim()) {
    onProgress({ message: 'Analyzing speech/transcript...', status: 'pending' });
    try {
      speechAnalysisResult = await analyzeTranscript(transcript);
      onProgress({ message: 'Speech/transcript analyzed.', status: 'completed' });
    } catch (e) {
      onProgress({ message: 'Failed to analyze speech/transcript.', status: 'error' });
      throw e;
    }
  }

  onProgress({ message: 'Synthesizing findings...', status: 'pending' });
  try {
    const finalResult = await synthesizeResults(url, description, visualAnalysisResult, factCheckResult, metadataInferenceResult, speechAnalysisResult);
    onProgress({ message: 'Synthesis complete.', status: 'completed' });
    return finalResult;
  } catch (e) {
    onProgress({ message: 'Failed to synthesize findings.', status: 'error' });
    throw e;
  }
};