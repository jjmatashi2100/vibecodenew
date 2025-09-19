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

interface Stage1MVPProps {
  service: any; // XState service
}

interface Question {
  id: string;
  text: string;
  answer: string;
}

interface MVPContent {
  elevatorPitch?: string;
  problemStatement?: string;
  targetAudience?: {
    primary?: string;
    secondary?: string;
    tertiary?: string;
  };
  uniqueSellingProposition?: string;
  coreFeatures?: Array<{
    name: string;
    description: string;
    userStory: string;
    acceptanceCriteria: string[];
  }>;
  nonFunctionalRequirements?: {
    performance?: string;
    security?: string;
    scalability?: string;
    accessibility?: string;
  };
  monetizationStrategy?: string;
  questions?: Question[];
  raw?: string;
}

export function Stage1MVP({ service }: Stage1MVPProps) {
  const [state, send] = useActor(service);
  const { currentStage, stageData, isGenerating, error } = state.context as WorkflowContext;
  
  const [concept, setConcept] = useState('');
  const [parsedContent, setParsedContent] = useState<MVPContent>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [feedback, setFeedback] = useState('');
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const [savedIndicator, setSavedIndicator] = useState(false);
  const [activeTab, setActiveTab] = useState('content');
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
          setConcept(content.raw);
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
    
    const versionHistory = await getStageVersions(projectId, 1);
    setVersions(versionHistory.map(v => ({
      version: v.version,
      timestamp: new Date(v.createdAt).toLocaleString()
    })));
  };
  
  const handleAutoSave = () => {
    const projectId = useProjectStore.getState().currentProject?.id;
    if (!projectId || !parsedContent) return;
    
    saveStageData(projectId, 1, {
      content: JSON.stringify(parsedContent),
      questions: questions.map(q => q.text),
      isAutoSave: true
    });
    
    setSavedIndicator(true);
    setTimeout(() => setSavedIndicator(false), 2000);
  };
  
  const handleGenerate = () => {
    if (!concept.trim()) return;
    
    // Update parsed content with raw concept
    const updatedContent = {
      ...parsedContent,
      raw: concept
    };
    setParsedContent(updatedContent);
    
    // Send generate event to state machine
    send({
      type: 'GENERATE',
      prompt: concept
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
    
    // This would need to be implemented in the project store
    const versionData = await useProjectStore.getState().getStageVersion(projectId, 1, version);
    
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
  
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Stage 1: MVP Definition</h2>
          {savedIndicator && (
            <Badge variant="outline" className="bg-green-100 text-green-800">
              Auto-saved
            </Badge>
          )}
        </div>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="concept" className="text-sm font-medium mb-2 block">
              Describe your app concept
            </Label>
            <Textarea
              id="concept"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="A web app that helps users transform their app ideas into detailed technical specifications using locally-installed LLMs..."
              rows={4}
              className="w-full resize-y"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating || !concept.trim()}
              className="flex items-center"
            >
              {isGenerating ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Generating...
                </>
              ) : (
                'Generate MVP Plan'
              )}
            </Button>
            
            {parsedContent && Object.keys(parsedContent).length > 0 && (
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
        </div>
      </Card>
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {parsedContent && Object.keys(parsedContent).length > 0 && (
        <Card className="p-6" ref={contentRef}>
          <Tabs defaultValue="content" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="content">MVP Plan</TabsTrigger>
              <TabsTrigger value="questions">
                Clarifying Questions 
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
            
            <TabsContent value="content" className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="text-lg font-semibold mb-2">Elevator Pitch</h3>
                <p className="text-gray-700">{parsedContent.elevatorPitch || 'Not defined yet'}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="text-lg font-semibold mb-2">Problem Statement</h3>
                <p className="text-gray-700">{parsedContent.problemStatement || 'Not defined yet'}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="text-lg font-semibold mb-2">Target Audience</h3>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">Primary:</span> {parsedContent.targetAudience?.primary || 'Not defined yet'}
                  </div>
                  <div>
                    <span className="font-medium">Secondary:</span> {parsedContent.targetAudience?.secondary || 'Not defined yet'}
                  </div>
                  <div>
                    <span className="font-medium">Tertiary:</span> {parsedContent.targetAudience?.tertiary || 'Not defined yet'}
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="text-lg font-semibold mb-2">Unique Selling Proposition</h3>
                <p className="text-gray-700">{parsedContent.uniqueSellingProposition || 'Not defined yet'}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="text-lg font-semibold mb-2">Core Features</h3>
                {parsedContent.coreFeatures && parsedContent.coreFeatures.length > 0 ? (
                  <div className="space-y-4">
                    {parsedContent.coreFeatures.map((feature, index) => (
                      <div key={index} className="border border-gray-200 rounded-md p-3">
                        <h4 className="font-medium text-md">{feature.name}</h4>
                        <p className="text-gray-700 mt-1">{feature.description}</p>
                        <div className="mt-2">
                          <span className="font-medium">User Story:</span> {feature.userStory}
                        </div>
                        <div className="mt-2">
                          <span className="font-medium">Acceptance Criteria:</span>
                          <ul className="list-disc pl-5 mt-1">
                            {feature.acceptanceCriteria.map((criteria, i) => (
                              <li key={i}>{criteria}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No core features defined yet</p>
                )}
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="text-lg font-semibold mb-2">Non-Functional Requirements</h3>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">Performance:</span> {parsedContent.nonFunctionalRequirements?.performance || 'Not defined yet'}
                  </div>
                  <div>
                    <span className="font-medium">Security:</span> {parsedContent.nonFunctionalRequirements?.security || 'Not defined yet'}
                  </div>
                  <div>
                    <span className="font-medium">Scalability:</span> {parsedContent.nonFunctionalRequirements?.scalability || 'Not defined yet'}
                  </div>
                  <div>
                    <span className="font-medium">Accessibility:</span> {parsedContent.nonFunctionalRequirements?.accessibility || 'Not defined yet'}
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="text-lg font-semibold mb-2">Monetization Strategy</h3>
                <p className="text-gray-700">{parsedContent.monetizationStrategy || 'Not defined yet'}</p>
              </div>
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
                <p className="text-gray-500">No clarifying questions yet. Generate an MVP plan first.</p>
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
                <p className="text-gray-500">No version history yet. Save your MVP plan first.</p>
              )}
            </TabsContent>
            
            <TabsContent value="feedback">
              <div className="space-y-4">
                <Label htmlFor="feedback" className="text-sm font-medium mb-2 block">
                  Provide feedback to improve the MVP plan
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
