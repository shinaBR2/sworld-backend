import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Task } from '../models/task';
import { createTask, updateTaskStatus, completeTask } from './tasks';
import { TaskStatus } from '../models/task';

// Mock the Task model
vi.mock('../models/task', () => ({
  Task: {
    findOrCreate: vi.fn(),
    update: vi.fn(),
  },
  TaskStatus: {
    PENDING: 'PENDING',
    COMPLETED: 'COMPLETED',
  },
}));

describe('Task Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTask', () => {
    it('should create a new task when it does not exist', async () => {
      const mockTask = {
        taskId: 'test-task-id',
        type: 'test-type',
        metadata: { key: 'value' },
        entityType: 'test-entity',
        entityId: 'test-entity-id',
      };

      const mockCreatedTask = {
        ...mockTask,
        status: TaskStatus.PENDING,
        completed: false,
      };

      // Mock findOrCreate to return the task
      (Task.findOrCreate as vi.Mock).mockResolvedValue([mockCreatedTask]);

      const result = await createTask(mockTask);

      expect(Task.findOrCreate).toHaveBeenCalledWith({
        where: {
          entityId: mockTask.entityId,
          entityType: mockTask.entityType,
        },
        defaults: {
          taskId: mockTask.taskId,
          type: mockTask.type,
          metadata: mockTask.metadata,
          status: TaskStatus.PENDING,
          completed: false,
        },
        transaction: undefined,
      });

      expect(result).toEqual(mockCreatedTask);
    });

    it('should create a task with a transaction', async () => {
      const mockTransaction = {} as any;
      const mockTask = {
        taskId: 'test-task-id',
        type: 'test-type',
        metadata: { key: 'value' },
        entityType: 'test-entity',
        entityId: 'test-entity-id',
        transaction: mockTransaction,
      };

      const mockCreatedTask = {
        ...mockTask,
        status: TaskStatus.PENDING,
        completed: false,
      };

      // Mock findOrCreate to return the task
      (Task.findOrCreate as vi.Mock).mockResolvedValue([mockCreatedTask]);

      const result = await createTask(mockTask);

      expect(Task.findOrCreate).toHaveBeenCalledWith({
        where: {
          entityId: mockTask.entityId,
          entityType: mockTask.entityType,
        },
        defaults: {
          taskId: mockTask.taskId,
          type: mockTask.type,
          metadata: mockTask.metadata,
          status: TaskStatus.PENDING,
          completed: false,
        },
        transaction: mockTransaction,
      });

      expect(result).toEqual(mockCreatedTask);
    });
  });

  describe('updateTaskStatus', () => {
    it('should update task status', async () => {
      const mockUpdate = { taskId: 'test-task-id', status: TaskStatus.COMPLETED };

      // Mock update to return update result
      (Task.update as vi.Mock).mockResolvedValue([1]); // Simulate one row updated

      const result = await updateTaskStatus(mockUpdate);

      expect(Task.update).toHaveBeenCalledWith(
        { status: mockUpdate.status },
        {
          where: { taskId: mockUpdate.taskId },
          transaction: undefined,
        }
      );

      expect(result).toEqual([1]);
    });

    it('should update task status with a transaction', async () => {
      const mockTransaction = {} as any;
      const mockUpdate = {
        taskId: 'test-task-id',
        status: TaskStatus.COMPLETED,
        transaction: mockTransaction,
      };

      // Mock update to return update result
      (Task.update as vi.Mock).mockResolvedValue([1]); // Simulate one row updated

      const result = await updateTaskStatus(mockUpdate);

      expect(Task.update).toHaveBeenCalledWith(
        { status: mockUpdate.status },
        {
          where: { taskId: mockUpdate.taskId },
          transaction: mockTransaction,
        }
      );

      expect(result).toEqual([1]);
    });
  });

  describe('completeTask', () => {
    it('should mark task as completed', async () => {
      const taskId = 'test-task-id';

      // Mock update to return update result
      (Task.update as vi.Mock).mockResolvedValue([1]); // Simulate one row updated

      const result = await completeTask(taskId);

      expect(Task.update).toHaveBeenCalledWith(
        {
          status: TaskStatus.COMPLETED,
          completed: true,
        },
        {
          where: { taskId },
          transaction: undefined,
        }
      );

      expect(result).toEqual([1]);
    });

    it('should mark task as completed with a transaction', async () => {
      const taskId = 'test-task-id';
      const mockTransaction = {} as any;

      // Mock update to return update result
      (Task.update as vi.Mock).mockResolvedValue([1]); // Simulate one row updated

      const result = await completeTask(taskId, mockTransaction);

      expect(Task.update).toHaveBeenCalledWith(
        {
          status: TaskStatus.COMPLETED,
          completed: true,
        },
        {
          where: { taskId },
          transaction: mockTransaction,
        }
      );

      expect(result).toEqual([1]);
    });
  });
});
