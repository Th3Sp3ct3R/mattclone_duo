import { EngineJobRun } from '@julio/api/models/engine-job-run';
import { logger } from '@julio/api/logger';
import { dispatchEngineJob } from '@julio/api/services/job-dispatch';

import { emitDeviceEvent, resolvePayloadDeviceId } from './device-event-emitter.js';

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

function resolveContinuation(payload = {}) {
  return payload?.payload?.continuation || payload?.continuation || null;
}

async function dispatchContinuation(payload, result) {
  if (result?.success === false) return null;
  const continuation = resolveContinuation(payload);
  if (!continuation?.queueName || !continuation?.jobName) return null;
  return dispatchEngineJob(continuation);
}

export async function runEngineJob(payload, handler) {
  const jobRun = await EngineJobRun.findById(payload?.jobRunId);
  if (!jobRun) throw new Error('JobRun not found');
  if (['succeeded', 'cancelled'].includes(jobRun.status)) return jobRun;
  const deviceId = resolvePayloadDeviceId(payload);

  jobRun.status = 'running';
  jobRun.attempts += 1;
  jobRun.startedAt = new Date();
  jobRun.workerId = WORKER_ID;
  await jobRun.save();
  await emitDeviceEvent({
    deviceId,
    source: payload.targetType || 'system',
    jobRunId: jobRun._id,
    jobName: jobRun.jobName,
    message: `${jobRun.jobName} started`,
    data: { queueName: jobRun.queueName, targetType: jobRun.targetType, targetId: String(jobRun.targetId || '') }
  });

  try {
    const result = await handler(payload, jobRun);
    jobRun.status = 'succeeded';
    jobRun.completedAt = new Date();
    jobRun.result = result || {};
    jobRun.lastError = {};
    await jobRun.save();
    await emitDeviceEvent({
      deviceId,
      source: payload.targetType || 'system',
      jobRunId: jobRun._id,
      jobName: jobRun.jobName,
      message: `${jobRun.jobName} succeeded`,
      data: { queueName: jobRun.queueName, resultStatus: result?.status || '' }
    });
    await dispatchContinuation(payload, result);
    return result;
  } catch (error) {
    const attempts = jobRun.attempts;
    const exhausted = attempts >= jobRun.maxAttempts;
    jobRun.status = exhausted ? 'failed' : 'queued';
    jobRun.nextRetryAt = exhausted ? null : nextRetryDate(attempts);
    jobRun.lastError = serializeError(error);
    await jobRun.save();
    await emitDeviceEvent({
      deviceId,
      level: 'error',
      source: payload.targetType || 'system',
      jobRunId: jobRun._id,
      jobName: jobRun.jobName,
      message: `${jobRun.jobName} failed`,
      data: { queueName: jobRun.queueName, error: serializeError(error) }
    });
    logger.error(`[engine-worker] ${jobRun.jobName} failed`, error);
    throw error;
  }
}
