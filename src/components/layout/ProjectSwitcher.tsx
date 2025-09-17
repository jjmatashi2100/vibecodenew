import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../../stores/project';

interface Project {
  id: string;
  name: string;
  description: string;
  current_stage: number;
  current_cycle: number;
  updated_at: number;
}

export function ProjectSwitcher({ onClose }: { onClose: () => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const { loadProject, closeProject } = useProjectStore();

  // Fetch projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const projectList = await window.electronAPI.listProjects();
        setProjects(projectList);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // Format date for display
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  // Handle opening a project
  const handleOpenProject = async (id: string) => {
    try {
      // Close current project first to save state
      await closeProject();
      // Then load the selected project
      await loadProject(id);
      onClose();
    } catch (error) {
      console.error('Failed to open project:', error);
    }
  };

  // Handle creating a new project
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      // Close current project first
      await closeProject();
      
      // Create new project
      const project = await window.electronAPI.createProject({
        name: newProjectName.trim(),
        description: newProjectDescription.trim()
      });
      
      // Load the newly created project
      await loadProject(project.id);
      onClose();
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 w-[600px] max-w-full max-h-[80vh] flex flex-col">
        <h2 className="text-xl font-bold text-white mb-4">Projects</h2>
        
        <div className="overflow-auto flex-grow mb-4">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-gray-400 text-center py-8">
              No projects found. Create a new one below.
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map((project) => (
                <div 
                  key={project.id} 
                  className="bg-gray-700 rounded-md p-3 flex justify-between items-center hover:bg-gray-650 transition-colors"
                >
                  <div className="flex-grow">
                    <div className="font-medium text-white">{project.name}</div>
                    {project.description && (
                      <div className="text-sm text-gray-300 truncate max-w-md">{project.description}</div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">
                      Stage {project.current_stage} • Cycle {project.current_cycle} • 
                      Updated: {formatDate(project.updated_at)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleOpenProject(project.id)}
                    className="ml-4 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  >
                    Open
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="border-t border-gray-700 pt-4 mt-2">
          <h3 className="text-lg font-semibold text-white mb-3">Create New Project</h3>
          <div className="space-y-3">
            <div>
              <label htmlFor="projectName" className="block text-sm font-medium text-gray-300 mb-1">
                Project Name
              </label>
              <input
                id="projectName"
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="My New Project"
              />
            </div>
            <div>
              <label htmlFor="projectDesc" className="block text-sm font-medium text-gray-300 mb-1">
                Description (optional)
              </label>
              <textarea
                id="projectDesc"
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder="Brief description of your project"
                rows={2}
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-end mt-6 space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateProject}
            disabled={!newProjectName.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed"
          >
            Create Project
          </button>
        </div>
      </div>
    </div>
  );
}
