import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { PlusIcon } from '@heroicons/react/24/outline';
import Layout from '../components/layout/Layout';
import TaskCard from '../components/tasks/TaskCard';
import CreateTaskModal from '../components/tasks/CreateTaskModal';
import Button from '../components/common/Button';
import { AppDispatch, RootState } from '../store/store';
import { fetchTasks, updateTask, moveTask } from '../store/slices/taskSlice';
import { fetchProjects } from '../store/slices/projectSlice';
import { Task, TaskStatus } from '../types';
import Loading from '../components/common/Loading';
import toast from 'react-hot-toast';

const COLUMN_CONFIG = [
  {
    id: TaskStatus.TODO,
    title: 'To Do',
    color: 'bg-gray-100',
  },
  {
    id: TaskStatus.IN_PROGRESS,
    title: 'In Progress',
    color: 'bg-blue-100',
  },
  {
    id: TaskStatus.IN_REVIEW,
    title: 'In Review',
    color: 'bg-yellow-100',
  },
  {
    id: TaskStatus.DONE,
    title: 'Done',
    color: 'bg-green-100',
  },
];

const TaskBoardPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const { tasks, isLoading } = useSelector((state: RootState) => state.tasks);

  useEffect(() => {
    dispatch(fetchTasks());
    dispatch(fetchProjects());
  }, [dispatch]);

  const onDragEnd = async (result: any) => {
    if (!result.destination) return;

    const { draggableId, destination, source } = result;
    
    if (destination.droppableId === source.droppableId) return;

    const taskId = draggableId;
    const newStatus = destination.droppableId as TaskStatus;

    // Optimistically update the UI
    dispatch(moveTask({ taskId, newStatus }));

    try {
      await dispatch(updateTask({ 
        id: taskId, 
        data: { status: newStatus } 
      })).unwrap();
      toast.success('Task moved successfully');
    } catch (error: any) {
      // Revert the optimistic update on error
      const originalTask = tasks.find(t => t.id === taskId);
      if (originalTask) {
        dispatch(moveTask({ taskId, newStatus: originalTask.status }));
      }
      toast.error('Failed to move task');
    }
  };

  const getTasksByStatus = (status: TaskStatus): Task[] => {
    return tasks.filter(task => task.status === status);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <Loading size="lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Task Board</h1>
            <p className="text-gray-600">Drag and drop tasks to update their status.</p>
          </div>
          <Button
            onClick={() => setIsCreateTaskModalOpen(true)}
            className="flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            New Task
          </Button>
        </div>

        {/* Kanban Board */}
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {COLUMN_CONFIG.map((column) => {
              const columnTasks = getTasksByStatus(column.id);
              
              return (
                <div
                  key={column.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200"
                >
                  {/* Column Header */}
                  <div className={`p-4 border-b border-gray-200 ${column.color} rounded-t-lg`}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">{column.title}</h3>
                      <span className="text-sm text-gray-600 bg-white px-2 py-1 rounded-full">
                        {columnTasks.length}
                      </span>
                    </div>
                  </div>

                  {/* Column Content */}
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`p-4 min-h-[500px] space-y-3 ${
                          snapshot.isDraggingOver ? 'bg-gray-50' : ''
                        }`}
                      >
                        {columnTasks.map((task, index) => (
                          <Draggable
                            key={task.id}
                            draggableId={task.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                <TaskCard
                                  task={task}
                                  isDragging={snapshot.isDragging}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}

                        {/* Empty state */}
                        {columnTasks.length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            <p className="text-sm">No tasks</p>
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>

      <CreateTaskModal
        isOpen={isCreateTaskModalOpen}
        onClose={() => setIsCreateTaskModalOpen(false)}
      />
    </Layout>
  );
};

export default TaskBoardPage;