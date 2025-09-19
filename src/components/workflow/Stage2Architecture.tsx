import React, { useState, useEffect, useRef } from 'react';
import { useActor } from '@xstate/react';
import { useProjectStore } from '../../stores/project';
import { WorkflowContext, WorkflowEvent } from '../../lib/workflow/machine';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { Card } from '../ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { Spinner } from '../ui/Spinner';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Tooltip } from '../ui/Tooltip';
import { Alert, AlertDescription, AlertTitle } from '../ui/Alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';

interface Stage2ArchitectureProps {
  service: any; // XState service
}

interface Question {
  id: string;
  text: string;
  answer: string;
}

interface TechStackItem {
  name: string;
  description: string;
  alternatives?: string[];
  rationale?: string;
}

interface FeatureTechMapping {
  featureName: string;
  technologies: string[];
  complexityLevel?: 'Low' | 'Medium' | 'High';
}

interface ServiceConnection {
  source: string;
  target: string;
  description: string;
  protocol?: string;
}

interface ThirdPartyService {
  name: string;
  purpose: string;
  apiDocumentation?: string;
  pricing?: string;
  alternatives?: string[];
}

interface ScalabilityStrategy {
  component: string;
  strategy: string;
  implementation: string;
  thresholds?: string;
}

interface ArchitectureContent {
  frontendStack: TechStackItem[];
  backendStack: TechStackItem[];
  database: TechStackItem[];
  infrastructure: TechStackItem[];
  thirdPartyServices: ThirdPartyService[];
  featureTechMapping: FeatureTechMapping[];
  systemDiagram?: string;
  serviceConnections: ServiceConnection[];
  technicalDependencies: string[];
  scalabilityStrategies: ScalabilityStrategy[];
  securityConsiderations?: string[];
  deploymentStrategy?: string;
  devOpsRequirements?: string[];
  questions?: Question[];
  raw?: string;
}

