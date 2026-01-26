import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventType, BaseEventPayload } from './events.types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  emit<T extends BaseEventPayload>(
    event: EventType,
    payload: Omit<T, 'timestamp' | 'correlationId'> & { correlationId?: string },
  ): void {
    const fullPayload: T = {
      ...payload,
      timestamp: new Date(),
      correlationId: payload.correlationId || uuidv4(),
    } as T;

    this.logger.debug(
      `Emitting event: ${event} [${fullPayload.correlationId}]`,
    );

    this.eventEmitter.emit(event, fullPayload);
  }

  emitAsync<T extends BaseEventPayload>(
    event: EventType,
    payload: Omit<T, 'timestamp' | 'correlationId'> & { correlationId?: string },
  ): Promise<boolean[]> {
    const fullPayload: T = {
      ...payload,
      timestamp: new Date(),
      correlationId: payload.correlationId || uuidv4(),
    } as T;

    this.logger.debug(
      `Emitting async event: ${event} [${fullPayload.correlationId}]`,
    );

    return this.eventEmitter.emitAsync(event, fullPayload);
  }
}
