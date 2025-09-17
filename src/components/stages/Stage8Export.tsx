import React, { useState } from 'react';
import { useProjectStore } from '../../stores/project';
import { StageShell } from './StageShell';

export function Stage8Export() {
  const { currentProject, stageData } = useProjectStore();
  const [exportStatus, setExportStatus] = useState<Record<string, 'idle' | 'exporting' | 'success' | 'error'>>({
    generic: 'idle',
    claude: 'idle',
    cursor: 'idle',
    windsurf: 'idle',
    replit: 'idle',
    factory: 'idle'
  });

  async function exportToFormat(platform: string) {
    try {
      setExportStatus(prev => ({ ...prev, [platform]: 'exporting' }));
      
      // Gather all data from previous stages
      const projectData = {
        name: currentProject?.name,
        description: currentProject?.description,
        stages: stageData
      };
      
      // Format content based on platform
      let content = '';
      
      switch (platform) {
        case 'claude':
          content = formatForClaude(projectData);
          break;
        case 'cursor':
          content = formatForCursor(projectData);
          break;
        case 'windsurf':
          content = formatForWindsurf(projectData);
          break;
        case 'replit':
          content = formatForReplit(projectData);
          break;
        case 'factory':
          content = formatForFactory(projectData);
          break;
        default:
          content = JSON.stringify(projectData, null, 2);
      }
      
      const result = await window.electronAPI.exportProject({ 
        projectName: currentProject?.name || 'project', 
        content, 
        platform 
      });
      
      console.log(`Export result for ${platform}:`, result);
      setExportStatus(prev => ({ ...prev, [platform]: result.success ? 'success' : 'error' }));
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setExportStatus(prev => ({ ...prev, [platform]: 'idle' }));
      }, 3000);
      
    } catch (error) {
      console.error(`Export error for ${platform}:`, error);
      setExportStatus(prev => ({ ...prev, [platform]: 'error' }));
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setExportStatus(prev => ({ ...prev, [platform]: 'idle' }));
      }, 3000);
    }
  }

  function formatForClaude(data: any): string {
    return `<project>
<name>${data.name}</name>
<description>${data.description}</description>

<technical_specification>
${Object.entries(data.stages).map(([stageNum, content]) => `
<stage_${stageNum}>
${content}
</stage_${stageNum}>
`).join('\n')}
</technical_specification>

<implementation_tasks>
${data.stages[7] ? data.stages[7] : 'No task plan available yet.'}
</implementation_tasks>
</project>`;
  }

  function formatForCursor(data: any): string {
    return `# ${data.name}
${data.description}

## Technical Specification
${Object.entries(data.stages).map(([stageNum, content]) => `
### Stage ${stageNum}
${content}
`).join('\n')}

## Implementation Plan
${data.stages[7] ? data.stages[7] : 'No task plan available yet.'}
`;
  }

  function formatForWindsurf(data: any): string {
    return `// Windsurf Project: ${data.name}
/*
${data.description}
*/

/*
TECHNICAL SPECIFICATION
${Object.entries(data.stages).map(([stageNum, content]) => `
// Stage ${stageNum}
${content}
`).join('\n')}
*/

/*
IMPLEMENTATION PLAN
${data.stages[7] ? data.stages[7] : 'No task plan available yet.'}
*/
`;
  }

  function formatForReplit(data: any): string {
    return `# ${data.name} - Replit Project

${data.description}

## Technical Specification
${Object.entries(data.stages).map(([stageNum, content]) => `
### Stage ${stageNum}
${content}
`).join('\n')}

## Implementation Plan
${data.stages[7] ? data.stages[7] : 'No task plan available yet.'}

## Getting Started
\`\`\`bash
# Clone this repository
git clone <your-repo-url>

# Install dependencies
npm install

# Start development server
npm run dev
\`\`\`
`;
  }

  function formatForFactory(data: any): string {
    return `# ${data.name} - Factory.ai Project

${data.description}

## Technical Specification
${Object.entries(data.stages).map(([stageNum, content]) => `
### Stage ${stageNum} - ${getStageTitle(Number(stageNum))}
${content}
`).join('\n')}

## Implementation Tasks
${data.stages[7] ? data.stages[7] : 'No task plan available yet.'}

## Next Steps
1. Review the technical specification
2. Implement the core features
3. Test and refine
4. Deploy to production
`;
  }

  function getStageTitle(stageNum: number): string {
    const stageTitles = [
      'MVP Definition',
      'Technical Architecture',
      'User Flow',
      'Style Guide',
      'Technical Spec',
      'Data Architecture',
      'Task Planning',
      'Export'
    ];
    return stageTitles[stageNum - 1] || `Stage ${stageNum}`;
  }

  function getStatusButton(platform: string, label: string) {
    const status = exportStatus[platform];
    
    if (status === 'exporting') {
      return (
        <button disabled className="px-4 py-2 bg-gray-600 rounded flex items-center space-x-2">
          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
          <span>Exporting...</span>
        </button>
      );
    }
    
    if (status === 'success') {
      return (
        <button className="px-4 py-2 bg-green-700 rounded flex items-center space-x-2">
          <span>✓</span>
          <span>Exported!</span>
        </button>
      );
    }
    
    if (status === 'error') {
      return (
        <button onClick={() => exportToFormat(platform)} className="px-4 py-2 bg-red-700 rounded flex items-center space-x-2">
          <span>⚠</span>
          <span>Try Again</span>
        </button>
      );
    }
    
    return (
      <button onClick={() => exportToFormat(platform)} className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">
        {label}
      </button>
    );
  }

  return (
    <div className="space-y-6">
      {/* StageShell handles Generate / Evaluate / Optimize / Accept for Stage 8 */}
      <StageShell
        stageId={8}
        title="Export Specification"
        inputLabel="Export format preferences (optional)"
        inputKey="format"
        placeholder="Examples: Markdown optimized for Cursor; include code blocks; concise sections; or XML-style tags for Claude."
        editorHeight="500px"
      />

      {/* spacer between StageShell and custom export panel */}
      <div className="h-4" />

      <div className="bg-gray-700 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-4">
          Stage 8: Export
        </h2>
        <p className="text-gray-300 mb-6">
          Export your project to your preferred platform. Choose the format that best suits your development workflow.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Generic (JSON)</h3>
            <p className="text-sm text-gray-400 mb-4">Raw project data in JSON format</p>
            {getStatusButton('generic', 'Export JSON')}
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Claude</h3>
            <p className="text-sm text-gray-400 mb-4">Formatted for Claude with XML tags</p>
            {getStatusButton('claude', 'Export for Claude')}
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Cursor</h3>
            <p className="text-sm text-gray-400 mb-4">Markdown format optimized for Cursor</p>
            {getStatusButton('cursor', 'Export for Cursor')}
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Windsurf</h3>
            <p className="text-sm text-gray-400 mb-4">Code-comment format for Windsurf</p>
            {getStatusButton('windsurf', 'Export for Windsurf')}
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Replit</h3>
            <p className="text-sm text-gray-400 mb-4">Markdown with code blocks for Replit</p>
            {getStatusButton('replit', 'Export for Replit')}
          </div>
          
          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Factory.ai</h3>
            <p className="text-sm text-gray-400 mb-4">Structured markdown for Factory.ai</p>
            {getStatusButton('factory', 'Export for Factory')}
          </div>
        </div>
      </div>
    </div>
  );
}