export function Stage2Architecture({ service }: Stage2ArchitectureProps) {
  const [state, send] = useActor(service);
  const { currentStage, stageData, isGenerating, error, globalContext } = state.context as WorkflowContext;
  
  const [additionalRequirements, setAdditionalRequirements] = useState('');
  const [parsedContent, setParsedContent] = useState<ArchitectureContent>({
    frontendStack: [],
    backendStack: [],
    database: [],
    infrastructure: [],
    thirdPartyServices: [],
    featureTechMapping: [],
    serviceConnections: [],
    technicalDependencies: [],
    scalabilityStrategies: []
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [feedback, setFeedback] = useState('');
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const [savedIndicator, setSavedIndicator] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [versions, setVersions] = useState<{version: number, timestamp: string}[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  
  const contentRef = useRef<HTMLDivElement>(null);
  const { saveStageData, getStageVersions } = useProjectStore();
  
  // Initialize from context if available
  useEffect(() => {
    if (stageData && stageData[currentStage]) {
      try {
        const currentStageData = stageData[currentStage];
        const content = typeof currentStageData.content === 'string' 
          ? JSON.parse(currentStageData.content) 
          : currentStageData.content;
        
        setParsedContent(content);
        
        if (content.raw) {
          setAdditionalRequirements(content.raw);
        }
        
        if (Array.isArray(currentStageData.questions)) {
          setQuestions(currentStageData.questions.map((q: any, i: number) => ({
            id: `q-${i}`,
            text: q,
            answer: ''
          })));
        }
      } catch (e) {
        console.error('Failed to parse stage data:', e);
      }
    }
    
    // Load version history
    loadVersionHistory();
  }, [currentStage, stageData]);
  
  // Auto-save functionality
  useEffect(() => {
    if (parsedContent && Object.keys(parsedContent).length > 0) {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
      
      const timer = setTimeout(() => {
        handleAutoSave();
      }, 10000); // Auto-save every 10 seconds
      
      setAutoSaveTimer(timer);
    }
    
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [parsedContent, questions]);
  
  const loadVersionHistory = async () => {
    const projectId = useProjectStore.getState().currentProject?.id;
    if (!projectId) return;
    
    const versionHistory = await getStageVersions(projectId, 2);
    setVersions(versionHistory.map(v => ({
      version: v.version,
      timestamp: new Date(v.createdAt).toLocaleString()
    })));
  };
  
  const handleAutoSave = () => {
    const projectId = useProjectStore.getState().currentProject?.id;
    if (!projectId || !parsedContent) return;
    
    saveStageData(projectId, 2, {
      content: JSON.stringify(parsedContent),
      questions: questions.map(q => q.text),
      isAutoSave: true
    });
    
    setSavedIndicator(true);
    setTimeout(() => setSavedIndicator(false), 2000);
  };
  
  const handleGenerate = () => {
    // Prepare context from previous stage
    const prevStageData = stageData[1]?.content 
      ? (typeof stageData[1].content === 'string' ? JSON.parse(stageData[1].content) : stageData[1].content)
      : null;
    
    // Update parsed content with raw requirements
    const updatedContent = {
      ...parsedContent,
      raw: additionalRequirements
    };
    setParsedContent(updatedContent);
    
    // Send generate event to state machine
    send({
      type: 'GENERATE',
      prompt: JSON.stringify({
        previousStage: prevStageData,
        additionalRequirements
      })
    });
  };
  
  const handleAccept = () => {
    send({ type: 'ACCEPT' });
  };
  
  const handleIterate = () => {
    const feedbackItems = feedback.split('\n').filter(item => item.trim());
    
    send({
      type: 'ITERATE',
      feedback: feedbackItems
    });
    
    setFeedback('');
  };
  
  const handleEdit = () => {
    send({
      type: 'EDIT',
      content: JSON.stringify(parsedContent)
    });
  };
  
  const handleSave = () => {
    send({
      type: 'SAVE',
      content: JSON.stringify(parsedContent)
    });
  };
  
  const handleQuestionChange = (id: string, answer: string) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, answer } : q
    ));
  };
  
  const handleLoadVersion = async (version: number) => {
    setSelectedVersion(version);
    const projectId = useProjectStore.getState().currentProject?.id;
    if (!projectId) return;
    
    const versionData = await useProjectStore.getState().getStageVersion(projectId, 2, version);
    
    if (versionData) {
      try {
        const content = JSON.parse(versionData.content);
        setParsedContent(content);
        
        if (Array.isArray(versionData.questions)) {
          setQuestions(versionData.questions.map((q: any, i: number) => ({
            id: `q-${i}`,
            text: q,
            answer: ''
          })));
        }
      } catch (e) {
        console.error('Failed to parse version data:', e);
      }
    }
  };
  
  // Parse the content if it's a string
  useEffect(() => {
    if (stageData && stageData[currentStage] && typeof stageData[currentStage].content === 'string') {
      try {
        const content = JSON.parse(stageData[currentStage].content);
        setParsedContent(content);
      } catch (e) {
        console.error('Failed to parse content:', e);
      }
    }
  }, [stageData, currentStage]);
  
  // Scroll to content when generated
  useEffect(() => {
    if (parsedContent && Object.keys(parsedContent).length > 0 && !isGenerating && contentRef.current) {
      contentRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [parsedContent, isGenerating]);
  
  // Get features from previous stage
  const getPreviousStageFeatures = () => {
    if (stageData && stageData[1] && stageData[1].content) {
      try {
        const content = typeof stageData[1].content === 'string' 
          ? JSON.parse(stageData[1].content) 
          : stageData[1].content;
        
        return content.coreFeatures || [];
      } catch (e) {
        console.error('Failed to parse previous stage data:', e);
        return [];
      }
    }
    return [];
  };
  
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Stage 2: Technical Architecture & System Design</h2>
          {savedIndicator && (
            <Badge variant="outline" className="bg-green-100 text-green-800">
              Auto-saved
            </Badge>
          )}
        </div>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="additionalRequirements" className="text-sm font-medium mb-2 block">
              Additional Technical Requirements or Preferences
            </Label>
            <Textarea
              id="additionalRequirements"
              value={additionalRequirements}
              onChange={(e) => setAdditionalRequirements(e.target.value)}
              placeholder="Specify any technical constraints, preferences, or requirements (e.g., 'Must use React', 'Prefer serverless architecture', 'Need real-time capabilities')..."
              rows={4}
              className="w-full resize-y"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating || !getPreviousStageFeatures().length}
              className="flex items-center"
            >
              {isGenerating ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Generating...
                </>
              ) : (
                'Generate Technical Architecture'
              )}
            </Button>
            
            {parsedContent && parsedContent.frontendStack && parsedContent.frontendStack.length > 0 && (
              <>
                <Button 
                  onClick={handleAccept}
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                  disabled={isGenerating}
                >
                  Accept & Continue
                </Button>
                <Button 
                  onClick={handleEdit}
                  variant="outline"
                  disabled={isGenerating}
                >
                  Edit Manually
                </Button>
                <Button 
                  onClick={handleSave}
                  variant="outline"
                  disabled={isGenerating}
                >
                  Save
                </Button>
              </>
            )}
          </div>
          
          {getPreviousStageFeatures().length === 0 && (
            <Alert className="mt-4">
              <AlertTitle>Previous Stage Required</AlertTitle>
              <AlertDescription>
                Please complete Stage 1 (MVP Definition) before generating the technical architecture.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </Card>
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {parsedContent && parsedContent.frontendStack && parsedContent.frontendStack.length > 0 && (
        <Card className="p-6" ref={contentRef}>
          <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="frontend">Frontend Stack</TabsTrigger>
              <TabsTrigger value="backend">Backend Stack</TabsTrigger>
              <TabsTrigger value="database">Database</TabsTrigger>
              <TabsTrigger value="infrastructure">Infrastructure</TabsTrigger>
              <TabsTrigger value="services">Third-party Services</TabsTrigger>
              <TabsTrigger value="scalability">Scalability</TabsTrigger>
              <TabsTrigger value="diagram">System Diagram</TabsTrigger>
              <TabsTrigger value="questions">
                Questions
                {questions.length > 0 && (
                  <Badge className="ml-2 bg-blue-100 text-blue-800">{questions.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="versions">
                Version History
                {versions.length > 0 && (
                  <Badge className="ml-2 bg-purple-100 text-purple-800">{versions.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="feedback">Provide Feedback</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="text-lg font-semibold mb-2">Feature-Technology Mapping</h3>
                  {parsedContent.featureTechMapping && parsedContent.featureTechMapping.length > 0 ? (
                    <div className="space-y-3">
                      {parsedContent.featureTechMapping.map((mapping, index) => (
                        <div key={index} className="border border-gray-200 rounded-md p-3">
                          <h4 className="font-medium text-md">{mapping.featureName}</h4>
                          <div className="mt-1">
                            <span className="font-medium">Technologies:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {mapping.technologies.map((tech, i) => (
                                <Badge key={i} className="bg-blue-50 text-blue-700">{tech}</Badge>
                              ))}
                            </div>
                          </div>
                          {mapping.complexityLevel && (
                            <div className="mt-2">
                              <span className="font-medium">Complexity:</span>{' '}
                              <Badge 
                                className={
                                  mapping.complexityLevel === 'Low' 
                                    ? 'bg-green-50 text-green-700' 
                                    : mapping.complexityLevel === 'Medium'
                                      ? 'bg-yellow-50 text-yellow-700'
                                      : 'bg-red-50 text-red-700'
                                }
                              >
                                {mapping.complexityLevel}
                              </Badge>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No feature-technology mapping defined yet</p>
                  )}
                </div>
                
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="text-lg font-semibold mb-2">Technical Dependencies</h3>
                  {parsedContent.technicalDependencies && parsedContent.technicalDependencies.length > 0 ? (
                    <ul className="list-disc pl-5 space-y-1">
                      {parsedContent.technicalDependencies.map((dependency, index) => (
                        <li key={index} className="text-gray-700">{dependency}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">No technical dependencies defined yet</p>
                  )}
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="text-lg font-semibold mb-2">Service Connections</h3>
                {parsedContent.serviceConnections && parsedContent.serviceConnections.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Protocol</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {parsedContent.serviceConnections.map((connection, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{connection.source}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{connection.target}</td>
                            <td className="px-3 py-2 text-sm text-gray-700">{connection.description}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">{connection.protocol || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500">No service connections defined yet</p>
                )}
              </div>
              
              {parsedContent.deploymentStrategy && (
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="text-lg font-semibold mb-2">Deployment Strategy</h3>
                  <p className="text-gray-700">{parsedContent.deploymentStrategy}</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="frontend" className="space-y-4">
              <h3 className="text-xl font-semibold">Frontend Technology Stack</h3>
              {parsedContent.frontendStack && parsedContent.frontendStack.length > 0 ? (
                <div className="space-y-4">
                  {parsedContent.frontendStack.map((tech, index) => (
                    <div key={index} className="border border-gray-200 rounded-md p-4">
                      <h4 className="font-medium text-lg">{tech.name}</h4>
                      <p className="text-gray-700 mt-1">{tech.description}</p>
                      {tech.rationale && (
                        <div className="mt-2">
                          <span className="font-medium">Rationale:</span> {tech.rationale}
                        </div>
                      )}
                      {tech.alternatives && tech.alternatives.length > 0 && (
                        <div className="mt-2">
                          <span className="font-medium">Alternatives:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {tech.alternatives.map((alt, i) => (
                              <Badge key={i} variant="outline" className="bg-gray-50">{alt}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No frontend technologies defined yet</p>
              )}
            </TabsContent>
            
            <TabsContent value="backend" className="space-y-4">
              <h3 className="text-xl font-semibold">Backend Technology Stack</h3>
              {parsedContent.backendStack && parsedContent.backendStack.length > 0 ? (
                <div className="space-y-4">
                  {parsedContent.backendStack.map((tech, index) => (
                    <div key={index} className="border border-gray-200 rounded-md p-4">
                      <h4 className="font-medium text-lg">{tech.name}</h4>
                      <p className="text-gray-700 mt-1">{tech.description}</p>
                      {tech.rationale && (
                        <div className="mt-2">
                          <span className="font-medium">Rationale:</span> {tech.rationale}
                        </div>
                      )}
                      {tech.alternatives && tech.alternatives.length > 0 && (
                        <div className="mt-2">
                          <span className="font-medium">Alternatives:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {tech.alternatives.map((alt, i) => (
                              <Badge key={i} variant="outline" className="bg-gray-50">{alt}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No backend technologies defined yet</p>
              )}
            </TabsContent>
            
            <TabsContent value="database" className="space-y-4">
              <h3 className="text-xl font-semibold">Database Technology</h3>
              {parsedContent.database && parsedContent.database.length > 0 ? (
                <div className="space-y-4">
                  {parsedContent.database.map((tech, index) => (
                    <div key={index} className="border border-gray-200 rounded-md p-4">
                      <h4 className="font-medium text-lg">{tech.name}</h4>
                      <p className="text-gray-700 mt-1">{tech.description}</p>
                      {tech.rationale && (
                        <div className="mt-2">
                          <span className="font-medium">Rationale:</span> {tech.rationale}
                        </div>
                      )}
                      {tech.alternatives && tech.alternatives.length > 0 && (
                        <div className="mt-2">
                          <span className="font-medium">Alternatives:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {tech.alternatives.map((alt, i) => (
                              <Badge key={i} variant="outline" className="bg-gray-50">{alt}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No database technologies defined yet</p>
              )}
            </TabsContent>
            
            <TabsContent value="infrastructure" className="space-y-4">
              <h3 className="text-xl font-semibold">Infrastructure</h3>
              {parsedContent.infrastructure && parsedContent.infrastructure.length > 0 ? (
                <div className="space-y-4">
                  {parsedContent.infrastructure.map((tech, index) => (
                    <div key={index} className="border border-gray-200 rounded-md p-4">
                      <h4 className="font-medium text-lg">{tech.name}</h4>
                      <p className="text-gray-700 mt-1">{tech.description}</p>
                      {tech.rationale && (
                        <div className="mt-2">
                          <span className="font-medium">Rationale:</span> {tech.rationale}
                        </div>
                      )}
                      {tech.alternatives && tech.alternatives.length > 0 && (
                        <div className="mt-2">
                          <span className="font-medium">Alternatives:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {tech.alternatives.map((alt, i) => (
                              <Badge key={i} variant="outline" className="bg-gray-50">{alt}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No infrastructure technologies defined yet</p>
              )}
              
              {parsedContent.devOpsRequirements && parsedContent.devOpsRequirements.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-lg font-semibold mb-2">DevOps Requirements</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {parsedContent.devOpsRequirements.map((req, index) => (
                      <li key={index} className="text-gray-700">{req}</li>
                    ))}
                  </ul>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="services" className="space-y-4">
              <h3 className="text-xl font-semibold">Third-party Services</h3>
              {parsedContent.thirdPartyServices && parsedContent.thirdPartyServices.length > 0 ? (
                <div className="space-y-4">
                  {parsedContent.thirdPartyServices.map((service, index) => (
                    <div key={index} className="border border-gray-200 rounded-md p-4">
                      <h4 className="font-medium text-lg">{service.name}</h4>
                      <p className="text-gray-700 mt-1">{service.purpose}</p>
                      
                      {service.apiDocumentation && (
                        <div className="mt-2">
                          <span className="font-medium">API Documentation:</span>{' '}
                          <a href={service.apiDocumentation} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {service.apiDocumentation}
                          </a>
                        </div>
                      )}
                      
                      {service.pricing && (
                        <div className="mt-2">
                          <span className="font-medium">Pricing:</span> {service.pricing}
                        </div>
                      )}
                      
                      {service.alternatives && service.alternatives.length > 0 && (
                        <div className="mt-2">
                          <span className="font-medium">Alternatives:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {service.alternatives.map((alt, i) => (
                              <Badge key={i} variant="outline" className="bg-gray-50">{alt}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No third-party services defined yet</p>
              )}
            </TabsContent>
            
            <TabsContent value="scalability" className="space-y-4">
              <h3 className="text-xl font-semibold">Scalability Strategies</h3>
              {parsedContent.scalabilityStrategies && parsedContent.scalabilityStrategies.length > 0 ? (
                <div className="space-y-4">
                  {parsedContent.scalabilityStrategies.map((strategy, index) => (
                    <div key={index} className="border border-gray-200 rounded-md p-4">
                      <h4 className="font-medium text-lg">{strategy.component}</h4>
                      <div className="mt-1">
                        <span className="font-medium">Strategy:</span> {strategy.strategy}
                      </div>
                      <div className="mt-2">
                        <span className="font-medium">Implementation:</span> {strategy.implementation}
                      </div>
                      {strategy.thresholds && (
                        <div className="mt-2">
                          <span className="font-medium">Thresholds:</span> {strategy.thresholds}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No scalability strategies defined yet</p>
              )}
              
              {parsedContent.securityConsiderations && parsedContent.securityConsiderations.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-lg font-semibold mb-2">Security Considerations</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {parsedContent.securityConsiderations.map((consideration, index) => (
                      <li key={index} className="text-gray-700">{consideration}</li>
                    ))}
                  </ul>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="diagram" className="space-y-4">
              <h3 className="text-xl font-semibold">System Diagram</h3>
              {parsedContent.systemDiagram ? (
                <div className="bg-gray-50 p-4 rounded-md">
                  <pre className="whitespace-pre-wrap font-mono text-sm overflow-x-auto">
                    {parsedContent.systemDiagram}
                  </pre>
                </div>
              ) : (
                <p className="text-gray-500">No system diagram defined yet</p>
              )}
            </TabsContent>
            
            <TabsContent value="questions">
              {questions.length > 0 ? (
                <div className="space-y-4">
                  {questions.map((question) => (
                    <div key={question.id} className="border border-gray-200 rounded-md p-4">
                      <Label className="font-medium mb-2 block">{question.text}</Label>
                      <Textarea
                        value={question.answer}
                        onChange={(e) => handleQuestionChange(question.id, e.target.value)}
                        placeholder="Your answer..."
                        rows={3}
                        className="w-full resize-y"
                      />
                    </div>
                  ))}
                  
                  <Button 
                    onClick={handleIterate}
                    disabled={isGenerating || questions.some(q => !q.answer.trim())}
                  >
                    Submit Answers & Regenerate
                  </Button>
                </div>
              ) : (
                <p className="text-gray-500">No clarifying questions yet. Generate a technical architecture first.</p>
              )}
            </TabsContent>
            
            <TabsContent value="versions">
              {versions.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {versions.map((version) => (
                      <Card 
                        key={version.version}
                        className={`p-4 cursor-pointer hover:border-blue-300 transition-colors ${
                          selectedVersion === version.version ? 'border-2 border-blue-500' : ''
                        }`}
                        onClick={() => handleLoadVersion(version.version)}
                      >
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">Version {version.version}</h4>
                          {selectedVersion === version.version && (
                            <Badge className="bg-blue-100 text-blue-800">Current</Badge>
                          )}
                        </div>
                        <p className="text-gray-500 text-sm mt-1">{version.timestamp}</p>
                      </Card>
                    ))}
                  </div>
                  
                  {selectedVersion && (
                    <div className="flex gap-2 mt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => setSelectedVersion(null)}
                      >
                        Back to Current
                      </Button>
                      <Button 
                        onClick={() => handleSave()}
                      >
                        Restore This Version
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">No version history yet. Save your technical architecture first.</p>
              )}
            </TabsContent>
            
            <TabsContent value="feedback">
              <div className="space-y-4">
                <Label htmlFor="feedback" className="text-sm font-medium mb-2 block">
                  Provide feedback to improve the technical architecture
                </Label>
                <Textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Enter your feedback here, with each point on a new line..."
                  rows={6}
                  className="w-full resize-y"
                />
                
                <Button 
                  onClick={handleIterate}
                  disabled={isGenerating || !feedback.trim()}
                >
                  Submit Feedback & Regenerate
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      )}
    </div>
  );
}
