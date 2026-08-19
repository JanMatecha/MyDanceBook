export interface NpmScriptCommandOptions {
  readonly script: string;
  readonly platform: NodeJS.Platform;
  readonly comSpec?: string | undefined;
}

export interface NpmScriptCommand {
  readonly executable: string;
  readonly args: readonly string[];
}

export declare function createNpmScriptCommand(options: NpmScriptCommandOptions): NpmScriptCommand;
