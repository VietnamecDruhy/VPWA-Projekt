// src/utils/notifications.ts
export interface NotificationMessage {
    content: string;
    author: {
        nickname: string;
    };
}

export interface NotificationData {
    channel: string;
    message: NotificationMessage;
}

export interface NotificationContent {
    title: string;
    body: string;
}

/**
 * Determines if a notification should be shown based on user preferences and state
 */
export const shouldShowNotification = (
    message: NotificationMessage,
    mentionOnly: boolean,
    userNickname: string,
    userState: string
): boolean => {
    if (userState === 'dnd') return false;
    if (!mentionOnly) return true;
    return message.content.includes(`@${userNickname}`);
};

/**
 * Creates the notification content with appropriate title and body
 */
export const createNotificationContent = (
    message: NotificationMessage,
    channel: string,
    userNickname: string,
    truncateText: (text: string) => string
): NotificationContent => {
    const isMention = message.content.includes(`@${userNickname}`);
    const title = isMention
        ? `${message.author.nickname} mentioned you in ${channel}`
        : `New message in ${channel}`;

    const body = `${message.author.nickname}: ${truncateText(message.content)}`;

    return { title, body };
};

/**
 * Shows a browser notification using the Notification API
 */
export const showBrowserNotification = (
    content: NotificationContent,
    channel: string,
    selectChannel: (channel: string) => void
): void => {
    const notification = new Notification(content.title, {
        body: content.body,
        icon: '/your-app-icon.png'
    });

    notification.onclick = () => {
        window.focus();
        selectChannel(channel);
    };
};

/**
 * Shows an in-app notification using the application's notification system
 */
export const showInAppNotification = (
    content: NotificationContent,
    channel: string,
    showNotification: (message: string, type: string, timeout: number, channel?: string) => void
): void => {
    showNotification(
        content.body,
        'info',
        5000,
        channel
    );
};