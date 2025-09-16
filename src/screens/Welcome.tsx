import React, { useState } from 'react';
import { useProjectStore } from '../stores/project';

export function Welcome() {
  const [name, setName] = useState('My Project');
  const [description, setDescription] = useState('');
  const { loadProject } = useProjectStore();

  async function create() {
    const project = await (window as any).electronAPI.createProject({ name, description });
    await loadProject(project.id);
  }

  return (
    <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="bg-gray-800 p-8 rounded-lg w-full max-w-xl space-y-4">
        <h1 className="text-2xl font-bold">Vibe Code System</h1>
        <p className="text-gray-400">Create a new project to begin the 8-stage workflow.</p>
        <input className="w-full p-2 rounded bg-gray-700" value={name} onChange={e=>setName(e.target.value)} placeholder="Project name" />
        <textarea className="w-full p-2 rounded bg-gray-700" value={description} onChange={e=>setDescription(e.target.value)} placeholder="Description" />
        <button onClick={create} className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">Create Project</button>
      </div>
    </div>
  );
}
