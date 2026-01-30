import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { ConversationState } from '@prisma/client';

const LOCK_TIMEOUT_MS = 30000; // 30 seconds
const STALE_LOCK_MS = 60000; // 60 seconds - lock considered stale

export interface LockResult {
  success: boolean;
  reason?: 'LOCKED_BY_OTHER' | 'NOT_FOUND' | 'STALE_LOCK';
  message?: string;
  expiresIn?: number;
}

@Injectable()
export class ConversationLockService {
  private readonly logger = new Logger(ConversationLockService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Attempt to acquire a lock on a conversation
   * Uses optimistic locking with version field
   */
  async acquireLock(
    conversationId: string,
    sessionId: string,
  ): Promise<LockResult> {
    const convo = await this.prisma.onboardingConversation.findUnique({
      where: { id: conversationId },
    });

    if (!convo) {
      return { success: false, reason: 'NOT_FOUND', message: 'Conversation not found' };
    }

    // Check if locked by another session
    if (convo.lockedBy && convo.lockedBy !== sessionId) {
      const lockAge = convo.lockedAt
        ? Date.now() - convo.lockedAt.getTime()
        : Infinity;

      // Allow takeover of stale locks
      if (lockAge < STALE_LOCK_MS) {
        return {
          success: false,
          reason: 'LOCKED_BY_OTHER',
          message: 'Conversation is being edited by another session',
          expiresIn: STALE_LOCK_MS - lockAge,
        };
      }

      this.logger.warn(`Taking over stale lock on conversation ${conversationId}`);
    }

    // Acquire lock with optimistic locking
    try {
      await this.prisma.onboardingConversation.update({
        where: {
          id: conversationId,
          version: convo.version, // Optimistic lock
        },
        data: {
          lockedBy: sessionId,
          lockedAt: new Date(),
          version: { increment: 1 },
          lastActivityAt: new Date(),
        },
      });

      return { success: true };
    } catch (error) {
      // Optimistic lock failed - someone else grabbed it
      this.logger.warn(`Lock acquisition failed for ${conversationId}`, { error });
      return {
        success: false,
        reason: 'LOCKED_BY_OTHER',
        message: 'Failed to acquire lock - conversation was modified',
      };
    }
  }

  /**
   * Release a lock on a conversation
   */
  async releaseLock(conversationId: string, sessionId: string): Promise<boolean> {
    const convo = await this.prisma.onboardingConversation.findUnique({
      where: { id: conversationId },
    });

    if (!convo || convo.lockedBy !== sessionId) {
      return false;
    }

    await this.prisma.onboardingConversation.update({
      where: { id: conversationId },
      data: {
        lockedBy: null,
        lockedAt: null,
        state: ConversationState.IDLE,
        lastActivityAt: new Date(),
      },
    });

    return true;
  }

  /**
   * Extend a lock (heartbeat)
   */
  async extendLock(conversationId: string, sessionId: string): Promise<boolean> {
    const convo = await this.prisma.onboardingConversation.findUnique({
      where: { id: conversationId },
    });

    if (!convo || convo.lockedBy !== sessionId) {
      return false;
    }

    await this.prisma.onboardingConversation.update({
      where: { id: conversationId },
      data: {
        lockedAt: new Date(),
        lastActivityAt: new Date(),
      },
    });

    return true;
  }

  /**
   * Force takeover of a conversation lock
   * Used when user explicitly chooses to take over
   */
  async forceTakeover(
    conversationId: string,
    sessionId: string,
  ): Promise<LockResult> {
    const convo = await this.prisma.onboardingConversation.findUnique({
      where: { id: conversationId },
    });

    if (!convo) {
      return { success: false, reason: 'NOT_FOUND', message: 'Conversation not found' };
    }

    await this.prisma.onboardingConversation.update({
      where: { id: conversationId },
      data: {
        lockedBy: sessionId,
        lockedAt: new Date(),
        version: { increment: 1 },
        state: ConversationState.IDLE,
        lastActivityAt: new Date(),
      },
    });

    this.logger.log(`Force takeover of conversation ${conversationId} by ${sessionId}`);
    return { success: true };
  }

  /**
   * Update conversation state
   */
  async updateState(
    conversationId: string,
    state: ConversationState,
    sessionId?: string,
  ): Promise<boolean> {
    const convo = await this.prisma.onboardingConversation.findUnique({
      where: { id: conversationId },
    });

    if (!convo) return false;

    // If sessionId provided, verify lock ownership
    if (sessionId && convo.lockedBy && convo.lockedBy !== sessionId) {
      return false;
    }

    await this.prisma.onboardingConversation.update({
      where: { id: conversationId },
      data: {
        state,
        lastActivityAt: new Date(),
      },
    });

    return true;
  }

  /**
   * Get lock status for a conversation
   */
  async getLockStatus(conversationId: string): Promise<{
    isLocked: boolean;
    lockedBy: string | null;
    lockedAt: Date | null;
    state: ConversationState;
  } | null> {
    const convo = await this.prisma.onboardingConversation.findUnique({
      where: { id: conversationId },
      select: {
        lockedBy: true,
        lockedAt: true,
        state: true,
      },
    });

    if (!convo) return null;

    return {
      isLocked: !!convo.lockedBy,
      lockedBy: convo.lockedBy,
      lockedAt: convo.lockedAt,
      state: convo.state,
    };
  }

  /**
   * Clean up stale locks (run periodically)
   */
  async cleanupStaleLocks(): Promise<number> {
    const staleThreshold = new Date(Date.now() - STALE_LOCK_MS);

    const result = await this.prisma.onboardingConversation.updateMany({
      where: {
        lockedAt: { lt: staleThreshold },
        lockedBy: { not: null },
      },
      data: {
        lockedBy: null,
        lockedAt: null,
        state: ConversationState.IDLE,
      },
    });

    if (result.count > 0) {
      this.logger.log(`Cleaned up ${result.count} stale conversation locks`);
    }

    return result.count;
  }
}
