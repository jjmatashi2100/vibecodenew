import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Image as ImageIcon, X, Upload, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useStageData } from '@/hooks/use-stage-data';
import { useLLM } from '@/hooks/use-llm';
import { stage4Prompt } from '@/prompts/stages/stage4';
import { Spinner } from '@/components/ui/spinner';

const MAX_IMAGES = 6;
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

interface StyleGuideImage {
  id: string;
  file: File;
  preview: string;
  base64: string;
}

export default function Stage4StyleGuide() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { stageData, previousStages, saveStageData, iterations, currentIteration, saveIteration } = useStageData(4, projectId as string);
  const { llmService, isGenerating, generate, availableModels, currentModel, setModel } = useLLM();
  
  const [activeTab, setActiveTab] = useState('editor');
  const [designPreferences, setDesignPreferences] = useState(stageData?.designPreferences || '');
  const [styleGuideImages, setStyleGuideImages] = useState<StyleGuideImage[]>([]);
  const [response, setResponse] = useState(stageData?.response || '');
  const [isVisionSupported, setIsVisionSupported] = useState(false);
  const [visionModels, setVisionModels] = useState<any[]>([]);
  const [isCheckingCapabilities, setIsCheckingCapabilities] = useState(true);
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Check if current model supports vision
  useEffect(() => {
    const checkVisionSupport = async () => {
      if (llmService) {
        setIsCheckingCapabilities(true);
        
        try {
          // Check if current model supports vision
          const supportsVision = llmService.currentModelSupportsVision();
          setIsVisionSupported(supportsVision);
          
          // Get all models that support vision
          const visionCapableModels = await llmService.getVisionCapableModels();
          setVisionModels(visionCapableModels);
        } catch (error) {
          console.error('Failed to check vision support:', error);
          setIsVisionSupported(false);
        } finally {
          setIsCheckingCapabilities(false);
        }
      }
    };
    
    checkVisionSupport();
  }, [llmService, currentModel]);
  
  // Auto-save when design preferences change
  useEffect(() => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }
    
    if (designPreferences) {
      const timer = setTimeout(() => {
        handleSave();
      }, 2000);
      
      setAutoSaveTimer(timer);
    }
    
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [designPreferences]);
  
  // Load existing data
  useEffect(() => {
    if (stageData) {
      setDesignPreferences(stageData.designPreferences || '');
      setResponse(stageData.response || '');
      
      // Load images if they exist
      if (stageData.styleGuideImages && Array.isArray(stageData.styleGuideImages)) {
        try {
          setStyleGuideImages(stageData.styleGuideImages);
        } catch (error) {
          console.error('Failed to parse style guide images:', error);
        }
      }
    }
  }, [stageData]);
  
  const handleSave = async () => {
    await saveStageData({
      designPreferences,
      styleGuideImages,
      response,
    });
    
    toast({
      title: 'Progress saved',
      description: 'Your style guide preferences have been saved.',
    });
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Check if adding these files would exceed the limit
    if (styleGuideImages.length + files.length > MAX_IMAGES) {
      toast({
        title: 'Too many images',
        description: `You can only upload up to ${MAX_IMAGES} images. Please remove some images first.`,
        variant: 'destructive',
      });
      return;
    }
    
    const newImages: StyleGuideImage[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast({
          title: 'Invalid file type',
          description: `${file.name} is not a supported image type. Please upload JPG, PNG, WebP, or GIF.`,
          variant: 'destructive',
        });
        continue;
      }
      
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'File too large',
          description: `${file.name} exceeds the 4MB size limit.`,
          variant: 'destructive',
        });
        continue;
      }
      
      try {
        // Create preview URL
        const preview = URL.createObjectURL(file);
        
        // Convert to base64
        const base64 = await convertFileToBase64(file);
        
        newImages.push({
          id: `image-${Date.now()}-${i}`,
          file,
          preview,
          base64,
        });
      } catch (error) {
        console.error('Failed to process image:', error);
        toast({
          title: 'Failed to process image',
          description: `Could not process ${file.name}. Please try again.`,
          variant: 'destructive',
        });
      }
    }
    
    setStyleGuideImages([...styleGuideImages, ...newImages]);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };
  
  const removeImage = (id: string) => {
    setStyleGuideImages(styleGuideImages.filter(image => image.id !== id));
  };
  
  const handleModelChange = (modelId: string) => {
    setModel(modelId);
  };
  
  const handleSubmit = async () => {
    if (!designPreferences.trim()) {
      toast({
        title: 'Design preferences required',
        description: 'Please enter your design preferences before generating the style guide.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // Create prompt using the stage4Prompt template
      const prompt = stage4Prompt(previousStages, designPreferences);
      
      // Generate options
      const options: any = {
        temperature: 0.7,
        maxTokens: 4000,
      };
      
      // Add images if supported and available
      if (isVisionSupported && styleGuideImages.length > 0) {
        options.images = styleGuideImages.map(img => img.base64);
      }
      
      // Generate response
      const result = await generate(prompt, options);
      
      // Update response
      setResponse(result);
      
      // Save iteration
      await saveIteration({
        prompt,
        response: result,
        designPreferences,
        styleGuideImages: styleGuideImages.length > 0 ? styleGuideImages : undefined,
      });
      
      // Save stage data
      await saveStageData({
        designPreferences,
        styleGuideImages,
        response: result,
      });
      
      // Switch to output tab
      setActiveTab('output');
      
      toast({
        title: 'Style guide generated',
        description: 'Your style guide has been successfully generated.',
      });
    } catch (error) {
      console.error('Failed to generate style guide:', error);
      toast({
        title: 'Generation failed',
        description: 'Failed to generate style guide. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Style Guides and State Designs</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="output">Output</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="editor">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Design Preferences</CardTitle>
                <CardDescription>
                  Describe your design preferences, brand guidelines, and aesthetic direction.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Enter your design preferences, color preferences, typography guidelines, etc."
                  value={designPreferences}
                  onChange={(e) => setDesignPreferences(e.target.value)}
                  className="min-h-[200px]"
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Style Guide Images</CardTitle>
                <CardDescription>
                  Upload up to 6 images that represent your desired style and design direction.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isCheckingCapabilities ? (
                  <div className="flex items-center justify-center p-6">
                    <Spinner className="mr-2" />
                    <span>Checking LLM capabilities...</span>
                  </div>
                ) : !isVisionSupported ? (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Vision not supported</AlertTitle>
                    <AlertDescription>
                      The current LLM model does not support image processing. Please select a vision-capable model.
                      
                      {visionModels.length > 0 ? (
                        <div className="mt-2">
                          <Label htmlFor="vision-model">Select a vision-capable model:</Label>
                          <select
                            id="vision-model"
                            className="w-full p-2 mt-1 border rounded"
                            onChange={(e) => handleModelChange(e.target.value)}
                          >
                            <option value="">-- Select a model --</option>
                            {visionModels.map((model) => (
                              <option key={model.id} value={model.id}>
                                {model.name} ({model.provider})
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <p className="mt-2">
                          No vision-capable models are available. Please install a vision-capable model like LLaVA in Ollama.
                        </p>
                      )}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                      {styleGuideImages.map((image) => (
                        <div key={image.id} className="relative group">
                          <img
                            src={image.preview}
                            alt="Style guide reference"
                            className="w-full h-32 object-cover rounded border"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(image.id)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      
                      {styleGuideImages.length < MAX_IMAGES && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full h-32 border-2 border-dashed rounded flex flex-col items-center justify-center text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
                        >
                          <Upload className="h-8 w-8 mb-2" />
                          <span>Upload Image</span>
                        </button>
                      )}
                    </div>
                    
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      multiple
                      className="hidden"
                    />
                    
                    <div className="text-sm text-gray-500">
                      {styleGuideImages.length} of {MAX_IMAGES} images uploaded. Supported formats: JPG, PNG, WebP, GIF. Max size: 4MB per image.
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="flex justify-end mt-6 space-x-4">
            <Button variant="outline" onClick={handleSave}>
              Save Progress
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isGenerating || !designPreferences.trim() || (styleGuideImages.length > 0 && !isVisionSupported)}
            >
              {isGenerating ? (
                <>
                  <Spinner className="mr-2" />
                  Generating...
                </>
              ) : (
                'Generate Style Guide'
              )}
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="output">
          <Card>
            <CardHeader>
              <CardTitle>Style Guide</CardTitle>
              <CardDescription>
                The generated style guide based on your preferences and reference images.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {response ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div dangerouslySetInnerHTML={{ __html: response.replace(/\n/g, '<br />') }} />
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <ImageIcon className="h-12 w-12 mx-auto mb-4" />
                  <p>No style guide generated yet. Go to the Editor tab to create one.</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setActiveTab('editor')}>
                Back to Editor
              </Button>
              <Button onClick={handleSave}>
                <Check className="mr-2 h-4 w-4" />
                Save Style Guide
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Version History</CardTitle>
              <CardDescription>
                Previous iterations of your style guide.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {iterations.length > 0 ? (
                <div className="space-y-4">
                  {iterations.map((iteration, index) => (
                    <div key={iteration.id} className="border rounded p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-medium">Version {iterations.length - index}</h3>
                        <span className="text-sm text-gray-500">
                          {new Date(iteration.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="prose prose-sm max-w-none dark:prose-invert line-clamp-3">
                        <div dangerouslySetInnerHTML={{ __html: iteration.response.substring(0, 200).replace(/\n/g, '<br />') + '...' }} />
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => {
                          setResponse(iteration.response);
                          setDesignPreferences(iteration.designPreferences || '');
                          setActiveTab('output');
                        }}
                      >
                        View Full Version
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>No previous versions found.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
