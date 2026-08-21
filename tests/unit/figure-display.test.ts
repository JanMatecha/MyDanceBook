import { describe, expect, it } from 'vitest';

import {
  displayFigureName,
  displayFigureNames,
  matchesFigureFilter,
} from '../../src/frontend/figure-display.js';

describe('Figure display names', () => {
  it('prefers Czech with English fallback', () => {
    expect(displayFigureName({ nameCs: 'Otočka vpravo', nameEn: 'Natural Turn' }, 'cs')).toBe(
      'Otočka vpravo',
    );
    expect(displayFigureName({ nameCs: null, nameEn: 'Natural Turn' }, 'cs')).toBe('Natural Turn');
  });

  it('falls back to an alias and filters every identifier case-insensitively', () => {
    const figure = {
      nameCs: 'Otáčka vpravo',
      nameEn: 'Natural Turn',
      aliases: [{ value: 'Trojkrok' }],
    };
    expect(
      displayFigureName({ nameCs: null, nameEn: null, aliases: [{ value: 'Trojkrok' }] }, 'cs'),
    ).toBe('Trojkrok');
    expect(matchesFigureFilter(figure, 'OTÁČKA')).toBe(true);
    expect(matchesFigureFilter(figure, 'natural')).toBe(true);
    expect(matchesFigureFilter(figure, 'TROJKROK')).toBe(true);
    expect(matchesFigureFilter(figure, 'whisk')).toBe(false);
  });

  it('prefers English with Czech fallback', () => {
    expect(displayFigureName({ nameCs: 'Otočka vpravo', nameEn: 'Natural Turn' }, 'en')).toBe(
      'Natural Turn',
    );
    expect(displayFigureName({ nameCs: 'Otočka vpravo', nameEn: null }, 'en')).toBe(
      'Otočka vpravo',
    );
  });

  it('returns the other distinct translation as a secondary display line', () => {
    expect(displayFigureNames({ nameCs: 'Zášvih vzad', nameEn: 'Back Whisk' }, 'cs')).toEqual({
      primary: 'Zášvih vzad',
      secondary: 'Back Whisk',
    });
    expect(displayFigureNames({ nameCs: 'Zášvih vzad', nameEn: 'Back Whisk' }, 'en')).toEqual({
      primary: 'Back Whisk',
      secondary: 'Zášvih vzad',
    });
    expect(displayFigureNames({ nameCs: 'Same', nameEn: 'Same' }, 'en')).toEqual({
      primary: 'Same',
      secondary: null,
    });
  });
});
