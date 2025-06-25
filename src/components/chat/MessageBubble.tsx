
import { Message } from "@/types/chat";

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
}

export const MessageBubble = ({ message, isOwnMessage }: MessageBubbleProps) => {
  return (
    <div className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isOwnMessage
            ? "bg-indigo-600 text-white"
            : "bg-gray-200 text-gray-900"
        }`}
      >
        <div className="flex items-center space-x-2 mb-1">
          <span className={`text-xs font-medium ${
            isOwnMessage ? "text-indigo-100" : "text-gray-600"
          }`}>
            {message.sender}
          </span>
        </div>
        <p className="text-sm">{message.message}</p>
        <p
          className={`text-xs mt-1 ${
            isOwnMessage ? "text-indigo-100" : "text-gray-500"
          }`}
        >
          {message.time}
        </p>
      </div>
    </div>
  );
};
