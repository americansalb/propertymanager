'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare,
  Send,
  Inbox,
  Mail,
  MailOpen,
  Clock,
  Loader2,
  ChevronRight,
  ArrowLeft,
  Plus,
} from 'lucide-react';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import TenantLayout from '@/components/layouts/TenantLayout';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Message {
  id: string;
  subject: string | null;
  content: string;
  direction: 'TENANT_TO_MANAGEMENT' | 'MANAGEMENT_TO_TENANT';
  isRead: boolean;
  senderName: string | null;
  createdAt: string;
  replies: Array<{
    id: string;
    content: string;
    direction: 'TENANT_TO_MANAGEMENT' | 'MANAGEMENT_TO_TENANT';
    senderName: string | null;
    createdAt: string;
  }>;
}

export default function MessagesPage() {
  const queryClient = useQueryClient();
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [newMessage, setNewMessage] = useState({ subject: '', content: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['messages'],
    queryFn: async () => {
      const response = await api.get('/tenant-portal/messages');
      return response.data.data as { messages: Message[]; pagination: any };
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (data: { subject?: string; content: string; parentId?: string }) => {
      await api.post('/tenant-portal/messages', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages'] });
      setComposeOpen(false);
      setReplyContent('');
      setNewMessage({ subject: '', content: '' });
      if (selectedMessage) {
        // Refetch to get the new reply
        queryClient.invalidateQueries({ queryKey: ['messages'] });
      }
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      await api.put(`/tenant-portal/messages/${messageId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages'] });
    },
  });

  const handleSelectMessage = (message: Message) => {
    setSelectedMessage(message);
    if (!message.isRead && message.direction === 'MANAGEMENT_TO_TENANT') {
      markReadMutation.mutate(message.id);
    }
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || !selectedMessage) {
      return;
    }
    sendMutation.mutate({
      content: replyContent.trim(),
      parentId: selectedMessage.id,
    });
  };

  const handleSendNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.content.trim()) {
      return;
    }
    sendMutation.mutate({
      subject: newMessage.subject.trim() || undefined,
      content: newMessage.content.trim(),
    });
  };

  const unreadCount =
    data?.messages.filter((m) => !m.isRead && m.direction === 'MANAGEMENT_TO_TENANT').length || 0;

  return (
    <TenantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            <p className="text-gray-600">Communicate with your property management team</p>
          </div>
          <Button onClick={() => setComposeOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Message
          </Button>
        </div>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <p className="text-primary font-medium">
                  You have {unreadCount} unread message{unreadCount > 1 ? 's' : ''}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Message List */}
          <Card className={selectedMessage ? 'hidden lg:block' : ''}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Inbox className="w-5 h-5 text-gray-400" />
                <CardTitle className="text-lg">Inbox</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : data?.messages.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
                  <p className="text-gray-500 mb-4">
                    Start a conversation with your property manager
                  </p>
                  <Button onClick={() => setComposeOpen(true)} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    New Message
                  </Button>
                </div>
              ) : (
                <div className="divide-y max-h-[600px] overflow-y-auto">
                  {data?.messages.map((message) => {
                    const isFromManagement = message.direction === 'MANAGEMENT_TO_TENANT';
                    const isUnread = !message.isRead && isFromManagement;
                    return (
                      <button
                        key={message.id}
                        onClick={() => handleSelectMessage(message)}
                        className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                          selectedMessage?.id === message.id ? 'bg-primary/5' : ''
                        } ${isUnread ? 'bg-blue-50/50' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2 rounded-full ${
                              isFromManagement ? 'bg-blue-100' : 'bg-gray-100'
                            }`}
                          >
                            {isUnread ? (
                              <Mail className="w-4 h-4 text-blue-600" />
                            ) : (
                              <MailOpen className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p
                                className={`font-medium truncate ${isUnread ? 'text-blue-900' : ''}`}
                              >
                                {isFromManagement
                                  ? message.senderName || 'Property Manager'
                                  : 'You'}
                              </p>
                              <span className="text-xs text-gray-500">
                                {format(new Date(message.createdAt), 'MMM d')}
                              </span>
                            </div>
                            {message.subject && (
                              <p
                                className={`text-sm font-medium truncate ${isUnread ? 'text-blue-800' : 'text-gray-900'}`}
                              >
                                {message.subject}
                              </p>
                            )}
                            <p className="text-sm text-gray-500 truncate">{message.content}</p>
                            {message.replies.length > 0 && (
                              <p className="text-xs text-gray-400 mt-1">
                                {message.replies.length} repl
                                {message.replies.length === 1 ? 'y' : 'ies'}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Message Detail */}
          <Card className={`lg:col-span-2 ${!selectedMessage ? 'hidden lg:block' : ''}`}>
            {selectedMessage ? (
              <>
                <CardHeader className="border-b">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="lg:hidden"
                      onClick={() => setSelectedMessage(null)}
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      Back
                    </Button>
                    <div className="flex-1">
                      <CardTitle>{selectedMessage.subject || 'Message'}</CardTitle>
                      <CardDescription>
                        Conversation with{' '}
                        {selectedMessage.direction === 'MANAGEMENT_TO_TENANT'
                          ? selectedMessage.senderName || 'Property Manager'
                          : 'Property Management'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {/* Messages */}
                  <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
                    {/* Original Message */}
                    <div
                      className={`flex ${
                        selectedMessage.direction === 'TENANT_TO_MANAGEMENT'
                          ? 'justify-end'
                          : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-4 ${
                          selectedMessage.direction === 'TENANT_TO_MANAGEMENT'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-gray-100'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{selectedMessage.content}</p>
                        <div
                          className={`flex items-center gap-2 mt-2 text-xs ${
                            selectedMessage.direction === 'TENANT_TO_MANAGEMENT'
                              ? 'text-primary-foreground/70'
                              : 'text-gray-500'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {format(new Date(selectedMessage.createdAt), 'MMM d, yyyy h:mm a')}
                        </div>
                      </div>
                    </div>

                    {/* Replies */}
                    {selectedMessage.replies.map((reply) => (
                      <div
                        key={reply.id}
                        className={`flex ${
                          reply.direction === 'TENANT_TO_MANAGEMENT'
                            ? 'justify-end'
                            : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-4 ${
                            reply.direction === 'TENANT_TO_MANAGEMENT'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-gray-100'
                          }`}
                        >
                          {reply.senderName && reply.direction === 'MANAGEMENT_TO_TENANT' && (
                            <p className="text-xs font-medium mb-1">{reply.senderName}</p>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                          <div
                            className={`flex items-center gap-2 mt-2 text-xs ${
                              reply.direction === 'TENANT_TO_MANAGEMENT'
                                ? 'text-primary-foreground/70'
                                : 'text-gray-500'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            {format(new Date(reply.createdAt), 'MMM d, yyyy h:mm a')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Reply Form */}
                  <form onSubmit={handleSendReply} className="p-4 border-t bg-gray-50">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type your reply..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        type="submit"
                        disabled={!replyContent.trim() || sendMutation.isPending}
                      >
                        {sendMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </>
            ) : (
              <CardContent className="py-12 text-center">
                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a message</h3>
                <p className="text-gray-500">
                  Choose a conversation from the list or start a new one
                </p>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Compose Dialog */}
        <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Message</DialogTitle>
              <DialogDescription>Send a message to your property management team</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSendNew} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject (optional)</Label>
                <Input
                  id="subject"
                  placeholder="What is this about?"
                  value={newMessage.subject}
                  onChange={(e) => setNewMessage((prev) => ({ ...prev, subject: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Message *</Label>
                <textarea
                  id="content"
                  placeholder="Type your message here..."
                  value={newMessage.content}
                  onChange={(e) => setNewMessage((prev) => ({ ...prev, content: e.target.value }))}
                  className="w-full min-h-[150px] border rounded-md px-3 py-2 text-sm"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setComposeOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!newMessage.content.trim() || sendMutation.isPending}
                >
                  {sendMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </TenantLayout>
  );
}
