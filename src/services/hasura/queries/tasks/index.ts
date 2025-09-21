import { hasuraClient } from '../../client';
import { graphql } from '../../generated-graphql';
import type {
  CreateTaskMutation,
  CreateTaskMutationVariables,
  Tasks_Insert_Input,
  UpdateTaskStatusMutation,
  UpdateTaskStatusMutationVariables,
} from '../../generated-graphql/graphql';

const CREATE_TASK = graphql(/* GraphQL */ `
  mutation createTask($object: tasks_insert_input!) {
    insert_tasks_one(
      object: $object,
      on_conflict: {
        constraint: tasks_task_id_key
        update_columns: []
      }
    ) {
      id
    }
  }
`);

const UPDATE_TASK_STATUS = graphql(/* GraphQL */ `
  mutation updateTaskStatus($taskId: uuid!, $status: String!) {
    update_tasks(
      where: { task_id: { _eq: $taskId } }
      _set: { status: $status }
    ) {
      affected_rows
      returning {
        id
        task_id
        status
      }
    }
  }
`);

const createTask = async (
  object: Tasks_Insert_Input,
): Promise<CreateTaskMutation> => {
  const variables = {
    object,
    status: 'pending',
    completed: false,
  };

  const response = await hasuraClient.request<
    CreateTaskMutation,
    CreateTaskMutationVariables
  >({
    document: CREATE_TASK.toString(),
    variables: variables,
  });
  return response;
};

const updateTaskStatus = async (
  taskId: string,
  status: string,
): Promise<UpdateTaskStatusMutation> => {
  const variables = {
    taskId,
    status,
  };

  const response = await hasuraClient.request<
    UpdateTaskStatusMutation,
    UpdateTaskStatusMutationVariables
  >({
    document: UPDATE_TASK_STATUS.toString(),
    variables: variables,
  });
  return response;
};

export { createTask, updateTaskStatus };
