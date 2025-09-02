import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Bot, Settings, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatHeaderProps {
  isConnected: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ 
  isConnected, 
  isExpanded = true, 
  onToggleExpand 
}) => {
  return (
    <div className="bg-primary/5 border-b-2 border-primary/10 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 ring-2 ring-primary/20">
            <AvatarFallback className="bg-primary text-primary-foreground">
              <Bot className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-bold text-primary">Chat with Niles</h2>
            <p className="text-sm text-primary/70">
              Your intelligent family assistant
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium",
            isConnected 
              ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" 
              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
          )}>
            <div className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-green-500" : "bg-yellow-500"
            )} />
            {isConnected ? 'Online' : 'Connecting...'}
          </div>
          
          <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10">
            <Settings className="h-4 w-4" />
          </Button>
          
          {onToggleExpand && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onToggleExpand}
              className="text-primary hover:bg-primary/10"
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};