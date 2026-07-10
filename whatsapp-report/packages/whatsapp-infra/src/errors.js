import { domainError } from '@julio/whatsapp';
export const conflictError = (message) => domainError('CONFLICT', message);
export const notFoundError = (message) => domainError('NOT_FOUND', message);
