export interface DevelopmentScripts {
  readonly serverScript: 'dev:server';
  readonly frontendScript: 'dev:frontend' | 'dev:frontend:lan';
}

export declare function getDevelopmentScripts(arguments_: string[]): DevelopmentScripts;
