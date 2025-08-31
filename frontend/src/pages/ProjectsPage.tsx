import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FolderIcon,
  PlusIcon,
  UsersIcon,
  CalendarIcon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline';
import Layout from '../components/layout/Layout';
import { AppDispatch, RootState } from '../store/store';
import { fetchProjects } from '../store/slices/projectSlice';
import Loading from '../components/common/Loading';
import Button from '../components/common/Button';
import { formatDate } from '../utils/formatters';
import { Project } from '../types';

const ProjectsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { projects, isLoading } = useSelector((state: RootState) => state.projects);

  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);

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
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
            <p className="text-gray-600">Manage your projects and collaborate with your team.</p>
          </div>
          <Button className="flex items-center">
            <PlusIcon className="h-5 w-5 mr-2" />
            New Project
          </Button>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="text-center py-12">
            <FolderIcon className="mx-auto h-16 w-16 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No projects</h3>
            <p className="mt-2 text-sm text-gray-500">
              Get started by creating your first project.
            </p>
            <div className="mt-6">
              <Button>
                <PlusIcon className="h-5 w-5 mr-2" />
                New Project
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project, index) => (
              <ProjectCard key={project.id} project={project} index={index} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

interface ProjectCardProps {
  project: Project;
  index: number;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold"
              style={{ backgroundColor: project.color }}
            >
              {project.name.charAt(0).toUpperCase()}
            </div>
            <div className="ml-3">
              <Link
                to={`/projects/${project.id}`}
                className="text-lg font-medium text-gray-900 hover:text-primary-600 transition-colors"
              >
                {project.name}
              </Link>
            </div>
          </div>
          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
            <EllipsisHorizontalIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {project.description || 'No description provided'}
        </p>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center">
            <UsersIcon className="h-4 w-4 mr-1" />
            <span>{project.memberIds.length} members</span>
          </div>
          <div className="flex items-center">
            <CalendarIcon className="h-4 w-4 mr-1" />
            <span>{formatDate(project.createdAt)}</span>
          </div>
        </div>

        {/* Action */}
        <div className="mt-6">
          <Link
            to={`/projects/${project.id}`}
            className="w-full btn btn-primary text-center block"
          >
            View Project
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default ProjectsPage;