import React from 'react';
import { Shield } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SystemPromptsTab } from './admin/SystemPromptsTab';
import { GlobalSettingsTab } from './admin/GlobalSettingsTab';
import { UsageAnalyticsTab } from './admin/UsageAnalyticsTab';

export const AdminPrompts: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">System Prompt Administration</h1>
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
            Admin Access
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Manage system-wide AI prompts and configuration settings for all family members
        </p>
      </div>

      {/* Warning Notice */}
      <Alert className="border-destructive/20 bg-destructive/5">
        <Shield className="w-4 h-4 text-destructive" />
        <AlertDescription className="text-destructive">
          <strong>Important:</strong> Changes made here will affect system behavior for all users. 
          Please review changes carefully before applying.
        </AlertDescription>
      </Alert>

      {/* Tabs */}
      <Tabs defaultValue="system-prompts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="system-prompts">System Prompts</TabsTrigger>
          <TabsTrigger value="global-settings">Global Settings</TabsTrigger>
          <TabsTrigger value="usage-analytics">Usage Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="system-prompts" className="space-y-4">
          <SystemPromptsTab />
        </TabsContent>

        <TabsContent value="global-settings" className="space-y-4">
          <GlobalSettingsTab />
        </TabsContent>

        <TabsContent value="usage-analytics" className="space-y-4">
          <UsageAnalyticsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};