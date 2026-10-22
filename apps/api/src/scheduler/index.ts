export interface CronJob {
  cron: string;
  runOnStart?: boolean;
  handler: () => unknown | Promise<unknown>;
}

const registry: CronJob[] = [];

export default function scheduler(job: CronJob): CronJob {
  registry.push(job);
  return job;
}

export function registeredJobs(): readonly CronJob[] {
  return registry;
}
