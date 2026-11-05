import type { ZodType, output } from 'zod/v4';
import { MetrikaError, isRecord, parseApiResponse } from '../../core/errors.js';
import type { SerialExecutor } from '../../core/serial-executor.js';
import type { ApiGateway, ApiRequest } from '../api/gateway.js';
import { counterResponseSchema, goalsResponseSchema, goalResponseSchema, deleteGoalResponseSchema,
  ensureGoalSchema, deleteGoalSchema, updateGoalSchema } from './schemas.js';
import type { Goal, EnsureGoalInput, DeleteGoalInput, UpdateGoalInput } from './schemas.js';

const isEventCondition = (value: unknown): value is { type: string; url: string } =>
  isRecord(value) && typeof value.type === 'string' && typeof value.url === 'string';

export class ManagementService {
  constructor(private readonly api: ApiGateway, private readonly writes: SerialExecutor, readonly counterId: number) {}

  async #request<S extends ZodType>(operationId: string, schema: S, input: Omit<ApiRequest, 'operationId'> = {}): Promise<output<S>> {
    return parseApiResponse(schema, await this.api.execute({ operationId, ...input }));
  }
  async getCounter() {
    const { counter } = await this.#request('management_counter_counter', counterResponseSchema);
    if (counter.id !== this.counterId) throw new MetrikaError('Ответ ЯМ содержит другой счётчик.');
    return counter;
  }
  async listGoals() {
    return (await this.#request('management_goal_goals', goalsResponseSchema)).goals;
  }

  #findEvent(goals: Goal[], event: string) {
    return goals.filter(
      (goal) =>
        goal.type === 'action' &&
        goal.conditions?.some(
          (condition) => isEventCondition(condition) && condition.type === 'exact' && condition.url === event
        )
    );
  }

  ensureEventGoal(input: EnsureGoalInput) {
    const { event, name } = ensureGoalSchema.parse(input);
    return this.writes.run(async () => {
      const goals = await this.listGoals();
      const matches = this.#findEvent(goals, event);
      if (matches.length > 1) {
        throw new MetrikaError(
          'Событие уже используется несколькими целями. Уточните цель по goalId.'
        );
      }
      if (matches.length === 1) {
        return { created: false, goal: matches[0]! };
      }
      if (goals.some((goal) => goal.name === name)) {
        throw new MetrikaError(
          'Цель с таким названием уже есть, но её условие отличается. Используйте другое название или update_goal.'
        );
      }
      const { goal } = await this.#request('management_goal_addGoal', goalResponseSchema, {
        body: { goal: {
          name,
          type: 'action',
          conditions: [{ type: 'exact', url: event }],
        } },
      });
      return { created: true, goal };
    });
  }

  deleteGoal(input: DeleteGoalInput) {
    const { goalId, event } = deleteGoalSchema.parse(input);
    return this.writes.run(async () => {
      const { goal } = await this.#request('management_goal_goal', goalResponseSchema, { path: { goalId } });
      if (
        goal.id !== goalId ||
        goal.type !== 'action' ||
        goal.goal_source === 'auto' ||
        goal.conditions?.length !== 1 ||
        !isEventCondition(goal.conditions[0]) ||
        goal.conditions[0].type !== 'exact' ||
        goal.conditions[0]?.url !== event
      ) {
        throw new MetrikaError('Цель не соответствует указанному точному JS-событию. Удаление отменено.');
      }
      await this.#request('management_goal_deleteGoal', deleteGoalResponseSchema, { path: { goalId } });
      return { deleted: true, goalId, event };
    });
  }

  updateGoal(input: UpdateGoalInput) {
    const { goalId, name, event, defaultPrice, isFavorite } =
      updateGoalSchema.parse(input);
    return this.writes.run(async () => {
      const { goal: current } = await this.#request(
        'management_goal_goal',
        goalResponseSchema, { path: { goalId } }
      );
      if (current.type !== 'action' || current.goal_source === 'auto') {
        throw new MetrikaError(
          'Редактируются только пользовательские JavaScript-цели.'
        );
      }
      if (
        !current.conditions?.length ||
        current.conditions.some(
          (condition) =>
            !isEventCondition(condition) || !['exact', 'contain', 'start', 'regexp'].includes(condition.type)
        )
      ) {
        throw new MetrikaError('У цели нет условий. Изменение отменено.');
      }
      const others = (await this.listGoals()).filter(
        (goal) => goal.id !== goalId
      );
      if (event && this.#findEvent(others, event).length) {
        throw new MetrikaError('Это событие уже используется другой целью.');
      }
      if (name && others.some((goal) => goal.name === name)) {
        throw new MetrikaError('Другая цель уже использует это название.');
      }
      const goal: Record<string, unknown> = {
        id: goalId,
        name: name ?? current.name,
        type: 'action',
        conditions: event
          ? [{ type: 'exact', url: event }]
          : current.conditions,
      };
      if (defaultPrice !== undefined || current.default_price !== undefined) {
        goal.default_price = defaultPrice ?? current.default_price;
      }
      if (isFavorite !== undefined || current.is_favorite !== undefined) {
        goal.is_favorite = Number(isFavorite ?? current.is_favorite);
      }
      return this.#request('management_goal_editGoal', goalResponseSchema, {
        path: { goalId },
        body: { goal },
      });
    });
  }
}
