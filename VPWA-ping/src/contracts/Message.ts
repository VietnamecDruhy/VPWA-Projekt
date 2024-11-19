import { User } from './Auth';

export type RawMessage = string;

export interface SerializedMessage {
    id: number;
    content: string;
    channelId: number;
    userId: number;
    createdAt: string;
    updatedAt: string;
    author: User;
}