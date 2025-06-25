
export const getRandomResponse = (isCustomerSending: boolean): string => {
  if (isCustomerSending) {
    // Agent responses
    const agentResponses = [
      "I understand your concern. Let me look into this for you.",
      "Thank you for providing that information. I'll help you resolve this issue.",
      "I can see what's happening here. Let me walk you through the solution.",
      "That's a great question. Here's what I recommend...",
      "I've checked your account and I can help you with this.",
      "Let me transfer you to our billing specialist for this inquiry.",
      "I've updated your account. Please try again and let me know if you need further assistance."
    ];
    return agentResponses[Math.floor(Math.random() * agentResponses.length)];
  } else {
    // Customer responses
    const customerResponses = [
      "Thank you for the quick response!",
      "That helps, let me try that.",
      "I see, could you provide more details?",
      "Perfect, that solved my issue!",
      "I'm still having trouble, could you help further?",
      "Great! I'll follow those steps.",
      "Thanks for your patience with this."
    ];
    return customerResponses[Math.floor(Math.random() * customerResponses.length)];
  }
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-green-500';
    case 'waiting': return 'bg-yellow-500';
    case 'closed': return 'bg-gray-500';
    default: return 'bg-gray-500';
  }
};

export const getStatusText = (status: string) => {
  switch (status) {
    case 'active': return 'Active';
    case 'waiting': return 'Waiting';
    case 'closed': return 'Closed';
    default: return 'Unknown';
  }
};
