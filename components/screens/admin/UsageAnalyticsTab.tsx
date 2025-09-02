import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart3, TrendingUp, Users, MessageCircle } from 'lucide-react';

export const UsageAnalyticsTab: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Analytics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <MessageCircle className="w-8 h-8 text-primary mb-2" />
            <div className="text-2xl font-bold text-foreground">1,247</div>
            <div className="text-sm text-muted-foreground">Total Prompts Used</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Users className="w-8 h-8 text-primary mb-2" />
            <div className="text-2xl font-bold text-foreground">8</div>
            <div className="text-sm text-muted-foreground">Active Users</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <TrendingUp className="w-8 h-8 text-primary mb-2" />
            <div className="text-2xl font-bold text-foreground">23%</div>
            <div className="text-sm text-muted-foreground">Usage Growth</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <BarChart3 className="w-8 h-8 text-primary mb-2" />
            <div className="text-2xl font-bold text-foreground">94%</div>
            <div className="text-sm text-muted-foreground">Success Rate</div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Analytics Dashboard</p>
              <p className="text-sm">Detailed usage analytics will be displayed here</p>
              <p className="text-xs mt-2">Coming soon...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};