import { IsString, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';

export class ChatMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message: string;

  @IsString()
  @IsOptional()
  conversationId?: string;
}

export class ChatResponseDto {
  message: string;
  conversationId: string;
  toolsUsed: string[];
  data?: Record<string, unknown>;
}

export class ConversationDto {
  id: string;
  tenantId: string;
  userId: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'tool';
    content: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export class WeeklyReportDto {
  id: string;
  tenantId: string;
  weekStart: Date;
  report: {
    keyMetrics: {
      revenue: number;
      revenueChange?: number;
      jobsCompleted: number;
      appointmentCompletionRate: number;
      quoteConversionRate: number;
      npsScore: number;
    };
    topWins: string[];
    areasNeedingAttention: string[];
    actionItems: string[];
    forecast: string;
  };
  sent: boolean;
  sentAt?: Date;
  createdAt: Date;
}
