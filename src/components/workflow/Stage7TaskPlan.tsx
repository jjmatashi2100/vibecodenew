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
import { Alert, AlertDescription, AlertTitle } from '../ui/Alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { Checkbox } from '../ui/Checkbox';
import { ArrowUp, ArrowDown, Plus, Trash, AlertTriangle, Check, X, FileCode, Clock, ArrowRight } from 'lucide-react';

interface Stage7TaskPlanProps {
  service: any; // XState service
}

interface Question {
  id: string;
  text: string;
  answer: string;
}

interface TaskDependency {
  taskId: string;
  type: 'hard' | 'soft'; // hard = blocking, soft = recommended order
}

interface TaskFile {
  path: string;
  operation: 'create' | 'modify' | 'delete';
  description?: string;
}

interface Task {
  id: string;
  name: string;
  description: string;
  phase: string;
  dependencies: TaskDependency[];
  files: TaskFile[];
  estimatedTime: {
    beginner: number; // in minutes
    experienced: number; // in minutes
  };
  complexity: 'Low' | 'Medium' | 'High';
  evaluatorChecks: string[];
  optimizerSuggestions?: string[];
  isComplete?: boolean;
}

interface Phase {
  id: string;
  name: string;
  description: string;
  order: number;
}

interface TaskPlanContent {
  phases: Phase[];
  tasks: Task[];
  evaluatorCriteria: string[];
  optimizerApproach: string;
  questions?: Question[];
  raw?: string;
}

