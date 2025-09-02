import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useHousehold } from '@/contexts/HouseholdContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bot, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { household } = useHousehold();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversation history
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!household?.id) return;

      try {
        const { data, error } = await supabase
          .from('app.messages_log')
          .select('*')
          .eq('household_id', household.id)
          .eq('channel', 'chat')
          .order('created_at', { ascending: true })
          .limit(50);

        if (error) throw error;

        const formattedMessages: Message[] = data?.map(msg => ({
          id: msg.id,
          content: msg.body,
          role: msg.subject === 'user' ? 'user' : 'assistant',
          timestamp: msg.created_at,
        })) || [];

        setMessages(formattedMessages);
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    };

    loadChatHistory();
  }, [household?.id]);

  // Set up real-time subscription
  useEffect(() => {
    if (!household?.id) return;

    const channel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'app',
          table: 'messages_log',
          filter: `household_id=eq.${household.id}`
        },
        (payload) => {
          const newMessage = payload.new as any;
          if (newMessage.channel === 'chat') {
            const message: Message = {
              id: newMessage.id,
              content: newMessage.body,
              role: newMessage.subject === 'user' ? 'user' : 'assistant',
              timestamp: newMessage.created_at,
            };
            setMessages(prev => [...prev, message]);
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [household?.id]);

  const sendMessage = async () => {
    if (!input.trim() || !household?.id || isLoading) return;

    const messageContent = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      // Call the AI chat edge function
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: messageContent,
          householdId: household.id,
          historyLimit: 10
        }
      });

      if (error) throw error;

      // The response and user message are automatically stored in the database
      // by the edge function, so real-time subscription will handle UI updates
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

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground">
              <Bot className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Family Assistant</h2>
            <p className="text-sm text-muted-foreground">
              {isConnected ? 'Connected' : 'Connecting...'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-6">
        <div className="py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Hi! I'm your family assistant
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                I can help you manage schedules, create reminders, organize tasks, 
                and answer questions about your family activities.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3 max-w-[80%]",
                  message.role === 'user' ? "ml-auto flex-row-reverse" : ""
                )}
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  {message.role === 'user' ? (
                    <AvatarImage src={user?.user_metadata?.avatar_url} />
                  ) : null}
                  <AvatarFallback 
                    className={message.role === 'user' 
                      ? "bg-secondary text-secondary-foreground" 
                      : "bg-primary text-primary-foreground"
                    }
                  >
                    {message.role === 'user' ? user?.user_metadata?.display_name?.[0] || 'U' : <Bot className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                
                <Card className={cn(
                  "px-4 py-3",
                  message.role === 'user' 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted"
                )}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className={cn(
                    "text-xs mt-2",
                    message.role === 'user' 
                      ? "text-primary-foreground/60" 
                      : "text-muted-foreground"
                  )}>
                    {formatTime(message.timestamp)}
                  </p>
                </Card>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex gap-3 max-w-[80%]">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <Card className="bg-muted px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </Card>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border px-6 py-4">
        <div className="flex gap-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask me about schedules, tasks, or anything else..."
            className="min-h-[44px] max-h-32 resize-none"
            disabled={isLoading}
          />
          <Button 
            onClick={sendMessage} 
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-11 w-11"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};