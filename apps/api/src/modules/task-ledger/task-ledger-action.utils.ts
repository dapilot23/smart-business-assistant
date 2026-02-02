import { TaskActionEventPayload } from '../../config/events/events.types';

export function getPayloadObject(
  payload: TaskActionEventPayload,
): Record<string, unknown> {
  if (!payload.payload || typeof payload.payload !== 'object') {
    return {};
  }
  return payload.payload as Record<string, unknown>;
}

export function getPayloadValue(
  payload: TaskActionEventPayload,
  key: string,
): unknown {
  const data = getPayloadObject(payload);
  return data[key];
}

export function getPayloadNumber(
  payload: TaskActionEventPayload,
  key: string,
  fallback: number,
): number {
  const data = getPayloadObject(payload);
  const value = data[key];
  return typeof value === 'number' && value > 0 ? value : fallback;
}

export function getPayloadString(
  payload: TaskActionEventPayload,
  key: string,
): string | undefined {
  const data = getPayloadObject(payload);
  const value = data[key];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function getIdArray(payload: TaskActionEventPayload, key: string): string[] {
  const data = getPayloadObject(payload);
  const value = data[key];
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((id) => typeof id === 'string');
  if (typeof value === 'string') return [value];
  return [];
}

export function getJobIds(payload: TaskActionEventPayload): string[] {
  const ids = getIdArray(payload, 'jobIds');
  if (payload.jobId) ids.unshift(payload.jobId);
  return Array.from(new Set(ids.filter(Boolean)));
}

export function getAppointmentIds(payload: TaskActionEventPayload): string[] {
  const ids = getIdArray(payload, 'appointmentIds');
  if (payload.appointmentId) ids.unshift(payload.appointmentId);
  if (payload.entityId) ids.unshift(payload.entityId);
  return Array.from(new Set(ids.filter(Boolean)));
}

export function getCustomerIds(payload: TaskActionEventPayload): string[] {
  const ids = getIdArray(payload, 'customerIds');
  if (payload.customerId) ids.unshift(payload.customerId);
  if (payload.entityId) ids.unshift(payload.entityId);
  return Array.from(new Set(ids.filter(Boolean)));
}

export function getCampaignIds(payload: TaskActionEventPayload): string[] {
  const ids = getIdArray(payload, 'campaignIds');
  if (payload.campaignId) ids.unshift(payload.campaignId);
  if (payload.entityId) ids.unshift(payload.entityId);
  return Array.from(new Set(ids.filter(Boolean)));
}
