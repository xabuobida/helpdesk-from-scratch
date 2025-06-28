
export const mockActivities = [
  {
    id: "1",
    user: "John Smith",
    action: "created ticket",
    target: "Bug Report #123",
    timestamp: "2 hours ago",
    type: "create" as const
  },
  {
    id: "2", 
    user: "Sarah Wilson",
    action: "updated ticket",
    target: "Feature Request #456",
    timestamp: "4 hours ago",
    type: "update" as const
  },
  {
    id: "3",
    user: "Mike Johnson", 
    action: "closed ticket",
    target: "Support Request #789",
    timestamp: "1 day ago",
    type: "close" as const
  }
];
