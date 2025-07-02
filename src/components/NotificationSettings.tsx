import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useNotifications } from '@/hooks/useNotifications';
import { useToast } from '@/hooks/use-toast';
import { Bell, Mail, Monitor, Smartphone } from 'lucide-react';

interface NotificationSettingsProps {
  className?: string;
}

export const NotificationSettings = ({ className }: NotificationSettingsProps) => {
  const { permission, requestPermission } = useNotifications();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState({
    desktop: {
      enabled: false,
      newTickets: true,
      ticketAssigned: true,
      ticketUpdated: false,
      chatMessages: true
    },
    email: {
      enabled: true,
      newTickets: true,
      ticketAssigned: true,
      ticketUpdated: false,
      dailyDigest: true,
      emailAddress: ''
    },
    sound: {
      enabled: true,
      volume: 50
    }
  });

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('notificationSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }

    // Check if desktop notifications are already enabled
    if (permission === 'granted') {
      setSettings(prev => ({
        ...prev,
        desktop: { ...prev.desktop, enabled: true }
      }));
    }
  }, [permission]);

  const saveSettings = () => {
    localStorage.setItem('notificationSettings', JSON.stringify(settings));
    toast({
      title: "Settings Saved",
      description: "Your notification preferences have been updated.",
    });
  };

  const handleDesktopToggle = async (enabled: boolean) => {
    if (enabled && permission !== 'granted') {
      const result = await requestPermission();
      if (result !== 'granted') {
        toast({
          title: "Permission Denied",
          description: "Desktop notifications require permission to be enabled.",
          variant: "destructive"
        });
        return;
      }
    }

    setSettings(prev => ({
      ...prev,
      desktop: { ...prev.desktop, enabled }
    }));
  };

  const testNotification = () => {
    if (permission === 'granted') {
      new Notification('Test Notification', {
        body: 'This is a test notification from your helpdesk system.',
        icon: '/favicon.ico',
        tag: 'test'
      });
    } else {
      toast({
        title: "Test Notification",
        description: "This would be a desktop notification if enabled.",
      });
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Desktop Notifications */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              <Label className="text-base font-medium">Desktop Notifications</Label>
            </div>
            <Switch
              checked={settings.desktop.enabled}
              onCheckedChange={handleDesktopToggle}
            />
          </div>
          
          {settings.desktop.enabled && (
            <div className="ml-6 space-y-3">
              <div className="flex items-center justify-between">
                <Label>New tickets created</Label>
                <Switch
                  checked={settings.desktop.newTickets}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({
                      ...prev,
                      desktop: { ...prev.desktop, newTickets: checked }
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Tickets assigned to me</Label>
                <Switch
                  checked={settings.desktop.ticketAssigned}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({
                      ...prev,
                      desktop: { ...prev.desktop, ticketAssigned: checked }
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Ticket status updates</Label>
                <Switch
                  checked={settings.desktop.ticketUpdated}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({
                      ...prev,
                      desktop: { ...prev.desktop, ticketUpdated: checked }
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>New chat messages</Label>
                <Switch
                  checked={settings.desktop.chatMessages}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({
                      ...prev,
                      desktop: { ...prev.desktop, chatMessages: checked }
                    }))
                  }
                />
              </div>
              <Button variant="outline" size="sm" onClick={testNotification}>
                Test Notification
              </Button>
            </div>
          )}
        </div>

        <Separator />

        {/* Email Notifications */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <Label className="text-base font-medium">Email Notifications</Label>
            </div>
            <Switch
              checked={settings.email.enabled}
              onCheckedChange={(checked) => 
                setSettings(prev => ({
                  ...prev,
                  email: { ...prev.email, enabled: checked }
                }))
              }
            />
          </div>
          
          {settings.email.enabled && (
            <div className="ml-6 space-y-3">
              <div>
                <Label>Email Address</Label>
                <Input
                  type="email"
                  placeholder="your-email@company.com"
                  value={settings.email.emailAddress}
                  onChange={(e) => 
                    setSettings(prev => ({
                      ...prev,
                      email: { ...prev.email, emailAddress: e.target.value }
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>New tickets created</Label>
                <Switch
                  checked={settings.email.newTickets}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({
                      ...prev,
                      email: { ...prev.email, newTickets: checked }
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Tickets assigned to me</Label>
                <Switch
                  checked={settings.email.ticketAssigned}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({
                      ...prev,
                      email: { ...prev.email, ticketAssigned: checked }
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Ticket status updates</Label>
                <Switch
                  checked={settings.email.ticketUpdated}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({
                      ...prev,
                      email: { ...prev.email, ticketUpdated: checked }
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Daily digest</Label>
                <Switch
                  checked={settings.email.dailyDigest}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({
                      ...prev,
                      email: { ...prev.email, dailyDigest: checked }
                    }))
                  }
                />
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Sound Notifications */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              <Label className="text-base font-medium">Sound Notifications</Label>
            </div>
            <Switch
              checked={settings.sound.enabled}
              onCheckedChange={(checked) => 
                setSettings(prev => ({
                  ...prev,
                  sound: { ...prev.sound, enabled: checked }
                }))
              }
            />
          </div>
        </div>

        <div className="pt-4">
          <Button onClick={saveSettings} className="w-full">
            Save Notification Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};