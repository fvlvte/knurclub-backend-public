import { DBDriver } from "../DBDriver";

export interface Migration {
  up(driver: DBDriver): Promise<void>;
  down(driver: DBDriver): Promise<void>;

  getTimestamp(): number;
  getName(): string;
  getDescription(): string;
}
