import { writeFileSync, existsSync, readFileSync } from "fs";

export class TimerController {
  private id: string;
  private secondsRemaining: number;
  private constructor(id: string) {
    this.id = id;
    this.secondsRemaining = 20 * 60;

    try {
      if (existsSync(`./cache/timer_${id}.txt`)) {
        this.secondsRemaining = parseInt(
          readFileSync(`./cache/timer_${id}.txt`, "utf8"),
        );
      }
    } catch (_e) {}
  }

  private static instances: { [id: string]: TimerController } = {};

  public incrementTimer(seconds: number) {
    this.secondsRemaining += seconds;
  }

  public timerTick() {
    if (this.secondsRemaining === 0) return 0;
    --this.secondsRemaining;
    writeFileSync(
      `./cache/timer_${this.id}.txt`,
      this.secondsRemaining.toString(),
    );

    return this.secondsRemaining;
  }

  public static getInstance(id?: string): TimerController {
    if (!this.instances[id ?? "default"]) {
      this.instances[id ?? "default"] = new TimerController(id ?? "default");
    }
    return this.instances[id ?? "default"];
  }
}
