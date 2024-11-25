// contracts/repositories.ts
// here we are declaring our MessageRepository types for Repositories/MessageRepository
// container binding. See providers/AppProvider.ts for how we are binding the implementation
// here we are declaring our MessageRepository types for Repositories/MessageRepository
// container binding. See providers/AppProvider.ts for how we are binding the implementation
declare module '@ioc:Repositories/MessageRepository' {
    export interface SerializedMessage {
        id: number;
        content: string;
        channelId: number;
        userId: number;
        createdAt: string;
        updatedAt: string;
        author: {
            id: number,
            email: string,
            nickname: string,
            createdAt: string,
            updatedAt: string
        }
    }

    export interface MessageRepositoryContract {
        getAll(
            channelName: string,
            timestamp?: string,
            messageId?: string
        ): Promise<SerializedMessage[]>
        create(channelName: string, userId: number, content: string): Promise<SerializedMessage>
    }

    const MessageRepository: MessageRepositoryContract
    export default MessageRepository
}