export function Stage7TaskPlan({ service }: Stage7TaskPlanProps) {
  const [state, send] = useActor(service);
  const { currentStage, stageData, isGenerating, error, globalContext } = state.context as WorkflowContext;
  
  const [additionalRequirements, setAdditionalRequirements] = useState('');
  const [parsedContent, setParsedContent] = useState<TaskPlanContent>({
    phases: [],
    tasks: [],
    evaluatorCriteria: [],
    optimizerApproach: ''
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [feedback, setFeedback] = useState('');
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const [savedIndicator, setSavedIndicator] = useState(false);
  const [activeTab, setActiveTab] = useState('tasks');
  const [versions, setVersions] = useState<{version: number, timestamp: string}[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  
  // Task editing states
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [showTaskEditor, setShowTaskEditor] = useState(false);
  const [taskNameInput, setTaskNameInput] = useState('');
  const [taskDescriptionInput, setTaskDescriptionInput] = useState('');
  const [taskPhaseInput, setTaskPhaseInput] = useState('');
  const [taskComplexityInput, setTaskComplexityInput] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [taskBeginnerTimeInput, setTaskBeginnerTimeInput] = useState(0);
  const [taskExperiencedTimeInput, setTaskExperiencedTimeInput] = useState(0);
  const [taskFiles, setTaskFiles] = useState<TaskFile[]>([]);
  const [taskDependencies, setTaskDependencies] = useState<TaskDependency[]>([]);
  const [taskEvaluatorChecks, setTaskEvaluatorChecks] = useState<string[]>([]);
  const [taskOptimizerSuggestions, setTaskOptimizerSuggestions] = useState<string[]>([]);
  
  // File editing states
  const [newFilePath, setNewFilePath] = useState('');
  const [newFileOperation, setNewFileOperation] = useState<'create' | 'modify' | 'delete'>('create');
  const [newFileDescription, setNewFileDescription] = useState('');
  const [fileCountWarning, setFileCountWarning] = useState(false);
  
  // Dependency selection state
  const [availableTasks, setAvailableTasks] = useState<{id: string, name: string}[]>([]);
  const [selectedDependencyId, setSelectedDependencyId] = useState('');
  const [selectedDependencyType, setSelectedDependencyType] = useState<'hard' | 'soft'>('hard');
  
  // Phase editing states
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null);
  const [showPhaseEditor, setShowPhaseEditor] = useState(false);
  const [phaseNameInput, setPhaseNameInput] = useState('');
  const [phaseDescriptionInput, setPhaseDescriptionInput] = useState('');
  const [phaseOrderInput, setPhaseOrderInput] = useState(0);
  
  // Filter and sort states
  const [phaseFilter, setPhaseFilter] = useState<string>('all');
  const [complexityFilter, setComplexityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('phase');
  const [showDependencyView, setShowDependencyView] = useState(false);
  
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
  
  // Update available tasks for dependencies whenever tasks change
  useEffect(() => {
    if (parsedContent.tasks) {
      const tasks = parsedContent.tasks.map(task => ({
        id: task.id,
        name: task.name
      }));
      
      // If editing a task, filter out the current task to prevent self-dependency
      if (editingTaskId) {
        setAvailableTasks(tasks.filter(task => task.id !== editingTaskId));
      } else {
        setAvailableTasks(tasks);
      }
    }
  }, [parsedContent.tasks, editingTaskId]);
  
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
  
  // Warn when file count exceeds 15
  useEffect(() => {
    setFileCountWarning(taskFiles.length >= 15);
  }, [taskFiles]);
  
  const loadVersionHistory = async () => {
    const projectId = useProjectStore.getState().currentProject?.id;
    if (!projectId) return;
    
    const versionHistory = await getStageVersions(projectId, 7);
    setVersions(versionHistory.map(v => ({
      version: v.version,
      timestamp: new Date(v.createdAt).toLocaleString()
    })));
  };
  
  const handleAutoSave = () => {
    const projectId = useProjectStore.getState().currentProject?.id;
    if (!projectId || !parsedContent) return;
    
    saveStageData(projectId, 7, {
      content: JSON.stringify(parsedContent),
      questions: questions.map(q => q.text),
      isAutoSave: true
    });
    
    setSavedIndicator(true);
    setTimeout(() => setSavedIndicator(false), 2000);
  };
  
  const handleGenerate = () => {
    // Prepare context from previous stages
    const prevStageData = {
      stage1: stageData[1]?.content 
        ? (typeof stageData[1].content === 'string' ? JSON.parse(stageData[1].content) : stageData[1].content)
        : null,
      stage2: stageData[2]?.content 
        ? (typeof stageData[2].content === 'string' ? JSON.parse(stageData[2].content) : stageData[2].content)
        : null,
      stage5: stageData[5]?.content 
        ? (typeof stageData[5].content === 'string' ? JSON.parse(stageData[5].content) : stageData[5].content)
        : null,
      stage6: stageData[6]?.content 
        ? (typeof stageData[6].content === 'string' ? JSON.parse(stageData[6].content) : stageData[6].content)
        : null
    };
    
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
        previousStages: prevStageData,
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
    
    const versionData = await useProjectStore.getState().getStageVersion(projectId, 7, version);
    
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
  
  // Task management functions
  const handleAddTask = () => {
    setEditingTask(null);
    setEditingTaskId(null);
    setTaskNameInput('');
    setTaskDescriptionInput('');
    setTaskPhaseInput(parsedContent.phases[0]?.id || '');
    setTaskComplexityInput('Medium');
    setTaskBeginnerTimeInput(30);
    setTaskExperiencedTimeInput(15);
    setTaskFiles([]);
    setTaskDependencies([]);
    setTaskEvaluatorChecks(['']);
    setTaskOptimizerSuggestions(['']);
    setShowTaskEditor(true);
  };
  
  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setEditingTaskId(task.id);
    setTaskNameInput(task.name);
    setTaskDescriptionInput(task.description);
    setTaskPhaseInput(task.phase);
    setTaskComplexityInput(task.complexity);
    setTaskBeginnerTimeInput(task.estimatedTime.beginner);
    setTaskExperiencedTimeInput(task.estimatedTime.experienced);
    setTaskFiles([...task.files]);
    setTaskDependencies([...task.dependencies]);
    setTaskEvaluatorChecks([...task.evaluatorChecks]);
    setTaskOptimizerSuggestions(task.optimizerSuggestions || ['']);
    setShowTaskEditor(true);
  };
  
  const handleSaveTask = () => {
    if (!taskNameInput.trim()) return;
    
    const newTask: Task = {
      id: editingTaskId || `task-${Date.now()}`,
      name: taskNameInput,
      description: taskDescriptionInput,
      phase: taskPhaseInput,
      dependencies: taskDependencies,
      files: taskFiles,
      estimatedTime: {
        beginner: taskBeginnerTimeInput,
        experienced: taskExperiencedTimeInput
      },
      complexity: taskComplexityInput,
      evaluatorChecks: taskEvaluatorChecks.filter(check => check.trim()),
      optimizerSuggestions: taskOptimizerSuggestions.filter(suggestion => suggestion.trim())
    };
    
    if (editingTaskId) {
      // Update existing task
      setParsedContent({
        ...parsedContent,
        tasks: parsedContent.tasks.map(task => 
          task.id === editingTaskId ? newTask : task
        )
      });
    } else {
      // Add new task
      setParsedContent({
        ...parsedContent,
        tasks: [...parsedContent.tasks, newTask]
      });
    }
    
    setShowTaskEditor(false);
  };
  
  const handleDeleteTask = (taskId: string) => {
    // Remove the task
    setParsedContent({
      ...parsedContent,
      tasks: parsedContent.tasks.filter(task => task.id !== taskId)
    });
    
    // Also remove any dependencies on this task
    const updatedTasks = parsedContent.tasks.map(task => ({
      ...task,
      dependencies: task.dependencies.filter(dep => dep.taskId !== taskId)
    }));
    
    setParsedContent({
      ...parsedContent,
      tasks: updatedTasks
    });
  };
  
  const handleMoveTaskUp = (index: number) => {
    if (index === 0) return;
    
    const newTasks = [...parsedContent.tasks];
    const temp = newTasks[index];
    newTasks[index] = newTasks[index - 1];
    newTasks[index - 1] = temp;
    
    setParsedContent({
      ...parsedContent,
      tasks: newTasks
    });
  };
  
  const handleMoveTaskDown = (index: number) => {
    if (index === parsedContent.tasks.length - 1) return;
    
    const newTasks = [...parsedContent.tasks];
    const temp = newTasks[index];
    newTasks[index] = newTasks[index + 1];
    newTasks[index + 1] = temp;
    
    setParsedContent({
      ...parsedContent,
      tasks: newTasks
    });
  };
  
  // File management functions
  const handleAddFile = () => {
    if (!newFilePath.trim()) return;
    
    // Enforce 15-file limit
    if (taskFiles.length >= 15) {
      setFileCountWarning(true);
      return;
    }
    
    const newFile: TaskFile = {
      path: newFilePath,
      operation: newFileOperation,
      description: newFileDescription
    };
    
    setTaskFiles([...taskFiles, newFile]);
    setNewFilePath('');
    setNewFileOperation('create');
    setNewFileDescription('');
  };
  
  const handleRemoveFile = (index: number) => {
    const newFiles = [...taskFiles];
    newFiles.splice(index, 1);
    setTaskFiles(newFiles);
    setFileCountWarning(false);
  };
  
  // Dependency management functions
  const handleAddDependency = () => {
    if (!selectedDependencyId) return;
    
    // Check if dependency already exists
    if (taskDependencies.some(dep => dep.taskId === selectedDependencyId)) {
      return;
    }
    
    const newDependency: TaskDependency = {
      taskId: selectedDependencyId,
      type: selectedDependencyType
    };
    
    setTaskDependencies([...taskDependencies, newDependency]);
    setSelectedDependencyId('');
  };
  
  const handleRemoveDependency = (index: number) => {
    const newDependencies = [...taskDependencies];
    newDependencies.splice(index, 1);
    setTaskDependencies(newDependencies);
  };
  
  // Evaluator checks management
  const handleAddEvaluatorCheck = () => {
    setTaskEvaluatorChecks([...taskEvaluatorChecks, '']);
  };
  
  const handleChangeEvaluatorCheck = (index: number, value: string) => {
    const newChecks = [...taskEvaluatorChecks];
    newChecks[index] = value;
    setTaskEvaluatorChecks(newChecks);
  };
  
  const handleRemoveEvaluatorCheck = (index: number) => {
    const newChecks = [...taskEvaluatorChecks];
    newChecks.splice(index, 1);
    setTaskEvaluatorChecks(newChecks);
  };
  
  // Optimizer suggestions management
  const handleAddOptimizerSuggestion = () => {
    setTaskOptimizerSuggestions([...taskOptimizerSuggestions, '']);
  };
  
  const handleChangeOptimizerSuggestion = (index: number, value: string) => {
    const newSuggestions = [...taskOptimizerSuggestions];
    newSuggestions[index] = value;
    setTaskOptimizerSuggestions(newSuggestions);
  };
  
  const handleRemoveOptimizerSuggestion = (index: number) => {
    const newSuggestions = [...taskOptimizerSuggestions];
    newSuggestions.splice(index, 1);
    setTaskOptimizerSuggestions(newSuggestions);
  };
  
  // Phase management functions
  const handleAddPhase = () => {
    setEditingPhase(null);
    setPhaseNameInput('');
    setPhaseDescriptionInput('');
    setPhaseOrderInput(parsedContent.phases.length + 1);
    setShowPhaseEditor(true);
  };
  
  const handleEditPhase = (phase: Phase) => {
    setEditingPhase(phase);
    setPhaseNameInput(phase.name);
    setPhaseDescriptionInput(phase.description);
    setPhaseOrderInput(phase.order);
    setShowPhaseEditor(true);
  };
  
  const handleSavePhase = () => {
    if (!phaseNameInput.trim()) return;
    
    const newPhase: Phase = {
      id: editingPhase?.id || `phase-${Date.now()}`,
      name: phaseNameInput,
      description: phaseDescriptionInput,
      order: phaseOrderInput
    };
    
    if (editingPhase) {
      // Update existing phase
      setParsedContent({
        ...parsedContent,
        phases: parsedContent.phases.map(phase => 
          phase.id === editingPhase.id ? newPhase : phase
        )
      });
    } else {
      // Add new phase
      setParsedContent({
        ...parsedContent,
        phases: [...parsedContent.phases, newPhase]
      });
    }
    
    setShowPhaseEditor(false);
  };
  
  const handleDeletePhase = (phaseId: string) => {
    // Check if there are tasks using this phase
    const tasksUsingPhase = parsedContent.tasks.filter(task => task.phase === phaseId);
    
    if (tasksUsingPhase.length > 0) {
      alert(`Cannot delete phase: ${tasksUsingPhase.length} tasks are using this phase.`);
      return;
    }
    
    setParsedContent({
      ...parsedContent,
      phases: parsedContent.phases.filter(phase => phase.id !== phaseId)
    });
  };
  
  // Get filtered and sorted tasks
  const getFilteredTasks = () => {
    let filteredTasks = [...parsedContent.tasks];
    
    // Apply phase filter
    if (phaseFilter !== 'all') {
      filteredTasks = filteredTasks.filter(task => task.phase === phaseFilter);
    }
    
    // Apply complexity filter
    if (complexityFilter !== 'all') {
      filteredTasks = filteredTasks.filter(task => task.complexity === complexityFilter);
    }
    
    // Apply sorting
    switch (sortBy) {
      case 'phase':
        filteredTasks.sort((a, b) => {
          const phaseA = parsedContent.phases.find(p => p.id === a.phase);
          const phaseB = parsedContent.phases.find(p => p.id === b.phase);
          return (phaseA?.order || 0) - (phaseB?.order || 0);
        });
        break;
      case 'name':
        filteredTasks.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'complexity':
        const complexityOrder = { 'Low': 0, 'Medium': 1, 'High': 2 };
        filteredTasks.sort((a, b) => complexityOrder[a.complexity] - complexityOrder[b.complexity]);
        break;
      case 'time':
        filteredTasks.sort((a, b) => a.estimatedTime.experienced - b.estimatedTime.experienced);
        break;
      case 'files':
        filteredTasks.sort((a, b) => a.files.length - b.files.length);
        break;
      default:
        break;
    }
    
    return filteredTasks;
  };
  
  // Get task by ID
  const getTaskById = (taskId: string) => {
    return parsedContent.tasks.find(task => task.id === taskId);
  };
  
  // Get phase by ID
  const getPhaseById = (phaseId: string) => {
    return parsedContent.phases.find(phase => phase.id === phaseId);
  };
  
  // Check if all previous stages are complete
  const arePreviousStagesComplete = () => {
    return stageData[5]?.isAccepted && stageData[6]?.isAccepted;
  };
  
  // Render task list
  const renderTaskList = () => {
    const filteredTasks = getFilteredTasks();
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Select value={phaseFilter} onValueChange={setPhaseFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by phase" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Phases</SelectItem>
                {parsedContent.phases.map(phase => (
                  <SelectItem key={phase.id} value={phase.id}>{phase.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={complexityFilter} onValueChange={setComplexityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by complexity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Complexity</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="phase">Sort by Phase</SelectItem>
                <SelectItem value="name">Sort by Name</SelectItem>
                <SelectItem value="complexity">Sort by Complexity</SelectItem>
                <SelectItem value="time">Sort by Time</SelectItem>
                <SelectItem value="files">Sort by File Count</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button onClick={handleAddTask}>Add Task</Button>
        </div>
        
        <div className="space-y-2">
          {filteredTasks.map((task, index) => {
            const phase = getPhaseById(task.phase);
            
            return (
              <Card key={task.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{task.name}</h3>
                      <Badge 
                        className={
                          task.complexity === 'Low' 
                            ? 'bg-green-50 text-green-700' 
                            : task.complexity === 'Medium'
                              ? 'bg-yellow-50 text-yellow-700'
                              : 'bg-red-50 text-red-700'
                        }
                      >
                        {task.complexity}
                      </Badge>
                      {phase && (
                        <Badge className="bg-blue-50 text-blue-700">
                          {phase.name}
                        </Badge>
                      )}
                      <Badge className="flex items-center gap-1 bg-purple-50 text-purple-700">
                        <FileCode className="h-3 w-3" />
                        {task.files.length} {task.files.length === 1 ? 'file' : 'files'}
                      </Badge>
                      <Badge className="flex items-center gap-1 bg-gray-50 text-gray-700">
                        <Clock className="h-3 w-3" />
                        {task.estimatedTime.beginner}-{task.estimatedTime.experienced} min
                      </Badge>
                    </div>
                    <p className="text-gray-700 mt-1">{task.description}</p>
                    
                    {task.dependencies.length > 0 && (
                      <div className="mt-2">
                        <span className="text-sm font-medium">Dependencies:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {task.dependencies.map((dep, i) => {
                            const depTask = getTaskById(dep.taskId);
                            return (
                              <Badge 
                                key={i} 
                                className={
                                  dep.type === 'hard' 
                                    ? 'bg-red-50 text-red-700' 
                                    : 'bg-orange-50 text-orange-700'
                                }
                              >
                                {depTask?.name || 'Unknown'} ({dep.type})
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {task.files.length > 0 && (
                      <div className="mt-2">
                        <span className="text-sm font-medium">Files ({task.files.length}/15):</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {task.files.slice(0, 3).map((file, i) => (
                            <Badge 
                              key={i} 
                              className={
                                file.operation === 'create' 
                                  ? 'bg-green-50 text-green-700' 
                                  : file.operation === 'modify'
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'bg-red-50 text-red-700'
                              }
                            >
                              {file.operation}: {file.path.split('/').pop()}
                            </Badge>
                          ))}
                          {task.files.length > 3 && (
                            <Badge className="bg-gray-50 text-gray-700">
                              +{task.files.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {task.files.length > 15 && (
                      <div className="mt-2">
                        <Badge className="bg-red-50 text-red-700">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Exceeds 15-file limit
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEditTask(task)}
                    >
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleMoveTaskUp(index)}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleMoveTaskDown(index)}
                      disabled={index === filteredTasks.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-red-600"
                      onClick={() => handleDeleteTask(task.id)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
          
          {filteredTasks.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No tasks found. Add a task or change filters.
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Render task editor
  const renderTaskEditor = () => {
    return (
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">
          {editingTask ? 'Edit Task' : 'Add Task'}
        </h3>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="taskName">Task Name</Label>
            <Input
              id="taskName"
              value={taskNameInput}
              onChange={(e) => setTaskNameInput(e.target.value)}
              placeholder="Enter task name"
            />
          </div>
          
          <div>
            <Label htmlFor="taskDescription">Description</Label>
            <Textarea
              id="taskDescription"
              value={taskDescriptionInput}
              onChange={(e) => setTaskDescriptionInput(e.target.value)}
              placeholder="Describe what this task accomplishes"
              rows={3}
            />
          </div>
          
          <div>
            <Label htmlFor="taskPhase">Phase</Label>
            <Select value={taskPhaseInput} onValueChange={setTaskPhaseInput}>
              <SelectTrigger>
                <SelectValue placeholder="Select phase" />
              </SelectTrigger>
              <SelectContent>
                {parsedContent.phases.map(phase => (
                  <SelectItem key={phase.id} value={phase.id}>{phase.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="taskComplexity">Complexity</Label>
              <Select 
                value={taskComplexityInput} 
                onValueChange={(value) => setTaskComplexityInput(value as 'Low' | 'Medium' | 'High')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select complexity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="beginnerTime">Beginner (min)</Label>
                <Input
                  id="beginnerTime"
                  type="number"
                  min="1"
                  value={taskBeginnerTimeInput}
                  onChange={(e) => setTaskBeginnerTimeInput(parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="experiencedTime">Experienced (min)</Label>
                <Input
                  id="experiencedTime"
                  type="number"
                  min="1"
                  value={taskExperiencedTimeInput}
                  onChange={(e) => setTaskExperiencedTimeInput(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Files (Max 15)</Label>
              {fileCountWarning && (
                <Badge className="bg-red-50 text-red-700">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  15-file limit reached
                </Badge>
              )}
            </div>
            
            <div className="space-y-2 mb-4">
              {taskFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Badge 
                    className={
                      file.operation === 'create' 
                        ? 'bg-green-50 text-green-700' 
                        : file.operation === 'modify'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-red-50 text-red-700'
                    }
                  >
                    {file.operation}
                  </Badge>
                  <span className="flex-1 truncate">{file.path}</span>
                  {file.description && (
                    <span className="text-gray-500 truncate max-w-[200px]">{file.description}</span>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleRemoveFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label htmlFor="filePath">File Path</Label>
                <Input
                  id="filePath"
                  value={newFilePath}
                  onChange={(e) => setNewFilePath(e.target.value)}
                  placeholder="src/components/Example.tsx"
                  disabled={taskFiles.length >= 15}
                />
              </div>
              <div>
                <Label htmlFor="fileOperation">Operation</Label>
                <Select 
                  value={newFileOperation} 
                  onValueChange={(value) => setNewFileOperation(value as 'create' | 'modify' | 'delete')}
                  disabled={taskFiles.length >= 15}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="create">Create</SelectItem>
                    <SelectItem value="modify">Modify</SelectItem>
                    <SelectItem value="delete">Delete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label htmlFor="fileDescription">Description (Optional)</Label>
                <Input
                  id="fileDescription"
                  value={newFileDescription}
                  onChange={(e) => setNewFileDescription(e.target.value)}
                  placeholder="What changes are made"
                  disabled={taskFiles.length >= 15}
                />
              </div>
              <Button 
                onClick={handleAddFile}
                disabled={!newFilePath.trim() || taskFiles.length >= 15}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div>
            <Label>Dependencies</Label>
            <div className="space-y-2 mb-4">
              {taskDependencies.map((dep, index) => {
                const depTask = getTaskById(dep.taskId);
                return (
                  <div key={index} className="flex items-center gap-2">
                    <Badge 
                      className={
                        dep.type === 'hard' 
                          ? 'bg-red-50 text-red-700' 
                          : 'bg-orange-50 text-orange-700'
                      }
                    >
                      {dep.type}
                    </Badge>
                    <span className="flex-1">{depTask?.name || 'Unknown task'}</span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleRemoveDependency(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
            
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label htmlFor="dependencyTask">Depends On</Label>
                <Select 
                  value={selectedDependencyId} 
                  onValueChange={setSelectedDependencyId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select task" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTasks.map(task => (
                      <SelectItem key={task.id} value={task.id}>{task.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dependencyType">Type</Label>
                <Select 
                  value={selectedDependencyType} 
                  onValueChange={(value) => setSelectedDependencyType(value as 'hard' | 'soft')}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hard">Hard (Blocking)</SelectItem>
                    <SelectItem value="soft">Soft (Recommended)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleAddDependency}
                disabled={!selectedDependencyId}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div>
            <Label>Evaluator Checks</Label>
            <div className="space-y-2 mb-2">
              {taskEvaluatorChecks.map((check, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={check}
                    onChange={(e) => handleChangeEvaluatorCheck(index, e.target.value)}
                    placeholder="What to verify after implementation"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleRemoveEvaluatorCheck(index)}
                    disabled={taskEvaluatorChecks.length <= 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleAddEvaluatorCheck}
            >
              Add Evaluator Check
            </Button>
          </div>
          
          <div>
            <Label>Optimizer Suggestions</Label>
            <div className="space-y-2 mb-2">
              {taskOptimizerSuggestions.map((suggestion, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={suggestion}
                    onChange={(e) => handleChangeOptimizerSuggestion(index, e.target.value)}
                    placeholder="Potential optimizations to consider"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleRemoveOptimizerSuggestion(index)}
                    disabled={taskOptimizerSuggestions.length <= 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleAddOptimizerSuggestion}
            >
              Add Optimizer Suggestion
            </Button>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button 
              variant="outline"
              onClick={() => setShowTaskEditor(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveTask}>
              {editingTask ? 'Update Task' : 'Add Task'}
            </Button>
          </div>
        </div>
      </Card>
    );
  };
  
  // Render phase editor
  const renderPhaseEditor = () => {
    return (
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">
          {editingPhase ? 'Edit Phase' : 'Add Phase'}
        </h3>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="phaseName">Phase Name</Label>
            <Input
              id="phaseName"
              value={phaseNameInput}
              onChange={(e) => setPhaseNameInput(e.target.value)}
              placeholder="Enter phase name"
            />
          </div>
          
          <div>
            <Label htmlFor="phaseDescription">Description</Label>
            <Textarea
              id="phaseDescription"
              value={phaseDescriptionInput}
              onChange={(e) => setPhaseDescriptionInput(e.target.value)}
              placeholder="Describe this phase"
              rows={3}
            />
          </div>
          
          <div>
            <Label htmlFor="phaseOrder">Order</Label>
            <Input
              id="phaseOrder"
              type="number"
              min="1"
              value={phaseOrderInput}
              onChange={(e) => setPhaseOrderInput(parseInt(e.target.value) || 0)}
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button 
              variant="outline"
              onClick={() => setShowPhaseEditor(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSavePhase}>
              {editingPhase ? 'Update Phase' : 'Add Phase'}
            </Button>
          </div>
        </div>
      </Card>
    );
  };
  
  // Render phase list
  const renderPhaseList = () => {
    // Sort phases by order
    const sortedPhases = [...parsedContent.phases].sort((a, b) => a.order - b.order);
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold">Implementation Phases</h3>
          <Button onClick={handleAddPhase}>Add Phase</Button>
        </div>
        
        <div className="space-y-2">
          {sortedPhases.map((phase) => {
            const tasksInPhase = parsedContent.tasks.filter(task => task.phase === phase.id);
            
            return (
              <Card key={phase.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{phase.name}</h3>
                      <Badge className="bg-blue-50 text-blue-700">
                        Order: {phase.order}
                      </Badge>
                      <Badge className="bg-purple-50 text-purple-700">
                        {tasksInPhase.length} {tasksInPhase.length === 1 ? 'task' : 'tasks'}
                      </Badge>
                    </div>
                    <p className="text-gray-700 mt-1">{phase.description}</p>
                  </div>
                  
                  <div className="flex gap-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEditPhase(phase)}
                    >
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-red-600"
                      onClick={() => handleDeletePhase(phase.id)}
                      disabled={tasksInPhase.length > 0}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
          
          {sortedPhases.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No phases defined yet. Add a phase to organize your tasks.
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Render dependency graph
  const renderDependencyGraph = () => {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold">Task Dependencies</h3>
          <Button 
            variant="outline"
            onClick={() => setShowDependencyView(!showDependencyView)}
          >
            {showDependencyView ? 'List View' : 'Graph View'}
          </Button>
        </div>
        
        {showDependencyView ? (
          <div className="bg-gray-50 p-4 rounded-md overflow-x-auto">
            <div className="min-w-[800px] min-h-[400px]">
              {/* Simple dependency visualization */}
              {parsedContent.tasks.map(task => {
                const phase = getPhaseById(task.phase);
                const dependsOn = task.dependencies.map(dep => getTaskById(dep.taskId)).filter(Boolean);
                
                return (
                  <div key={task.id} className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge 
                        className={
                          task.complexity === 'Low' 
                            ? 'bg-green-50 text-green-700' 
                            : task.complexity === 'Medium'
                              ? 'bg-yellow-50 text-yellow-700'
                              : 'bg-red-50 text-red-700'
                        }
                      >
                        {task.complexity}
                      </Badge>
                      <span className="font-medium">{task.name}</span>
                      {phase && (
                        <Badge className="bg-blue-50 text-blue-700">
                          {phase.name}
                        </Badge>
                      )}
                    </div>
                    
                    {dependsOn.length > 0 && (
                      <div className="ml-8 space-y-2">
                        {dependsOn.map(depTask => {
                          const depType = task.dependencies.find(dep => dep.taskId === depTask?.id)?.type;
                          const depPhase = getPhaseById(depTask?.phase || '');
                          
                          return (
                            <div key={depTask?.id} className="flex items-center gap-2">
                              <ArrowRight className="h-4 w-4 text-gray-400" />
                              <Badge 
                                className={
                                  depType === 'hard' 
                                    ? 'bg-red-50 text-red-700' 
                                    : 'bg-orange-50 text-orange-700'
                                }
                              >
                                {depType}
                              </Badge>
                              <span>{depTask?.name}</span>
                              {depPhase && (
                                <Badge className="bg-blue-50 text-blue-700">
                                  {depPhase.name}
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {parsedContent.tasks.map(task => {
              const dependsOn = task.dependencies.map(dep => getTaskById(dep.taskId)).filter(Boolean);
              const dependedOnBy = parsedContent.tasks.filter(t => 
                t.dependencies.some(dep => dep.taskId === task.id)
              );
              
              if (dependsOn.length === 0 && dependedOnBy.length === 0) {
                return null;
              }
              
              return (
                <Card key={task.id} className="p-4">
                  <h4 className="font-medium text-lg mb-2">{task.name}</h4>
                  
                  {dependsOn.length > 0 && (
                    <div className="mb-3">
                      <span className="text-sm font-medium">Depends on:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {dependsOn.map(depTask => {
                          const depType = task.dependencies.find(dep => dep.taskId === depTask?.id)?.type;
                          
                          return (
                            <Badge 
                              key={depTask?.id}
                              className={
                                depType === 'hard' 
                                  ? 'bg-red-50 text-red-700' 
                                  : 'bg-orange-50 text-orange-700'
                              }
                            >
                              {depTask?.name} ({depType})
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {dependedOnBy.length > 0 && (
                    <div>
                      <span className="text-sm font-medium">Required by:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {dependedOnBy.map(depTask => {
                          const depType = depTask.dependencies.find(dep => dep.taskId === task.id)?.type;
                          
                          return (
                            <Badge 
                              key={depTask.id}
                              className={
                                depType === 'hard' 
                                  ? 'bg-red-50 text-red-700' 
                                  : 'bg-orange-50 text-orange-700'
                              }
                            >
                              {depTask.name} ({depType})
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  };
  
  // Render evaluator-optimizer section
  const renderEvaluatorOptimizer = () => {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold mb-2">Evaluator Criteria</h3>
          <p className="text-gray-700 mb-4">
            These criteria are used to assess the completeness and quality of the implementation.
          </p>
          
          {parsedContent.evaluatorCriteria && parsedContent.evaluatorCriteria.length > 0 ? (
            <div className="space-y-2">
              {parsedContent.evaluatorCriteria.map((criteria, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Checkbox id={`criteria-${index}`} />
                  <Label htmlFor={`criteria-${index}`} className="text-sm">
                    {criteria}
                  </Label>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No evaluator criteria defined yet.</p>
          )}
        </div>
        
        <div>
          <h3 className="text-xl font-semibold mb-2">Optimizer Approach</h3>
          <p className="text-gray-700 mb-4">
            The optimizer approach defines how to refine and improve the implementation after evaluation.
          </p>
          
          {parsedContent.optimizerApproach ? (
            <Card className="p-4 bg-gray-50">
              <p className="whitespace-pre-wrap">{parsedContent.optimizerApproach}</p>
            </Card>
          ) : (
            <p className="text-gray-500">No optimizer approach defined yet.</p>
          )}
        </div>
      </div>
    );
  };
  
  // Render summary statistics
  const renderSummary = () => {
    // Calculate statistics
    const totalTasks = parsedContent.tasks.length;
    const totalFiles = parsedContent.tasks.reduce((sum, task) => sum + task.files.length, 0);
    const tasksExceeding15Files = parsedContent.tasks.filter(task => task.files.length > 15).length;
    const totalBeginnerTime = parsedContent.tasks.reduce((sum, task) => sum + task.estimatedTime.beginner, 0);
    const totalExperiencedTime = parsedContent.tasks.reduce((sum, task) => sum + task.estimatedTime.experienced, 0);
    
    const complexityCounts = {
      Low: parsedContent.tasks.filter(task => task.complexity === 'Low').length,
      Medium: parsedContent.tasks.filter(task => task.complexity === 'Medium').length,
      High: parsedContent.tasks.filter(task => task.complexity === 'High').length
    };
    
    const phaseTaskCounts = parsedContent.phases.map(phase => ({
      name: phase.name,
      count: parsedContent.tasks.filter(task => task.phase === phase.id).length
    }));
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <h4 className="text-sm font-medium text-gray-500">Total Tasks</h4>
            <p className="text-2xl font-bold">{totalTasks}</p>
          </Card>
          
          <Card className="p-4">
            <h4 className="text-sm font-medium text-gray-500">Total Files</h4>
            <p className="text-2xl font-bold">{totalFiles}</p>
          </Card>
          
          <Card className="p-4">
            <h4 className="text-sm font-medium text-gray-500">Estimated Time</h4>
            <p className="text-2xl font-bold">{Math.round(totalExperiencedTime / 60)} - {Math.round(totalBeginnerTime / 60)} hours</p>
          </Card>
          
          <Card className="p-4">
            <h4 className="text-sm font-medium text-gray-500">Tasks Exceeding 15-File Limit</h4>
            <p className="text-2xl font-bold text-red-600">{tasksExceeding15Files}</p>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-4">
            <h4 className="text-lg font-medium mb-4">Complexity Distribution</h4>
            <div className="space-y-2">
              <div className="flex items-center">
                <div className="w-24">Low:</div>
                <div className="flex-1 bg-gray-200 rounded-full h-4">
                  <div 
                    className="bg-green-500 h-4 rounded-full" 
                    style={{ width: `${totalTasks ? (complexityCounts.Low / totalTasks) * 100 : 0}%` }}
                  ></div>
                </div>
                <div className="w-12 text-right">{complexityCounts.Low}</div>
              </div>
              
              <div className="flex items-center">
                <div className="w-24">Medium:</div>
                <div className="flex-1 bg-gray-200 rounded-full h-4">
                  <div 
                    className="bg-yellow-500 h-4 rounded-full" 
                    style={{ width: `${totalTasks ? (complexityCounts.Medium / totalTasks) * 100 : 0}%` }}
                  ></div>
                </div>
                <div className="w-12 text-right">{complexityCounts.Medium}</div>
              </div>
              
              <div className="flex items-center">
                <div className="w-24">High:</div>
                <div className="flex-1 bg-gray-200 rounded-full h-4">
                  <div 
                    className="bg-red-500 h-4 rounded-full" 
                    style={{ width: `${totalTasks ? (complexityCounts.High / totalTasks) * 100 : 0}%` }}
                  ></div>
                </div>
                <div className="w-12 text-right">{complexityCounts.High}</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <h4 className="text-lg font-medium mb-4">Tasks by Phase</h4>
            <div className="space-y-2">
              {phaseTaskCounts.map((phase, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-36 truncate">{phase.name}:</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-blue-500 h-4 rounded-full" 
                      style={{ width: `${totalTasks ? (phase.count / totalTasks) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <div className="w-12 text-right">{phase.count}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Stage 7: Detailed Task-by-Task Plan</h2>
          {savedIndicator && (
            <Badge variant="outline" className="bg-green-100 text-green-800">
              Auto-saved
            </Badge>
          )}
        </div>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="additionalRequirements" className="text-sm font-medium mb-2 block">
              Additional Task Planning Requirements or Preferences
            </Label>
            <Textarea
              id="additionalRequirements"
              value={additionalRequirements}
              onChange={(e) => setAdditionalRequirements(e.target.value)}
              placeholder="Specify any task planning preferences (e.g., 'Start with authentication', 'Group by feature', 'Focus on frontend first')..."
              rows={4}
              className="w-full resize-y"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating || !arePreviousStagesComplete()}
              className="flex items-center"
            >
              {isGenerating ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Generating...
                </>
              ) : (
                'Generate Task Plan'
              )}
            </Button>
            
            {parsedContent.tasks && parsedContent.tasks.length > 0 && (
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
          
          {!arePreviousStagesComplete() && (
            <Alert className="mt-4">
              <AlertTitle>Previous Stages Required</AlertTitle>
              <AlertDescription>
                Please complete Stage 5 (Technical Specification) and Stage 6 (Data Architecture) before generating the task plan.
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
      
      {showTaskEditor ? (
        renderTaskEditor()
      ) : showPhaseEditor ? (
        renderPhaseEditor()
      ) : (
        parsedContent.tasks && parsedContent.tasks.length > 0 && (
          <Card className="p-6" ref={contentRef}>
            <Tabs defaultValue="tasks" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
                <TabsTrigger value="phases">Phases</TabsTrigger>
                <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
                <TabsTrigger value="evaluator">Evaluator-Optimizer</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
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
              
              <TabsContent value="tasks">
                {renderTaskList()}
              </TabsContent>
              
              <TabsContent value="phases">
                {renderPhaseList()}
              </TabsContent>
              
              <TabsContent value="dependencies">
                {renderDependencyGraph()}
              </TabsContent>
              
              <TabsContent value="evaluator">
                {renderEvaluatorOptimizer()}
              </TabsContent>
              
              <TabsContent value="summary">
                {renderSummary()}
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
                  <p className="text-gray-500">No clarifying questions yet. Generate a task plan first.</p>
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
                  <p className="text-gray-500">No version history yet. Save your task plan first.</p>
                )}
              </TabsContent>
              
              <TabsContent value="feedback">
                <div className="space-y-4">
                  <Label htmlFor="feedback" className="text-sm font-medium mb-2 block">
                    Provide feedback to improve the task plan
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
        )
      )}
    </div>
  );
}
