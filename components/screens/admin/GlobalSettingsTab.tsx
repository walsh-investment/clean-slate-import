import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export const GlobalSettingsTab: React.FC = () => {
  const [settings, setSettings] = useState({
    maxResponseLength: '2048',
    defaultSystemTone: 'helpful',
    conflictDetectionSensitivity: 'medium',
    proactiveNotifications: true,
    familyContextAwareness: true
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // TODO: Implement global settings save to database
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      toast({
        title: 'Success',
        description: 'Global settings saved successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save global settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Behavior Settings */}
      <Card>
        <CardHeader>
          <CardTitle>AI Behavior Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="max-response">Max Response Length</Label>
              <Select 
                value={settings.maxResponseLength}
                onValueChange={(value) => setSettings({ ...settings, maxResponseLength: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="512">512 tokens</SelectItem>
                  <SelectItem value="1024">1024 tokens</SelectItem>
                  <SelectItem value="2048">2048 tokens</SelectItem>
                  <SelectItem value="4096">4096 tokens</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="system-tone">Default System Tone</Label>
              <Select 
                value={settings.defaultSystemTone}
                onValueChange={(value) => setSettings({ ...settings, defaultSystemTone: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="helpful">Helpful & Friendly</SelectItem>
                  <SelectItem value="formal">Professional</SelectItem>
                  <SelectItem value="casual">Casual & Relaxed</SelectItem>
                  <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="conflict-sensitivity">Conflict Detection Sensitivity</Label>
            <Select 
              value={settings.conflictDetectionSensitivity}
              onValueChange={(value) => setSettings({ ...settings, conflictDetectionSensitivity: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - Only obvious conflicts</SelectItem>
                <SelectItem value="medium">Medium - Balanced detection</SelectItem>
                <SelectItem value="high">High - Detect potential issues</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* System Behaviors */}
      <Card>
        <CardHeader>
          <CardTitle>System Behaviors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="proactive-notifications">Enable Proactive Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Allow the system to send proactive reminders and suggestions
              </p>
            </div>
            <Switch
              id="proactive-notifications"
              checked={settings.proactiveNotifications}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, proactiveNotifications: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="family-context">Family Context Awareness</Label>
              <p className="text-sm text-muted-foreground">
                Use family member preferences and history in responses
              </p>
            </div>
            <Switch
              id="family-context"
              checked={settings.familyContextAwareness}
              onCheckedChange={(checked) => 
                setSettings({ ...settings, familyContextAwareness: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSaveSettings}
          disabled={loading}
          size="lg"
        >
          {loading ? 'Saving...' : 'Save Global Settings'}
        </Button>
      </div>
    </div>
  );
};