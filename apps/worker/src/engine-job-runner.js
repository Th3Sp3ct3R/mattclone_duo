import { EngineJobRun } from '@julio/api/models/engine-job-run';
import { logger } from '@julio/api/logger';

const WORKER_ID = `${process.pid}:${Date.now()}`;

function serializeError(error) {
  return {
    code: error?.code || 'JOB_FAILED',
    message: error?.message || 'Job failed',
    stack: error?.stack || ''
  };
}

function nextRetryDate(attempts) {
  const delayMs = Math.min(15 * 60 * 1000, 30_000 * 2 ** Math.max(attempts - 1, 0));
  return new Date(Date.now() + delayMs);
}

export async function runEngineJob(payload, handler) {
  const jobRun = await EngineJobRun.findById(payload?.jobRunId);
  if (!jobRun) throw new Error('JobRun not found');
  if (['succeeded', 'cancelled'].includes(jobRun.status)) return jobRun;

  jobRun.status = 'running';
  jobRun.attempts += 1;
  jobRun.startedAt = new Date();
  jobRun.workerId = WORKER_ID;
  await jobRun.save();

  try {
    const result = await handler(payload, jobRun);
    jobRun.status = 'succeeded';
    jobRun.completedAt = new Date();
    jobRun.result = result || {};
    jobRun.lastError = {};
    await jobRun.save();
    return result;
  } catch (error) {
    const attempts = jobRun.attempts;
    const exhausted = attempts >= jobRun.maxAttempts;
    jobRun.status = exhausted ? 'failed' : 'queued';
    jobRun.nextRetryAt = exhausted ? null : nextRetryDate(attempts);
    jobRun.lastError = serializeError(error);
    await jobRun.save();
    logger.error(`[engine-worker] ${jobRun.jobName} failed`, error);
    throw error;
  }
}
