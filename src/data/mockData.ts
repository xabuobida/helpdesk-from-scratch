
import { Ticket, ActivityItem } from "@/types/ticket";

export const mockTickets: Ticket[] = [
  {
    id: "MK-32",
    title: "Cannot access the system",
    description: "Life seasons open have. Air have of. Lights fill after let third darkness replenish fruitful let. Wherein set image. Creepeth said above gathered bring.",
    status: "unassigned",
    priority: "urgent",
    category: "Technical",
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    customerName: "John Doe",
    customerEmail: "john@example.com",
  },
  {
    id: "F049",
    title: "Refund not initiated",
    description: "Life seasons open have. Air have of. Lights fill after let third darkness replenish fruitful let. Wherein set image. Creepeth said above gathered bring.",
    status: "assigned",
    priority: "medium",
    category: "Billing",
    assignedTo: "Sophie Minders",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    customerName: "Jane Smith",
    customerEmail: "jane@example.com",
  },
  {
    id: "FE23",
    title: "Free delivery",
    description: "Life seasons open have. Air have of. Lights fill after let third darkness replenish fruitful let. Wherein set image. Creepeth said above gathered bring.",
    status: "resolved",
    priority: "low",
    category: "General",
    assignedTo: "Mike Johnson",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    customerName: "Bob Wilson",
    customerEmail: "bob@example.com",
  },
  {
    id: "MK-45",
    title: "Issue with finding information about order",
    description: "Life seasons open have. Air have of. Lights fill after let third darkness replenish fruitful let. Wherein set image. Creepeth said above gathered bring.",
    status: "in_progress",
    priority: "high",
    category: "Order Support",
    assignedTo: "Sarah Davis",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    customerName: "Alice Brown",
    customerEmail: "alice@example.com",
  },
];

export const mockActivities: ActivityItem[] = [
  {
    id: "1",
    type: "status_changed",
    ticketId: "MK-32",
    userName: "Devon",
    userAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face",
    message: "closed How do I change my password?",
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
  },
  {
    id: "2",
    type: "commented",
    ticketId: "F049",
    userName: "Jenny",
    userAvatar: "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=32&h=32&fit=crop&crop=face",
    message: "responded Requires refund",
    timestamp: new Date(Date.now() - 40 * 60 * 1000), // 40 minutes ago
  },
  {
    id: "3",
    type: "assigned",
    ticketId: "MK-45",
    userName: "Robert",
    userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=32&h=32&fit=crop&crop=face",
    message: "is assigned Problems with settings",
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
  },
  {
    id: "4",
    type: "status_changed",
    ticketId: "F049",
    userName: "Jules",
    userAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=32&h=32&fit=crop&crop=face",
    message: "mentioned you Cannot access the system",
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
  },
  {
    id: "5",
    type: "resolved",
    ticketId: "FE23",
    userName: "Sophie",
    userAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=32&h=32&fit=crop&crop=face",
    message: "responded Lost order is still missing",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  },
];
