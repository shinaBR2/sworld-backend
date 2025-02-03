import { Task, TaskStatus } from '../models/task';
import { Transaction } from 'sequelize';

interface CreateTaskParams {
  taskId: string;
  type: string;
  metadata: Record<string, unknown>;
  entityType: string;
  entityId: string;
  transaction?: Transaction;
}

export const createTask = async ({ taskId, type, metadata, entityType, entityId, transaction }: CreateTaskParams) => {
  const [task] = await Task.findOrCreate({
    where: { entityId, entityType },
    defaults: {
      taskId,
      type,
      metadata,
      status: TaskStatus.PENDING,
      completed: false,
    },
    transaction,
  });

  return task;
};

export const updateTaskStatus = async (taskId: string, status: TaskStatus, transaction?: Transaction) => {
  return await Task.update(
    { status },
    {
      where: { taskId },
      transaction,
    }
  );
};

export const completeTask = async (taskId: string, transaction?: Transaction) => {
  return await Task.update(
    {
      status: TaskStatus.COMPLETED,
      completed: true,
    },
    {
      where: { taskId },
      transaction,
    }
  );
};

export const getTaskByEntityId = async (entityId: string, entityType: string) => {
  return await Task.findOne({
    where: { entityId, entityType },
  });
};
