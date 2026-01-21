
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeQuoteData } from './geminiService';
import { QuoteItem } from '../types';
import { GoogleGenAI } from '@google/genai';

// Mock the entire @google/genai module
vi.mock('@google/genai', () => {
  const mockGenerateContent = vi.fn();
  const mockGoogleGenAI = vi.fn(() => ({
    models: {
      generateContent: mockGenerateContent,
    },
  }));
  return {
    GoogleGenAI: mockGoogleGenAI,
    Type: {}, // Mock other exports if needed
  };
});

describe('geminiService', () => {
  let mockGenerateContent: any;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    // This is a bit of a workaround to get the typed mock instance
    const ai = new GoogleGenAI({apiKey: 'test'});
    mockGenerateContent = ai.models.generateContent;
  });

  it('should call Gemini API and return analysis text on success', async () => {
    const mockItems: QuoteItem[] = [
      { qty: 1, partNo: '123-4567', desc: 'GASKET', weight: 1, unitPrice: 100 },
    ];
    const mockResponseText = 'This is a mocked AI analysis of the gasket.';
    
    mockGenerateContent.mockResolvedValue({
      text: mockResponseText,
    });

    const result = await analyzeQuoteData(mockItems);

    // Check if the constructor was called
    expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: process.env.API_KEY });
    
    // Check if generateContent was called with the correct parameters
    expect(mockGenerateContent).toHaveBeenCalledOnce();
    const callArgs = mockGenerateContent.mock.calls[0][0];
    expect(callArgs.model).toBe('gemini-3-pro-preview');
    expect(callArgs.contents).toContain('Line 01: 1x 123-4567 (GASKET)');
    
    // Check if the result is correct
    expect(result).toBe(mockResponseText);
  });

  it('should return a fallback message on API error', async () => {
    const mockItems: QuoteItem[] = [
      { qty: 1, partNo: '123-4567', desc: 'GASKET', weight: 1, unitPrice: 100 },
    ];
    
    // Simulate an API error
    mockGenerateContent.mockRejectedValue(new Error('API Failure'));

    const result = await analyzeQuoteData(mockItems);

    expect(result).toBe('The engineering hub is currently offline.');
  });
});
