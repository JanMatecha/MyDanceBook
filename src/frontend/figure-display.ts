export type FigureNameLanguage = 'cs' | 'en';

export interface FigureNames {
  readonly nameCs: string | null;
  readonly nameEn: string | null;
}

export function displayFigureName(figure: FigureNames, language: FigureNameLanguage): string {
  return displayFigureNames(figure, language).primary;
}

export interface DisplayFigureNames {
  readonly primary: string;
  readonly secondary: string | null;
}

export function displayFigureNames(
  figure: FigureNames,
  language: FigureNameLanguage,
): DisplayFigureNames {
  const primary =
    language === 'cs'
      ? (figure.nameCs ?? figure.nameEn ?? 'Neznámá figura')
      : (figure.nameEn ?? figure.nameCs ?? 'Neznámá figura');
  const secondary = language === 'cs' ? figure.nameEn : figure.nameCs;
  return { primary, secondary: secondary === primary ? null : secondary };
}

export function isImplicitDefaultVariant(name: string | null): boolean {
  return name === 'Výchozí varianta';
}
