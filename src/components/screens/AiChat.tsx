import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useHousehold } from '@/contexts/HouseholdContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bot, Send, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SuggestionPills } from '@/components/chat/SuggestionPills';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { DashboardOverview } from '@/components/chat/DashboardOverview';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
}

export const AiChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { household } = useHousehold();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversation history using exec_sql
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!household?.id) return;

      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          query_text: `
            SELECT id, body as content, subject as role, created_at as timestamp
            FROM app.messages_log 
            WHERE household_id = '${household.id}' 
              AND channel = 'chat'
            ORDER BY created_at ASC 
            LIMIT 50
          `
        });

        if (error) throw error;

        const formattedMessages: Message[] = Array.isArray(data) ? data.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          role: msg.role === 'user' ? 'user' : 'assistant',
          timestamp: msg.timestamp,
        })) : [];

        setMessages(formattedMessages);
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    };

    loadChatHistory();
  }, [household?.id]);

  // Set up real-time subscription for app.messages_log
  useEffect(() => {
    if (!household?.id) return;

    // Since we can't subscribe to app schema directly, we'll use a fallback approach
    // or implement a trigger to copy messages to a public schema table
    setIsConnected(true); // For now, assume connected

    // TODO: Implement proper real-time subscription when app.messages_log is accessible
    
    return () => {
      // Cleanup if needed
    };
  }, [household?.id]);

  const sendMessage = async (messageContent?: string) => {
    const content = messageContent || input.trim();
    if (!content || !household?.id || isLoading) return;

    setInput('');
    setIsLoading(true);
    setShowSuggestions(false); // Hide suggestions after first message

    // Add user message to UI immediately
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content,
      role: 'user',
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Call the AI chat edge function
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: content,
          householdId: household.id,
          historyLimit: 10
        }
      });

      if (error) throw error;

      // Add AI response to UI
      if (data?.response) {
        const aiMessage: Message = {
          id: `ai-${Date.now()}`,
          content: data.response,
          role: 'assistant',
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message to UI
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        content: 'Sorry, I encountered an error. Please try again.',
        role: 'assistant',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    sendMessage(suggestion);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Enhanced Header */}
      <ChatHeader isConnected={isConnected} />
      
      {/* Suggestion Pills - only show when no messages */}
      {messages.length === 0 && showSuggestions && (
        <SuggestionPills onSuggestionClick={handleSuggestionClick} />
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 px-6">
        <div className="py-6 space-y-6">
          {messages.length === 0 ? (
            <div className="text-center py-16">
              <div className="relative mb-6">
                <Bot className="h-16 w-16 mx-auto text-primary mb-4" />
                <Sparkles className="h-6 w-6 absolute top-0 right-1/2 translate-x-8 text-primary/60" />
              </div>
              <h3 className="text-2xl font-bold text-primary mb-3">
                Hi! I'm Niles
              </h3>
              <p className="text-muted-foreground max-w-lg mx-auto text-lg leading-relaxed">
                Your intelligent family assistant. I can help you manage schedules, create reminders, 
                organize tasks, and answer questions about your family activities.
              </p>
              <div className="mt-8 text-sm text-muted-foreground">
                Try asking me something or click a suggestion above!
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-4 max-w-[85%] animate-fade-in",
                  message.role === 'user' ? "ml-auto flex-row-reverse" : ""
                )}
              >
                <Avatar className="h-10 w-10 flex-shrink-0 ring-2 ring-background shadow-sm">
                  {message.role === 'user' ? (
                    <AvatarImage src={user?.user_metadata?.avatar_url} />
                  ) : null}
                  <AvatarFallback 
                    className={message.role === 'user' 
                      ? "bg-secondary text-secondary-foreground font-semibold" 
                      : "bg-primary text-primary-foreground"
                    }
                  >
                    {message.role === 'user' ? user?.user_metadata?.display_name?.[0] || 'U' : <Bot className="h-5 w-5" />}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex flex-col gap-1">
                  <Card className={cn(
                    "px-5 py-4 shadow-sm border-0",
                    message.role === 'user' 
                      ? "bg-primary text-primary-foreground ml-auto rounded-2xl rounded-tr-md" 
                      : "bg-card border border-border/50 rounded-2xl rounded-tl-md"
                  )}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  </Card>
                  <p className={cn(
                    "text-xs px-2",
                    message.role === 'user' ? "text-right text-muted-foreground" : "text-muted-foreground"
                  )}>
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex gap-4 max-w-[85%] animate-fade-in">
              <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Bot className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <Card className="bg-card border border-border/50 px-5 py-4 rounded-2xl rounded-tl-md shadow-sm">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Niles is thinking...</span>
                </div>
              </Card>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Enhanced Input */}
      <div className="border-t-2 border-primary/10 bg-primary/5 px-6 py-5">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask Niles about schedules, tasks, or anything else..."
              className="min-h-[48px] max-h-32 resize-none border-primary/20 focus:border-primary bg-background rounded-xl px-4 py-3 text-sm"
              disabled={isLoading}
            />
          </div>
          <Button 
            onClick={() => sendMessage()} 
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-12 w-12 rounded-xl bg-primary hover:bg-primary/90 shadow-lg"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
        <p className="text-xs text-primary/70 mt-3 flex items-center gap-2">
          <Sparkles className="h-3 w-3" />
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>

      {/* Dashboard Overview */}
      <DashboardOverview />
    </div>
  );
};