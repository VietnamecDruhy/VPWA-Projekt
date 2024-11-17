import { User } from './Auth';

export type RawMessage = string;

export interface SerializedMessage {
    userId: number;
    content: string;
    channelId: number;
    createdAt: string;
    updatedAt: string;
    id: number;
    author: User;
}