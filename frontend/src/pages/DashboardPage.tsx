import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  FolderIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import Layout from '../components/layout/Layout';
import { AppDispatch, RootState } from '../store/store';
import { fetchDashboardStats, fetchTasks } from '../store/slices/taskSlice';
import { fetchProjects } from '../store/slices/projectSlice';
import Loading from '../components/common/Loading';
import Button from '../components/common/Button';
import TaskCard from '../components/tasks/TaskCard';
import CreateTaskModal from '../components/tasks/CreateTaskModal';
import { Task, TaskStatus } from '../types';

const DashboardPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  
  const { user } = useSelector((state: RootState) => state.auth);
  const { tasks, dashboardStats, isLoading: tasksLoading } = useSelector((state: RootState) => state.tasks);
  const { projects, isLoading: projectsLoading } = useSelector((state: RootState) => state.projects);

  useEffect(() => {
    dispatch(fetchDashboardStats());
    dispatch(fetchTasks());
    dispatch(fetchProjects());
  }, [dispatch]);

  const recentTasks = tasks
    .filter(task => task.creatorId === user?.id || task.assigneeId === user?.id)
    .slice(0, 6);

  const overdueTasks = tasks.filter(task => 
    task.dueDate && new Date(task.dueDate) < new Date() && task.status !== TaskStatus.DONE
  );

  const stats = [
    {
      name: 'Total Tasks',
      value: dashboardStats?.totalTasks || 0,
      icon: ChartBarIcon,
      color: 'bg-blue-500',
      change: '+12%',
      changeType: 'increase',
    },
    {
      name: 'In Progress',
      value: dashboardStats?.inProgressTasks || 0,
      icon: ClockIcon,
      color: 'bg-yellow-500',
      change: '+4.75%',
      changeType: 'increase',
    },
    {
      name: 'Completed',
      value: dashboardStats?.completedTasks || 0,
      icon: CheckCircleIcon,
      color: 'bg-green-500',
      change: '+54%',
      changeType: 'increase',
    },
    {
      name: 'Overdue',
      value: dashboardStats?.overdueTasks || 0,
      icon: ExclamationTriangleIcon,
      color: 'bg-red-500',
      change: '-14%',
      changeType: 'decrease',
    },
  ];

  if (tasksLoading || projectsLoading) {
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
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user?.firstName}!
            </h1>
            <p className="text-gray-600">Here's what's happening with your tasks today.</p>
          </div>
          <Button
            onClick={() => setIsCreateTaskModalOpen(true)}
            className="flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            New Task
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-lg shadow p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.color}`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className={`text-sm font-medium ${
                  stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.change}
                </span>
                <span className="text-sm text-gray-500 ml-1">from last month</span>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Tasks */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">Recent Tasks</h2>
                <Link
                  to="/tasks"
                  className="text-sm text-primary-600 hover:text-primary-500"
                >
                  View all
                </Link>
              </div>
              <div className="p-6">
                {recentTasks.length === 0 ? (
                  <div className="text-center py-12">
                    <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new task.</p>
                    <div className="mt-6">
                      <Button onClick={() => setIsCreateTaskModalOpen(true)}>
                        <PlusIcon className="h-5 w-5 mr-2" />
                        New Task
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recentTasks.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Projects Overview */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">Projects</h2>
                <Link
                  to="/projects"
                  className="text-sm text-primary-600 hover:text-primary-500"
                >
                  View all
                </Link>
              </div>
              <div className="p-6">
                {projects.length === 0 ? (
                  <div className="text-center py-8">
                    <FolderIcon className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">No projects yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {projects.slice(0, 5).map((project) => (
                      <Link
                        key={project.id}
                        to={`/projects/${project.id}`}
                        className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: project.color }}
                        />
                        <div className="ml-3 flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {project.name}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {project.memberIds.length} members
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Overdue Tasks */}
            {overdueTasks.length > 0 && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900 text-red-600">
                    Overdue Tasks
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {overdueTasks.slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        className="p-3 bg-red-50 border border-red-200 rounded-lg"
                      >
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {task.title}
                        </p>
                        <p className="text-xs text-red-600 mt-1">
                          Due: {new Date(task.dueDate!).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateTaskModal
        isOpen={isCreateTaskModalOpen}
        onClose={() => setIsCreateTaskModalOpen(false)}
      />
    </Layout>
  );
};

export default DashboardPage;