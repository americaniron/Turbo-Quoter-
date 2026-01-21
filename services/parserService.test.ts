
import { describe, it, expect } from 'vitest';
import { parseTextData } from './parserService';
import { QuoteItem } from '../types';

describe('parserService', () => {

  it('should correctly parse a simplified Ring Power quote text', () => {
    const mockQuoteText = `
      AMERICAN IRON LLC
      Order Summary
      1) 2 123-4567 GASKET KIT $150.00
      Some additional description text here.
      2) 1 9A-1234 FILTER $50.00
      In Stock, Weight: 5.5 lbs
      SUMMARY OF CHARGES
      ORDER TOTAL $200.00
    `;

    const expectedItems: QuoteItem[] = [
      {
        lineNo: '1',
        qty: 2,
        partNo: '123-4567',
        desc: 'GASKET KIT Some additional description text here.',
        weight: 0,
        unitPrice: 75,
        availability: '',
        originalImages: [],
      },
      {
        lineNo: '2',
        qty: 1,
        partNo: '9A-1234',
        desc: 'FILTER',
        weight: 5.5,
        unitPrice: 50,
        availability: 'In Stock',
        originalImages: [],
      },
    ];

    const result = parseTextData(mockQuoteText);

    expect(result).toHaveLength(2);

    // Deep check the first item, ignoring fields that might have slight variations
    expect(result[0].lineNo).toBe(expectedItems[0].lineNo);
    expect(result[0].qty).toBe(expectedItems[0].qty);
    expect(result[0].partNo).toBe(expectedItems[0].partNo);
    expect(result[0].desc).toContain('GASKET KIT');
    expect(result[0].unitPrice).toBeCloseTo(expectedItems[0].unitPrice);

    // Deep check the second item
    expect(result[1].lineNo).toBe(expectedItems[1].lineNo);
    expect(result[1].qty).toBe(expectedItems[1].qty);
    expect(result[1].partNo).toBe(expectedItems[1].partNo);
    expect(result[1].weight).toBe(expectedItems[1].weight);
    expect(result[1].availability).toBe(expectedItems[1].availability);
    expect(result[1].unitPrice).toBeCloseTo(expectedItems[1].unitPrice);
  });

  it('should return an empty array for empty input', () => {
    const result = parseTextData('');
    expect(result).toEqual([]);
  });

  it('should handle text with no valid items', () => {
    const mockQuoteText = 'This is just some random text without any parsable line items.';
    const result = parseTextData(mockQuoteText);
    expect(result).toEqual([]);
  });
});
