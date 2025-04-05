import { 
  BaseMessageOptions, 
  Message, 
  MessagePayload, 
  TextChannel, 
  DMChannel,
  NewsChannel 
} from "discord.js";

/**
 * Check if we can send messages to this channel
 */
export function canSendMessages(channel: any): channel is TextChannel | DMChannel | NewsChannel {
  return channel && typeof channel.send === 'function';
}

/**
 * Safely send a message to a Discord channel
 * @param channel The channel to send the message to
 * @param options The message content or options
 * @param messageId Optional message ID to edit instead of sending a new message
 * @returns The sent message, or undefined if there was an error
 */
export async function safelySendMessage(
  channel: any, 
  options: string | MessagePayload | BaseMessageOptions,
  messageId?: string
): Promise<Message | undefined> {
  try {
    // If it's a valid channel with a send method
    if (canSendMessages(channel)) {
      // If a message ID is provided, try to edit that message
      if (messageId) {
        try {
          const oldMessage = await channel.messages.fetch(messageId);
          if (oldMessage) {
            return await oldMessage.edit(options);
          }
        } catch (err) {
          // If we can't fetch or edit the message, fall back to sending a new one
          console.log("Could not edit message, sending new one instead");
        }
      }
      
      // Send a new message
      return await channel.send(options);
    }
    
    console.error(`Cannot send message to this channel type`);
    return undefined;
  } catch (error) {
    console.error('Error sending message:', error);
    return undefined;
  }
}