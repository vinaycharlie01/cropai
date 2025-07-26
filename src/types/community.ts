
import { Timestamp } from 'firebase/firestore';

export type PostTag = 'Help' | 'Discussion' | 'Sell Together' | 'Advice';

export interface CommunityPost {
    id: string;
    authorId: string;
    authorName: string;
    authorPhotoURL?: string;
    content: string;
    tag: PostTag;
    createdAt: Timestamp;
    likeCount: number;
    commentCount: number;
    likedBy: string[];
}

export interface PostComment {
    id: string;
    postId: string;
    authorId: string;
    authorName: string;
    authorPhotoURL?: string;
    content: string;
    createdAt: Timestamp;
}
