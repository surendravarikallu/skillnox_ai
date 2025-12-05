import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIAvatarProps {
  gender?: 'male' | 'female';
  isSpeaking?: boolean;
  isListening?: boolean;
  className?: string;
}

export function AIAvatar({ gender = 'male', isSpeaking = false, isListening = false, className }: AIAvatarProps) {
  const [animation, setAnimation] = useState<'idle' | 'speaking' | 'listening'>('idle');

  useEffect(() => {
    if (isSpeaking) {
      setAnimation('speaking');
    } else if (isListening) {
      setAnimation('listening');
    } else {
      setAnimation('idle');
    }
  }, [isSpeaking, isListening]);

  // Generate avatar based on gender (using initials for now, can be replaced with actual avatars)
  const avatarInitial = gender === 'male' ? 'AI' : 'AI';
  const avatarColor = gender === 'male' 
    ? 'bg-blue-500' 
    : 'bg-pink-500';

  return (
    <div className={cn("relative", className)}>
      <Avatar className={cn(
        "w-24 h-24 transition-all duration-300",
        animation === 'speaking' && "scale-110 animate-pulse",
        animation === 'listening' && "scale-105 ring-2 ring-primary ring-offset-2",
        animation === 'idle' && "scale-100"
      )}>
        <AvatarFallback className={cn(
          "text-2xl font-bold text-white",
          avatarColor
        )}>
          {avatarInitial}
        </AvatarFallback>
      </Avatar>
      
      {/* Speaking indicator */}
      {isSpeaking && (
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}
      
      {/* Listening indicator */}
      {isListening && (
        <div className="absolute -top-2 -right-2">
          <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center animate-pulse">
            <Mic className="w-3 h-3 text-white" />
          </div>
        </div>
      )}
      
      {/* Status text removed here; parent component now shows status below the avatar to avoid layout overlap */}
    </div>
  );
}

