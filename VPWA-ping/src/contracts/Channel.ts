// src/contracts/Channel.ts
export interface Channel {
    id: number;
    name: string;
    ownerId: number;
    isPrivate: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ChannelMember {
  id: number;
  nickname: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}
