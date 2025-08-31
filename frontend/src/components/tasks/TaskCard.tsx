import React from 'react';
import { motion } from 'framer-motion';
import { 
  CalendarIcon, 
  UserIcon, 
  FlagIcon,
  ClockIcon,
  ChatBubbleLeftEllipsisIcon 
} from '@heroicons/react/24/outline';
import { Task, TaskPriority, TaskStatus } from '../../types';
import { formatDueDate, truncateText } from '../../utils/formatters';
import { TASK_PRIORITY_COLORS, TASK_STATUS_COLORS } from '../../utils/constants';
import clsx from 'clsx';

interface TaskCardProps {
  task: Task;
  onClick?: (task: Task) => void;
  isDragging?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onClick, isDragging }) => {
  const priorityColor = TASK_PRIORITY_COLORS[task.priority as TaskPriority];
  const statusColor = TASK_STATUS_COLORS[task.status as TaskStatus];
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

  return (
    <motion.div
      layout
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.95 }}
      className={clsx(
        'bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow',
        isDragging && 'opacity-50 rotate-2'
      )}
      onClick={() => onClick?.(task)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2">
          {task.title}
        </h3>
        <div className="flex items-center space-x-1 ml-2">
          <span className={clsx(
            'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
            priorityColor
          )}>
            <FlagIcon className="h-3 w-3 mr-1" />
            {task.priority}
          </span>
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-sm text-gray-600 mb-3">
          {truncateText(task.description, 100)}
        </p>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-xs text-gray-700"
            >
              {tag}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span className="text-xs text-gray-500">+{task.tags.length - 3} more</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-3">
          {/* Assignee */}
          {task.assigneeId && (
            <div className="flex items-center">
              <UserIcon className="h-3 w-3 mr-1" />
              <span>Assigned</span>
            </div>
          )}

          {/* Comments indicator (placeholder) */}
          <div className="flex items-center">
            <ChatBubbleLeftEllipsisIcon className="h-3 w-3 mr-1" />
            <span>0</span>
          </div>
        </div>

        {/* Due date */}
        {task.dueDate && (
          <div className={clsx(
            'flex items-center',
            isOverdue && 'text-red-600'
          )}>
            <CalendarIcon className="h-3 w-3 mr-1" />
            <span>{formatDueDate(task.dueDate)}</span>
          </div>
        )}
      </div>

      {/* Status indicator */}
      <div className={clsx(
        'mt-3 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
        statusColor
      )}>
        <ClockIcon className="h-3 w-3 mr-1" />
        {task.status.replace('_', ' ')}
      </div>
    </motion.div>
  );
};

export default TaskCard;