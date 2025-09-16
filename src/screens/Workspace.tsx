import React from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { StatusBar } from '../components/layout/StatusBar';
import { Stage1MVP } from '../components/stages/Stage1MVP';
import { Stage2Architecture } from '../components/stages/Stage2Architecture';
import { Stage3UserFlow } from '../components/stages/Stage3UserFlow';
import { Stage4StyleGuide } from '../components/stages/Stage4StyleGuide';
import { Stage5TechSpec } from '../components/stages/Stage5TechSpec';
import { Stage6DataArch } from '../components/stages/Stage6DataArch';
import { Stage7TaskPlan } from '../components/stages/Stage7TaskPlan';
import { Stage8Export } from '../components/stages/Stage8Export';
import { useProjectStore } from '../stores/project';

const STAGES = [
  { id: 1, name: 'MVP Definition', component: Stage1MVP },
  { id: 2, name: 'Technical Architecture', component: Stage2Architecture },
  { id: 3, name: 'User Flow', component: Stage3UserFlow },
  { id: 4, name: 'Style Guide', component: Stage4StyleGuide },
  { id: 5, name: 'Technical Spec', component: Stage5TechSpec },
  { id: 6, name: 'Data Architecture', component: Stage6DataArch },
  { id: 7, name: 'Task Planning', component: Stage7TaskPlan },
  { id: 8, name: 'Export', component: Stage8Export },
];

export function Workspace() {
  const { currentStage, workflowNext, workflowPrev } = useProjectStore();
  const StageComponent = STAGES[Math.max(0, currentStage - 1)].component;
  
  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <Header />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar stages={STAGES} currentStage={currentStage} />
        
        <main className="flex-1 overflow-auto bg-gray-800">
          <div className="max-w-6xl mx-auto p-6">
            <StageComponent />
            {/* Global navigation */}
            <div className="flex justify-between mt-8">
              <button
                onClick={() => workflowPrev()}
                disabled={currentStage === 1}
                className="px-6 py-2 rounded-md bg-gray-600 hover:bg-gray-700 disabled:bg-gray-700 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <button
                onClick={() => workflowNext()}
                disabled={currentStage === 8}
                className="px-6 py-2 rounded-md bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </main>
      </div>
      
      <StatusBar />
    </div>
  );
}
