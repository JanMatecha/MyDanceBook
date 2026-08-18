export interface DatabaseHealth {
  readonly status: 'ok';
  readonly migrationVersion: number;
}

export interface HealthStatusReader {
  readDatabaseHealth(): DatabaseHealth;
}

export interface HealthResult {
  readonly status: 'ok';
  readonly application: 'MyDanceBook';
  readonly database: DatabaseHealth;
  readonly timestamp: string;
}

export class GetHealthQuery {
  public constructor(
    private readonly reader: HealthStatusReader,
    private readonly now: () => Date = () => new Date(),
  ) {}

  public execute(): HealthResult {
    return {
      status: 'ok',
      application: 'MyDanceBook',
      database: this.reader.readDatabaseHealth(),
      timestamp: this.now().toISOString(),
    };
  }
}
