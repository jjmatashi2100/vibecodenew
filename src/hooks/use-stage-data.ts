import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { debounce } from '@/lib/utils';
import { prisma } from '@/lib/prisma';

interface StageData {
  id?: string;
  projectId: string;
  stageNumber: number;
  data: any;
  createdAt?: Date;
  updatedAt?: Date;
}

interface Iteration {
  id?: string;
  stageDataId: string;
  prompt: string;
  response: string;
  [key: string]: any; // Allow additional properties for different stages
  createdAt?: Date;
}

interface UseStageDataReturn {
  stageData: any;
  isLoading: boolean;
  error: Error | null;
  saveStageData: (data: any) => Promise<void>;
  iterations: Iteration[];
  currentIteration: Iteration | null;
  saveIteration: (data: any) => Promise<void>;
  previousStages: Record<string, any>;
}

/**
 * Custom hook for managing stage data, iterations, and database interactions
 * @param stageNumber The current stage number (1-8)
 * @param projectId The ID of the current project
 * @returns Object with stage data, iterations, and functions for saving data
 */
export function useStageData(stageNumber: number, projectId: string): UseStageDataReturn {
  const [stageData, setStageData] = useState<any>(null);
  const [iterations, setIterations] = useState<Iteration[]>([]);
  const [currentIteration, setCurrentIteration] = useState<Iteration | null>(null);
  const [previousStages, setPreviousStages] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();
  
  // Reference to the latest stage data for debounced functions
  const stageDataRef = useRef<any>(null);
  
  // Update ref when state changes
  useEffect(() => {
    stageDataRef.current = stageData;
  }, [stageData]);
  
  // Load stage data and iterations from the database
  useEffect(() => {
    const loadStageData = async () => {
      if (!projectId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch stage data
        const data = await window.electron.invoke('stage-data:get', {
          projectId,
          stageNumber
        });
        
        if (data) {
          setStageData(data.data || {});
          
          // Fetch iterations for this stage data
          const iterationsData = await window.electron.invoke('iteration:getAll', {
            stageDataId: data.id
          });
          
          setIterations(iterationsData || []);
          
          // Set current iteration to the most recent one
          if (iterationsData && iterationsData.length > 0) {
            setCurrentIteration(iterationsData[0]);
          }
        } else {
          // Create new stage data if it doesn't exist
          const newStageData = {
            projectId,
            stageNumber,
            data: {}
          };
          
          const createdData = await window.electron.invoke('stage-data:create', newStageData);
          setStageData(createdData.data || {});
        }
        
        // Load data from previous stages
        const prevStages: Record<string, any> = {};
        
        for (let i = 1; i < stageNumber; i++) {
          const prevData = await window.electron.invoke('stage-data:get', {
            projectId,
            stageNumber: i
          });
          
          if (prevData) {
            prevStages[`stage${i}`] = prevData.data;
          }
        }
        
        setPreviousStages(prevStages);
      } catch (err) {
        console.error('Error loading stage data:', err);
        setError(err instanceof Error ? err : new Error('Failed to load stage data'));
        toast({
          title: 'Error',
          description: 'Failed to load stage data',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadStageData();
  }, [projectId, stageNumber, toast]);
  
  // Debounced save function to prevent excessive database writes
  const debouncedSave = useCallback(
    debounce(async (data: any) => {
      if (!projectId) return;
      
      try {
        await window.electron.invoke('stage-data:update', {
          projectId,
          stageNumber,
          data
        });
      } catch (err) {
        console.error('Error saving stage data:', err);
        toast({
          title: 'Error',
          description: 'Failed to save stage data',
          variant: 'destructive'
        });
      }
    }, 1000),
    [projectId, stageNumber, toast]
  );
  
  // Save stage data
  const saveStageData = useCallback(
    async (data: any) => {
      // Merge with existing data
      const updatedData = {
        ...stageDataRef.current,
        ...data
      };
      
      // Update local state immediately
      setStageData(updatedData);
      
      // Save to database with debounce
      debouncedSave(updatedData);
    },
    [debouncedSave]
  );
  
  // Save a new iteration
  const saveIteration = useCallback(
    async (data: any) => {
      if (!projectId) return;
      
      try {
        // Get the current stage data ID
        const currentStageData = await window.electron.invoke('stage-data:get', {
          projectId,
          stageNumber
        });
        
        if (!currentStageData || !currentStageData.id) {
          throw new Error('Stage data not found');
        }
        
        // Create a new iteration
        const newIteration = {
          stageDataId: currentStageData.id,
          ...data,
          createdAt: new Date()
        };
        
        const createdIteration = await window.electron.invoke('iteration:create', newIteration);
        
        // Update local state
        setIterations(prev => [createdIteration, ...prev]);
        setCurrentIteration(createdIteration);
        
        return createdIteration;
      } catch (err) {
        console.error('Error saving iteration:', err);
        toast({
          title: 'Error',
          description: 'Failed to save iteration',
          variant: 'destructive'
        });
        throw err;
      }
    },
    [projectId, stageNumber, toast]
  );
  
  return {
    stageData,
    isLoading,
    error,
    saveStageData,
    iterations,
    currentIteration,
    saveIteration,
    previousStages
  };
}

export default useStageData;
