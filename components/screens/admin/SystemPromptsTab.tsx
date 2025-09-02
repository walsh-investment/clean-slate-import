import React, { useState, useEffect } from 'react';
import { Plus, Eye, Copy, Info, Edit, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SystemPrompt {
  id: string;
  name: string;
  feature: string;
  prompt_text: string;
  version: number;
  scope: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const SystemPromptsTab: React.FC = () => {
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    feature: '',
    prompt_text: '',
    scope: 'global'
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        query_text: 'SELECT * FROM app.system_prompts ORDER BY created_at DESC'
      });

      if (error) throw error;
      setPrompts((Array.isArray(data) ? data : []) as unknown as SystemPrompt[]);
    } catch (error) {
      console.error('Error fetching prompts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load system prompts',
        variant: 'destructive'
      });
    }
  };

  const handleCreatePrompt = async () => {
    if (!formData.name || !formData.feature || !formData.prompt_text) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.rpc('exec_sql', {
        query_text: `INSERT INTO app.system_prompts (name, feature, prompt_text, version, scope, active) 
                     VALUES ('${formData.name}', '${formData.feature}', '${formData.prompt_text}', 1, '${formData.scope}', true)`
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'System prompt created successfully'
      });
      
      setFormData({ name: '', feature: '', prompt_text: '', scope: 'global' });
      setIsCreateOpen(false);
      fetchPrompts();
    } catch (error) {
      console.error('Error creating prompt:', error);
      toast({
        title: 'Error',
        description: 'Failed to create system prompt',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePromptStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.rpc('exec_sql', {
        query_text: `UPDATE app.system_prompts SET active = ${!currentStatus} WHERE id = '${id}'`
      });

      if (error) throw error;
      
      fetchPrompts();
      toast({
        title: 'Success',
        description: `Prompt ${!currentStatus ? 'activated' : 'deactivated'}`
      });
    } catch (error) {
      console.error('Error updating prompt:', error);
      toast({
        title: 'Error',
        description: 'Failed to update prompt status',
        variant: 'destructive'
      });
    }
  };

  const deletePrompt = async (id: string) => {
    try {
      const { error } = await supabase.rpc('exec_sql', {
        query_text: `DELETE FROM app.system_prompts WHERE id = '${id}'`
      });

      if (error) throw error;
      
      fetchPrompts();
      toast({
        title: 'Success',
        description: 'Prompt deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting prompt:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete prompt',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Active System Prompts */}
      <Card>
        <CardHeader>
          <CardTitle>Active System Prompts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {prompts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No system prompts found</p>
          ) : (
            prompts.map((prompt) => (
              <div key={prompt.id} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-foreground">{prompt.name}</h3>
                      <Badge variant={prompt.active ? "default" : "secondary"}>
                        {prompt.active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="outline">{prompt.feature}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {prompt.prompt_text}
                    </p>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>Version {prompt.version}</span>
                      <span>Modified {new Date(prompt.updated_at).toLocaleDateString()}</span>
                      <span>Scope: {prompt.scope}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Info className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => togglePromptStatus(prompt.id, prompt.active)}
                    >
                      {prompt.active ? 'Disable' : 'Enable'}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => deletePrompt(prompt.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Create System Prompt */}
      <Card>
        <Collapsible open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                {isCreateOpen ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <Plus className="w-4 h-4" />
                <CardTitle>Create System Prompt</CardTitle>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prompt-title">Prompt Title</Label>
                  <Input
                    id="prompt-title"
                    placeholder="Enter prompt title"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={formData.feature} 
                    onValueChange={(value) => setFormData({ ...formData, feature: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="calendar">Calendar</SelectItem>
                      <SelectItem value="tasks">Tasks</SelectItem>
                      <SelectItem value="chat">Chat</SelectItem>
                      <SelectItem value="notifications">Notifications</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="prompt-content">Prompt Content</Label>
                <Textarea
                  id="prompt-content"
                  placeholder="Enter the system prompt content..."
                  className="min-h-[120px]"
                  value={formData.prompt_text}
                  onChange={(e) => setFormData({ ...formData, prompt_text: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreatePrompt}
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Save Prompt'}
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
};