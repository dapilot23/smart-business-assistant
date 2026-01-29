import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export interface SegmentCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in' | 'notIn';
  value: unknown;
}

export interface SegmentRules {
  conditions: SegmentCondition[];
  logic: 'AND' | 'OR';
}

@Injectable()
export class SegmentRulesEngine {
  private readonly supportedFields = new Map<string, { table: string; column: string }>([
    ['healthScore', { table: 'customer', column: 'healthScore' }],
    ['churnRisk', { table: 'customer', column: 'churnRisk' }],
    ['lifecycleStage', { table: 'customer', column: 'lifecycleStage' }],
    ['noShowCount', { table: 'customer', column: 'noShowCount' }],
    ['totalSpent', { table: 'context', column: 'totalSpent' }],
    ['totalVisits', { table: 'context', column: 'totalVisits' }],
    ['daysSinceLastVisit', { table: 'computed', column: 'daysSinceLastVisit' }],
  ]);

  buildWhereClause(rules: SegmentRules): Prisma.CustomerWhereInput {
    const conditions = rules.conditions.map((c) => this.buildCondition(c));

    if (rules.logic === 'OR') {
      return { OR: conditions };
    }
    return { AND: conditions };
  }

  private buildCondition(condition: SegmentCondition): Prisma.CustomerWhereInput {
    const fieldInfo = this.supportedFields.get(condition.field);

    if (!fieldInfo) {
      throw new Error(`Unsupported field: ${condition.field}`);
    }

    // Handle computed fields
    if (fieldInfo.table === 'computed') {
      return this.buildComputedCondition(condition);
    }

    // Handle context fields (nested relation)
    if (fieldInfo.table === 'context') {
      return this.buildContextCondition(condition, fieldInfo.column);
    }

    // Handle direct customer fields
    return this.buildDirectCondition(condition, fieldInfo.column);
  }

  private buildDirectCondition(
    condition: SegmentCondition,
    column: string,
  ): Prisma.CustomerWhereInput {
    const { operator, value } = condition;

    switch (operator) {
      case 'eq':
        return { [column]: value };
      case 'ne':
        return { [column]: { not: value } };
      case 'gt':
        return { [column]: { gt: value } };
      case 'gte':
        return { [column]: { gte: value } };
      case 'lt':
        return { [column]: { lt: value } };
      case 'lte':
        return { [column]: { lte: value } };
      case 'contains':
        return { [column]: { contains: value as string, mode: 'insensitive' } };
      case 'in':
        return { [column]: { in: value as unknown[] } };
      case 'notIn':
        return { [column]: { notIn: value as unknown[] } };
      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
  }

  private buildContextCondition(
    condition: SegmentCondition,
    column: string,
  ): Prisma.CustomerWhereInput {
    const { operator, value } = condition;

    const contextCondition: Prisma.CustomerContextWhereInput = {};

    switch (operator) {
      case 'eq':
        contextCondition[column] = value;
        break;
      case 'ne':
        contextCondition[column] = { not: value };
        break;
      case 'gt':
        contextCondition[column] = { gt: value };
        break;
      case 'gte':
        contextCondition[column] = { gte: value };
        break;
      case 'lt':
        contextCondition[column] = { lt: value };
        break;
      case 'lte':
        contextCondition[column] = { lte: value };
        break;
      default:
        throw new Error(`Unsupported operator for context field: ${operator}`);
    }

    return { context: contextCondition };
  }

  private buildComputedCondition(condition: SegmentCondition): Prisma.CustomerWhereInput {
    if (condition.field === 'daysSinceLastVisit') {
      const days = condition.value as number;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      switch (condition.operator) {
        case 'gt':
          return { context: { lastInteraction: { lt: cutoffDate } } };
        case 'gte':
          return { context: { lastInteraction: { lte: cutoffDate } } };
        case 'lt':
          return { context: { lastInteraction: { gt: cutoffDate } } };
        case 'lte':
          return { context: { lastInteraction: { gte: cutoffDate } } };
        default:
          throw new Error(`Unsupported operator for daysSinceLastVisit: ${condition.operator}`);
      }
    }

    throw new Error(`Unknown computed field: ${condition.field}`);
  }

  validateRules(rules: unknown): rules is SegmentRules {
    if (!rules || typeof rules !== 'object') return false;

    const r = rules as SegmentRules;
    if (!Array.isArray(r.conditions)) return false;
    if (r.logic !== 'AND' && r.logic !== 'OR') return false;

    return r.conditions.every((c) => this.validateCondition(c));
  }

  private validateCondition(condition: unknown): condition is SegmentCondition {
    if (!condition || typeof condition !== 'object') return false;

    const c = condition as SegmentCondition;
    if (typeof c.field !== 'string') return false;
    if (!this.supportedFields.has(c.field)) return false;
    if (!['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'in', 'notIn'].includes(c.operator)) {
      return false;
    }
    if (c.value === undefined) return false;

    return true;
  }

  getSupportedFields(): string[] {
    return Array.from(this.supportedFields.keys());
  }
}
