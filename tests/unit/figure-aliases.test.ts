import { describe, expect, it } from 'vitest';

import {
  InvalidFigureAliasError,
  InvalidFigureIdentifierError,
  requireFigureIdentifier,
  toFigureAliases,
  toFigureNames,
} from '../../src/domain/figure.js';

describe('Figure aliases', () => {
  it('normalizes aliases and permits every valid identifier combination', () => {
    expect(toFigureAliases(['  Trojkrok  '])).toEqual(['Trojkrok']);
    expect(() =>
      requireFigureIdentifier(toFigureNames({ nameCs: 'Český', nameEn: null }), []),
    ).not.toThrow();
    expect(() =>
      requireFigureIdentifier(toFigureNames({ nameCs: null, nameEn: 'English' }), []),
    ).not.toThrow();
    expect(() =>
      requireFigureIdentifier(toFigureNames({ nameCs: 'Český', nameEn: 'English' }), []),
    ).not.toThrow();
    expect(() =>
      requireFigureIdentifier(toFigureNames({ nameCs: null, nameEn: null }), ['Trojkrok']),
    ).not.toThrow();
    expect(() =>
      requireFigureIdentifier(toFigureNames({ nameCs: 'Český', nameEn: null }), ['Trojkrok']),
    ).not.toThrow();
  });

  it('rejects missing, blank, overlong and duplicate aliases', () => {
    expect(() =>
      requireFigureIdentifier(toFigureNames({ nameCs: null, nameEn: null }), []),
    ).toThrow(InvalidFigureIdentifierError);
    expect(() => toFigureAliases([' '])).toThrow(InvalidFigureAliasError);
    expect(() => toFigureAliases(['x'.repeat(201)])).toThrow(InvalidFigureAliasError);
    expect(() => toFigureAliases(['Trojkrok', 'trojkrok'])).toThrow(InvalidFigureAliasError);
  });
});
