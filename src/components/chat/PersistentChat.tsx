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
  const [showRetry, setShowRetry] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
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
        const { data, error } = await supabase.rpc('get_chat_history' as any, {
          household_id: household.id,
          limit_count: 50
        });

        if (error) throw error;

        const formattedMessages: Message[] = Array.isArray(data) ? data.map((row: any) => ({
          id: Math.random().toString(),
          content: row.content || '',
          role: (row.role === 'user' || row.role === 'assistant') ? row.role : 'assistant',
          timestamp: row.created_at || new Date().toISOString()
        })) : [];

        setMessages(formattedMessages);
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    };

    loadChatHistory();
  }, [household?.id]);

  const cleanupConnection = () => {
    if (eventSourceRef.current) {
      console.log('Cleaning up EventSource connection');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

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
    setShowRetry(false);

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
      // Use EventSource for better SSE reliability
      const supabaseUrl = 'https://wkhxircgcysdzmofwnbr.supabase.co';
      const session = await supabase.auth.getSession();
      
      // Construct URL with query params for GET request
      const params = new URLSearchParams({
        message: messageText.trim(),
        household_id: household.id,
        user_id: user?.id || '',
        authorization: session.data.session?.access_token || ''
      });

      const eventSourceUrl = `${supabaseUrl}/functions/v1/ai-chat-stream?${params}`;
      console.log('Connecting to EventSource:', eventSourceUrl);

      eventSourceRef.current = new EventSource(eventSourceUrl);
      
      // Set up 70-second timeout with retry option
      timeoutRef.current = setTimeout(() => {
        console.log('Connection timeout - showing retry option');
        cleanupConnection();
        setIsLoading(false);
        setIsConnected(false);
        setShowRetry(true);
        
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: msg.content + '\n\n[Connection timed out]' }
            : msg
        ));
      }, 70000);

      eventSourceRef.current.onopen = () => {
        console.log('EventSource connection opened');
        setIsConnected(true);
      };

      eventSourceRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('SSE Event received:', data.type, data);
          
          // Reset timeout on any message (including heartbeats)
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
              console.log('Connection timeout after heartbeat reset');
              cleanupConnection();
              setIsLoading(false);
              setIsConnected(false);
              setShowRetry(true);
            }, 70000);
          }

          if (data.type === 'connected') {
            console.log('Connected to chat stream');
            setIsConnected(true);
          } else if (data.type === 'content') {
            console.log('Content chunk:', data.content?.length || 0, 'chars');
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, content: msg.content + (data.content || '') }
                : msg
            ));
          } else if (data.type === 'done' || data.type === 'complete') {
            console.log('Stream completed successfully');
            setIsLoading(false);
            cleanupConnection();
          } else if (data.type === 'error') {
            console.error('Server error:', data.error);
            setIsLoading(false);
            cleanupConnection();
            throw new Error(data.error || 'Server error');
          } else if (data.type === 'heartbeat') {
            console.log('Heartbeat received');
          }
        } catch (parseError) {
          console.error('Error parsing SSE data:', parseError, 'Raw event:', event.data);
        }
      };

      eventSourceRef.current.onerror = (error) => {
        console.error('EventSource error:', error);
        cleanupConnection();
        setIsLoading(false);
        setIsConnected(false);
        setShowRetry(true);
        
        // Log error to backend
        logClientError('chat_eventsource_error', 'EventSource connection failed', error);
        
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: msg.content || 'Connection failed. Please try again.' }
            : msg
        ));
      };

    } catch (error) {
      console.error('Error setting up EventSource:', error);
      cleanupConnection();
      setIsLoading(false);
      setIsConnected(false);
      setShowRetry(true);
      
      // Log error to backend
      logClientError('chat_setup_error', 'Failed to setup chat connection', error);
      
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { ...msg, content: 'Sorry, I encountered a connection error. Please try again.' }
          : msg
      ));
    }
  };

  const logClientError = async (fingerprint: string, message: string, error: any) => {
    try {
      await supabase.rpc('upsert_error_aggregate', {
        p_fingerprint: fingerprint,
        p_level: 'error',
        p_category: 'ai_chat_stream',
        p_scope: 'client',
        p_message: `${message}: ${error instanceof Error ? error.message.replace(/'/g, "''") : 'Unknown error'}`,
        p_stack: error instanceof Error ? (error.stack || '').replace(/'/g, "''") : ''
      });
    } catch (logError) {
      console.error('Failed to log client error:', logError);
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

  const handleRetry = () => {
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (lastUserMessage) {
      setShowRetry(false);
      sendMessage(lastUserMessage.content);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupConnection();
    };
  }, []);

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
                        {message.content && (
                          <span className="text-xs text-muted-foreground mt-1">
                            {formatTime(message.timestamp)}
                          </span>
                        )}
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
                
                {showRetry && (
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Connection failed.</span>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={handleRetry}
                        className="ml-2"
                      >
                        Retry
                      </Button>
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