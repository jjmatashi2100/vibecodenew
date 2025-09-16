import React, { useEffect, useState } from 'react';
import { Welcome } from './screens/Welcome';
import { Workspace } from './screens/Workspace';
import { useAppStore } from './stores/app';
import { useProjectStore } from './stores/project';

function App() {
  const { checkLLMConnection } = useAppStore();
  const { currentProject, startWorkflow } = useProjectStore();
  const [ready, setReady] = useState(false);
  
  useEffect(() => { 
    checkLLMConnection().finally(() => setReady(true)); 
  }, []);

  /* -------------------------------------------------------------
     Start (or restart) the XState workflow machine whenever the
     user opens/changes a project. This keeps the machine in sync
     with the currentStage stored in Zustand.
  ------------------------------------------------------------- */
  useEffect(() => {
    if (currentProject) {
      startWorkflow();
    }
  }, [currentProject, startWorkflow]);
  
  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Detecting LLM providers...</p>
        </div>
      </div>
    );
  }
  
  return currentProject ? <Workspace /> : <Welcome />;
}

export default App;
