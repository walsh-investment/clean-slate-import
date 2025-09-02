import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Separator } from '../ui/separator';
import { Bell, User, Shield, Palette, Calendar, MessageSquare, Car } from 'lucide-react';
import { AiProfileSettings } from './AiProfileSettings';

export function Settings() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-medium">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Manage your preferences and family settings
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="family">Family</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="ai-profile">AI Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <User className="w-4 h-4 mr-2" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-6">
                <Avatar className="w-20 h-20 bg-[#3B82F6]">
                  <AvatarFallback className="text-white text-xl">
                    CW
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button variant="outline">Change Photo</Button>
                  <p className="text-xs text-muted-foreground">
                    Recommended: Square image, at least 400px
                  </p>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" defaultValue="Charlie" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" defaultValue="Walsh" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue="charlie@walsh.com" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" defaultValue="(555) 123-4567" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Family Role</Label>
                <Select defaultValue="dad">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dad">Dad</SelectItem>
                    <SelectItem value="mom">Mom</SelectItem>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="guardian">Guardian</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <Bell className="w-4 h-4 mr-2" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Get browser notifications for urgent items
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive text messages for high-priority items
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h4 className="font-medium">Notification Types</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>New Events</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Task Assignments</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Ride Requests</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Messages</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Reminders</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Calendar Changes</Label>
                    <Switch />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                Calendar Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Default View</Label>
                <Select defaultValue="week">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Day View</SelectItem>
                    <SelectItem value="week">Week View</SelectItem>
                    <SelectItem value="month">Month View</SelectItem>
                    <SelectItem value="list">List View</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Week Starts On</Label>
                <Select defaultValue="sunday">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sunday">Sunday</SelectItem>
                    <SelectItem value="monday">Monday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Time Format</Label>
                <Select defaultValue="12h">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12h">12 Hour (AM/PM)</SelectItem>
                    <SelectItem value="24h">24 Hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h4 className="font-medium">Calendar Sync</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Google Calendar</Label>
                      <p className="text-sm text-muted-foreground">
                        Sync with your Google Calendar
                      </p>
                    </div>
                    <Button variant="outline" size="sm">Connect</Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Apple Calendar</Label>
                      <p className="text-sm text-muted-foreground">
                        Sync with iCloud Calendar
                      </p>
                    </div>
                    <Button variant="outline" size="sm">Connect</Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Outlook Calendar</Label>
                      <p className="text-sm text-muted-foreground">
                        Sync with Microsoft Outlook
                      </p>
                    </div>
                    <Button variant="outline" size="sm">Connect</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="family" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Family Members</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: 'Charlie Walsh', role: 'Dad', color: '#00BCD4', avatar: 'CW' },
                { name: 'Tyra Walsh', role: 'Mom', color: '#D24CE1', avatar: 'TW' },
                { name: 'Nama Walsh', role: 'Grandmother', color: '#F4C542', avatar: 'NW' },
                { name: 'Pops Walsh', role: 'Grandfather', color: '#7CC576', avatar: 'PW' },
                { name: 'Wyatt Walsh', role: 'Son (12)', color: '#FF8A65', avatar: 'WW' },
                { name: 'Adelaide Walsh', role: 'Daughter (9)', color: '#9575CD', avatar: 'AW' },
                { name: 'Ellis Walsh', role: 'Son (7)', color: '#4DD0E1', avatar: 'EW' },
                { name: 'Beckett Walsh', role: 'Son (5)', color: '#F06292', avatar: 'BW' },
              ].map((member, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10" style={{ backgroundColor: member.color }}>
                      <AvatarFallback className="text-white">
                        {member.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.role}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">Edit</Button>
                </div>
              ))}
              
              <Button variant="outline" className="w-full">
                <User className="w-4 h-4 mr-2" />
                Add Family Member
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                Privacy & Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Share Calendar with Family</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow family members to see your events
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Location Sharing</Label>
                    <p className="text-sm text-muted-foreground">
                      Share location for ride coordination
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Activity Status</Label>
                    <p className="text-sm text-muted-foreground">
                      Show when you're online
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h4 className="font-medium">Data Management</h4>
                
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    Download My Data
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Export Family Calendar
                  </Button>
                  <Button variant="outline" className="w-full justify-start text-destructive">
                    Delete My Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-profile" className="space-y-4">
          <AiProfileSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}