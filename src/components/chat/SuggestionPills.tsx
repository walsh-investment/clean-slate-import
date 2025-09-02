import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SuggestionPillsProps {
  onSuggestionClick: (suggestion: string) => void;
}

const suggestions = [
  "Plan rides for soccer practice",
  "Find schedule conflicts this week",
  "What tasks are due today?",
  "Create a family grocery list",
  "Schedule weekly family meeting",
  "Check upcoming appointments",
  "Organize weekend activities",
  "Plan meal prep schedule"
];

export const SuggestionPills: React.FC<SuggestionPillsProps> = ({ onSuggestionClick }) => {
  return (
    <div className="px-6 py-4 border-b border-border">
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          {suggestions.map((suggestion, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => onSuggestionClick(suggestion)}
              className="whitespace-nowrap text-xs bg-primary/5 border-primary/20 text-primary hover:bg-primary/10 hover:border-primary/40"
            >
              {suggestion}
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};