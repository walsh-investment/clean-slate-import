import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Bot, Edit, Trash2, Plus } from 'lucide-react';

export function AiProfileSettings() {
  const [activeView, setActiveView] = useState<'preferences' | 'prompts'>('preferences');
  const [showNewPromptForm, setShowNewPromptForm] = useState(false);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">AI Profile Settings</h3>
          <p className="text-sm text-muted-foreground">
            Customize how your AI assistant interacts with you
          </p>
        </div>
        <Button variant="outline" className="bg-primary/5 border-primary/20 text-primary hover:bg-primary/10">
          <Bot className="w-4 h-4 mr-2" />
          Personal AI Assistant
        </Button>
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant={activeView === 'preferences' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveView('preferences')}
          className={activeView === 'preferences' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}
        >
          AI Preferences
        </Button>
        <Button
          variant={activeView === 'prompts' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveView('prompts')}
          className={activeView === 'prompts' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}
        >
          My Prompts
        </Button>
      </div>

      {/* AI Preferences View */}
      {activeView === 'preferences' && <AiPreferences />}

      {/* My Prompts View */}
      {activeView === 'prompts' && (
        <MyPrompts 
          showNewPromptForm={showNewPromptForm}
          setShowNewPromptForm={setShowNewPromptForm}
        />
      )}
    </div>
  );
}

function AiPreferences() {
  return (
    <div className="space-y-4">
      {/* Communication Style */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Communication Style</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Response Tone</Label>
              <Select defaultValue="friendly">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Response Style</Label>
              <Select defaultValue="conversational">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="concise">Concise & Brief</SelectItem>
                  <SelectItem value="detailed">Detailed</SelectItem>
                  <SelectItem value="conversational">Conversational</SelectItem>
                  <SelectItem value="structured">Structured</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Response Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Response Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Include emojis in responses</Label>
              <p className="text-sm text-muted-foreground">
                Add emojis to make responses more engaging
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Proactive suggestions</Label>
              <p className="text-sm text-muted-foreground">
                Offer helpful suggestions before you ask
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Family context awareness</Label>
              <p className="text-sm text-muted-foreground">
                Use family information to provide better responses
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Personal AI Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal AI Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Custom Instructions</Label>
            <Textarea
              placeholder="Tell your AI assistant how you'd like it to behave. For example: 'Always prioritize family time when suggesting schedules' or 'Remind me about healthy meal options when planning'..."
              className="min-h-[120px] resize-none"
              defaultValue="Always consider our family's busy schedule when making suggestions. We prioritize family time on weekends and prefer quick, healthy meal options during the week."
            />
          </div>
          <Button>Save Instructions</Button>
        </CardContent>
      </Card>
    </div>
  );
}

interface MyPromptsProps {
  showNewPromptForm: boolean;
  setShowNewPromptForm: (show: boolean) => void;
}

function MyPrompts({ showNewPromptForm, setShowNewPromptForm }: MyPromptsProps) {
  const prompts = [
    {
      id: 1,
      title: "Weekly Meal Planning",
      category: "Food",
      content: "Help me plan a week's worth of healthy, family-friendly meals that can be prepared in 30 minutes or less.",
      usageCount: 12,
      isActive: true
    },
    {
      id: 2,
      title: "School Event Coordination",
      category: "Planning",
      content: "Assist with organizing and coordinating school events, including scheduling, communication with other parents, and logistics.",
      usageCount: 8,
      isActive: true
    },
    {
      id: 3,
      title: "Homework Helper Schedule",
      category: "Education",
      content: "Create a structured homework schedule that balances all children's needs and includes break times.",
      usageCount: 15,
      isActive: false
    }
  ];

  return (
    <div className="space-y-4">
      {/* My Stored Prompts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">My Stored Prompts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {prompts.map((prompt) => (
            <div key={prompt.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{prompt.title}</h4>
                    <Badge 
                      variant="secondary"
                      className="text-xs bg-primary/10 text-primary border-primary/20"
                    >
                      {prompt.category}
                    </Badge>
                    {prompt.isActive ? (
                      <Badge variant="default" className="text-xs bg-green-100 text-green-800 border-green-200">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{prompt.content}</p>
                  <p className="text-xs text-muted-foreground">Used {prompt.usageCount} times</p>
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <Button variant="ghost" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Create New Prompt */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create New Prompt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showNewPromptForm ? (
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setShowNewPromptForm(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Prompt
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Prompt Title</Label>
                <Input placeholder="Enter a descriptive title for your prompt" />
              </div>
              
              <div className="space-y-2">
                <Label>Category</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="food">Food</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="transportation">Transportation</SelectItem>
                    <SelectItem value="household">Household</SelectItem>
                    <SelectItem value="activities">Activities</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Prompt Content</Label>
                <Textarea
                  placeholder="Describe what you want the AI to help you with..."
                  className="min-h-[100px] resize-none"
                />
              </div>
              
              <div className="flex gap-2">
                <Button>Save Prompt</Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowNewPromptForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}