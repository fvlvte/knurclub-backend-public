export type CronJob = () => unknown;

export class CronJobManager {
  private cronJobTable: Map<
    string,
    { interval: NodeJS.Timeout; job: () => Promise<unknown> }
  > = new Map<
    string,
    { interval: NodeJS.Timeout; job: () => Promise<unknown> }
  >();

  public registerCronJob(
    name: string,
    interval: number,
    triggerCondition: () => Promise<boolean>,
    job: () => Promise<unknown>,
  ): void {
    const _job = async () => {
      if (await triggerCondition()) {
        await job();
      }
    };
    this.cronJobTable.set(name, {
      job: _job,
      interval: setInterval(_job, interval),
    });
  }

  public unregisterCronJob(name: string): void {
    const job = this.cronJobTable.get(name);
    if (job) {
      clearInterval(job.interval);
      this.cronJobTable.delete(name);
    }
  }
}
