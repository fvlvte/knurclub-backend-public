export class SecretsGuard {
  private readonly secrets: string[];
  private constructor() {
    this.secrets = [];
  }

  private static instance: SecretsGuard;

  public getSecrets(): string[] {
    return this.secrets;
  }

  public putSecret(s: string) {
    if (!this.secrets.includes(s)) {
      this.secrets.push(s);
    }
  }

  public static getInstance(): SecretsGuard {
    if (typeof this.instance === "undefined") {
      this.instance = new SecretsGuard();
    }
    return this.instance;
  }
}
