// Email service for sending notifications
// In a production environment, this would integrate with services like:
// - SendGrid
// - AWS SES
// - Mailgun
// - Resend

interface EmailNotification {
  to: string[];
  subject: string;
  template: 'new-ticket' | 'ticket-assigned' | 'ticket-updated';
  data: {
    ticketId: string;
    title: string;
    customerName: string;
    priority: string;
    description?: string;
    assignedTo?: string;
    status?: string;
  };
}

class EmailService {
  private apiKey: string;
  private fromEmail: string;

  constructor() {
    // In production, these would come from environment variables
    this.apiKey = import.meta.env.VITE_EMAIL_API_KEY || '';
    this.fromEmail = import.meta.env.VITE_FROM_EMAIL || 'noreply@helpdesk.com';
  }

  async sendNotification(notification: EmailNotification): Promise<boolean> {
    try {
      // For demo purposes, we'll just log the email that would be sent
      console.log('📧 Email Notification:', {
        to: notification.to,
        subject: notification.subject,
        template: notification.template,
        data: notification.data,
        timestamp: new Date().toISOString()
      });

      // In production, you would make an API call to your email service
      // Example with SendGrid:
      /*
      const response = await fetch('https://api.sendgrid.v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: { email: this.fromEmail },
          to: notification.to.map(email => ({ email })),
          subject: notification.subject,
          content: [{
            type: 'text/html',
            value: this.generateEmailContent(notification.template, notification.data)
          }]
        })
      });

      return response.ok;
      */

      // Simulate successful email sending
      return true;
    } catch (error) {
      console.error('Failed to send email notification:', error);
      return false;
    }
  }

  private generateEmailContent(template: string, data: any): string {
    switch (template) {
      case 'new-ticket':
        return `
          <h2>New Support Ticket Created</h2>
          <p><strong>Customer:</strong> ${data.customerName}</p>
          <p><strong>Title:</strong> ${data.title}</p>
          <p><strong>Priority:</strong> ${data.priority}</p>
          <p><strong>Description:</strong> ${data.description}</p>
          <p><strong>Ticket ID:</strong> ${data.ticketId}</p>
          <p>Please log in to the helpdesk system to view and respond to this ticket.</p>
        `;
      
      case 'ticket-assigned':
        return `
          <h2>Ticket Assigned to You</h2>
          <p><strong>Title:</strong> ${data.title}</p>
          <p><strong>Customer:</strong> ${data.customerName}</p>
          <p><strong>Priority:</strong> ${data.priority}</p>
          <p><strong>Ticket ID:</strong> ${data.ticketId}</p>
          <p>This ticket has been assigned to you. Please review and respond as soon as possible.</p>
        `;
      
      case 'ticket-updated':
        return `
          <h2>Ticket Status Updated</h2>
          <p><strong>Title:</strong> ${data.title}</p>
          <p><strong>New Status:</strong> ${data.status}</p>
          <p><strong>Ticket ID:</strong> ${data.ticketId}</p>
          <p>The ticket status has been updated. Please check the helpdesk for more details.</p>
        `;
      
      default:
        return '<p>Ticket notification</p>';
    }
  }

  async sendNewTicketNotification(ticketData: {
    ticketId: string;
    title: string;
    customerName: string;
    priority: string;
    description: string;
  }): Promise<boolean> {
    // Get all agents and admins to notify
    const recipients = await this.getNotificationRecipients();
    
    return this.sendNotification({
      to: recipients,
      subject: `New ${ticketData.priority} Priority Ticket: ${ticketData.title}`,
      template: 'new-ticket',
      data: ticketData
    });
  }

  async sendTicketAssignedNotification(ticketData: {
    ticketId: string;
    title: string;
    customerName: string;
    priority: string;
    assignedTo: string;
  }): Promise<boolean> {
    return this.sendNotification({
      to: [ticketData.assignedTo],
      subject: `Ticket Assigned: ${ticketData.title}`,
      template: 'ticket-assigned',
      data: ticketData
    });
  }

  private async getNotificationRecipients(): Promise<string[]> {
    // In production, this would query your database for agents/admins
    // For demo purposes, return some example emails
    return [
      'support@company.com',
      'admin@company.com'
    ];
  }
}

export const emailService = new EmailService();