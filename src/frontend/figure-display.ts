export type FigureNameLanguage = 'cs' | 'en';

export interface FigureNames {
  readonly nameCs: string | null;
  readonly nameEn: string | null;
  readonly aliases?: readonly { readonly value: string }[] | undefined;
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
      ? (figure.nameCs ?? figure.nameEn ?? figure.aliases?.[0]?.value ?? 'Neznámá figura')
      : (figure.nameEn ?? figure.nameCs ?? figure.aliases?.[0]?.value ?? 'Neznámá figura');
  const secondary = language === 'cs' ? figure.nameEn : figure.nameCs;
  return { primary, secondary: secondary === primary ? null : secondary };
}

export function matchesFigureFilter(figure: FigureNames, query: string): boolean {
  const normalized = query.trim().toLocaleLowerCase();
  return (
    !normalized ||
    [figure.nameCs, figure.nameEn, ...(figure.aliases?.map((alias) => alias.value) ?? [])].some(
      (value) => value?.toLocaleLowerCase().includes(normalized),
    )
  );
}

export function isImplicitDefaultVariant(name: string | null): boolean {
  return name === 'Výchozí varianta';
}
