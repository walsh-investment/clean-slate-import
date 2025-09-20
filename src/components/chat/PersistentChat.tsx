import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useHousehold } from '@/contexts/HouseholdContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, Send, Loader2, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SuggestionPills } from './SuggestionPills';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
}

export const PersistentChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
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
        const { data, error } = await supabase.rpc('exec_sql', {
          query_text: `
            SELECT id, body as content, subject as role, created_at as timestamp
            FROM app.messages_log 
            WHERE household_id = '${household.id}'
            ORDER BY created_at ASC
            LIMIT 50
          `
        });

        if (error) throw error;

        const formattedMessages: Message[] = Array.isArray(data) ? data.map((row: any) => ({
          id: row.id || Math.random().toString(),
          content: row.content || '',
          role: row.role === 'user' ? 'user' : 'assistant',
          timestamp: row.timestamp || new Date().toISOString()
        })) : [];

        setMessages(formattedMessages);
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    };

    loadChatHistory();
  }, [household?.id]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading || !household?.id) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageText.trim(),
      role: 'user',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Create assistant message for streaming updates
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      content: '',
      role: 'assistant',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      // Use fetch for SSE streaming with POST data
      const response = await fetch(
        `https://wkhxircgcysdzmofwnbr.functions.supabase.co/ai-chat-stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
          },
          body: JSON.stringify({
            message: messageText.trim(),
            household_id: household.id,
            user_id: user?.id
          })
        }
      );

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response body:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let streamComplete = false;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done || streamComplete) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              console.log('SSE Event received:', data.type, data);
              
              if (data.type === 'connected') {
                console.log('Connected to chat stream');
                setIsConnected(true);
              } else if (data.type === 'content') {
                console.log('Content chunk:', data.content.length, 'chars');
                // Update the assistant message with streaming content
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? { ...msg, content: msg.content + data.content }
                    : msg
                ));
              } else if (data.type === 'done') {
                console.log('Stream completed successfully');
                setIsLoading(false);
                streamComplete = true;
                break;
              } else if (data.type === 'error') {
                console.error('Server error:', data.error);
                throw new Error(data.error);
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError, 'Raw line:', line);
            }
          }
        }
      }

    } catch (error) {
      console.error('Error with streaming request:', error);
      setIsConnected(false);
      
      // Log error to backend error system via RPC
      try {
        await supabase.rpc('exec_sql', {
          query_text: `
            SELECT upsert_error_aggregate(
              'chat_connection_failed',
              'error'::app.error_level,
              'ai_chat_stream',
              'client'::app.error_scope,
              'Chat connection failed: ${error instanceof Error ? error.message.replace(/'/g, "''") : 'Unknown error'}',
              '${error instanceof Error ? (error.stack || '').replace(/'/g, "''") : ''}'
            )
          `
        });
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }
      
      // Update assistant message with error
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { ...msg, content: 'Sorry, I encountered a connection error. Please try again.' }
          : msg
      ));
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
    setInput('');
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="border-b border-border bg-card/50 backdrop-blur-sm">
      {/* Collapsed Header */}
      {!isExpanded && (
        <div className="px-6 py-3 flex items-center justify-between cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setIsExpanded(true)}>
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 ring-2 ring-primary/20">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-primary">Chat with Niles</span>
              <div className={cn(
                "w-2 h-2 rounded-full",
                isConnected ? "bg-green-500" : "bg-yellow-500"
              )} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      )}

      {/* Expanded Chat Interface */}
      {isExpanded && (
        <div className="border-b border-border">
          {/* Expanded Header */}
          <div className="bg-primary/5 border-b border-primary/10 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Bot className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-bold text-primary">Chat with Niles</h2>
                  <p className="text-sm text-primary/70">Your intelligent family assistant</p>
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
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsExpanded(false)}
                  className="text-primary hover:bg-primary/10"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Suggestion Pills */}
          {messages.length === 0 && (
            <SuggestionPills onSuggestionClick={handleSuggestionClick} />
          )}

          {/* Messages Area */}
          <div className="h-80">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                      <Bot className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Welcome to Niles Chat</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      I'm here to help you manage your family's schedule, tasks, and activities. 
                      Try one of the suggestions above or ask me anything!
                    </p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className={cn(
                      "flex gap-3",
                      message.role === 'user' ? "flex-row-reverse" : "flex-row"
                    )}>
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className={cn(
                          message.role === 'user' 
                            ? "bg-secondary text-secondary-foreground" 
                            : "bg-primary text-primary-foreground"
                        )}>
                          {message.role === 'user' ? (
                            user?.user_metadata?.display_name?.[0] || user?.email?.[0] || 'U'
                          ) : (
                            <Bot className="h-4 w-4" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className={cn(
                        "flex flex-col max-w-[80%]",
                        message.role === 'user' ? "items-end" : "items-start"
                      )}>
                        <div className={cn(
                          "rounded-lg px-4 py-2 text-sm",
                          message.role === 'user'
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}>
                          {message.content}
                        </div>
                        <span className="text-xs text-muted-foreground mt-1">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
                
                {isLoading && (
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Niles is thinking...</span>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </div>

          {/* Input Area */}
          <div className="border-t border-border p-4 bg-card/50">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask Niles anything about your family's schedule..."
                  className="min-h-[44px] max-h-32 resize-none pr-12 bg-background"
                  disabled={isLoading}
                />
                <Button
                  size="sm"
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 top-2 h-8 w-8 p-0"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};