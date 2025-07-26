
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Loader2, MessageCircle, ThumbsUp, Send, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { CommunityPost, PostComment } from '@/types/community';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

export default function PostDetailsPage() {
    const { t } = useLanguage();
    const { user } = useAuth();
    const { toast } = useToast();
    const params = useParams();
    const router = useRouter();
    const postId = params.postId as string;

    const [post, setPost] = useState<CommunityPost | null>(null);
    const [comments, setComments] = useState<PostComment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCommenting, setIsCommenting] = useState(false);

    const { register, handleSubmit, reset } = useForm<{ content: string }>();

    useEffect(() => {
        if (!postId) return;

        const fetchPost = async () => {
            setIsLoading(true);
            const docRef = doc(db, 'posts', postId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                setPost({ id: docSnap.id, ...docSnap.data() } as CommunityPost);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Post not found.' });
            }
            setIsLoading(false);
        };

        fetchPost();

        const q = query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'asc'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const fetchedComments: PostComment[] = [];
            querySnapshot.forEach((doc) => {
                fetchedComments.push({ id: doc.id, ...doc.data() } as PostComment);
            });
            setComments(fetchedComments);
        });

        return () => unsubscribe();

    }, [postId, toast]);

    const onCommentSubmit = async (data: { content: string }) => {
        if (!user) return;
        setIsCommenting(true);
        try {
            const postRef = doc(db, 'posts', postId);
            await addDoc(collection(postRef, 'comments'), {
                postId: postId,
                authorId: user.uid,
                authorName: user.displayName,
                authorPhotoURL: user.photoURL,
                content: data.content,
                createdAt: serverTimestamp(),
            });
            await updateDoc(postRef, {
                commentCount: increment(1)
            });
            reset();
        } catch (error) {
            console.error("Error adding comment:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not post your comment.' });
        } finally {
            setIsCommenting(false);
        }
    };
    
    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
    }

    if (!post) {
        return <div className="text-center text-muted-foreground py-10">Post not found.</div>;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
        >
            <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2" /> Back to Community</Button>

            <Card>
                 <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                    <Avatar>
                        <AvatarImage src={post.authorPhotoURL || `https://avatar.vercel.sh/${post.authorId}.png`} />
                        <AvatarFallback>{post.authorName ? post.authorName.charAt(0) : 'A'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <p className="font-semibold">{post.authorName}</p>
                        <p className="text-xs text-muted-foreground">
                            {post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                        </p>
                    </div>
                    <div className="text-xs bg-primary/10 text-primary font-medium px-2 py-1 rounded-full">{post.tag}</div>
                </CardHeader>
                <CardContent>
                    <p className="whitespace-pre-wrap text-lg">{post.content}</p>
                </CardContent>
                <CardFooter>
                     <div className="text-sm text-muted-foreground flex items-center gap-4">
                        <span className="flex items-center gap-1"><ThumbsUp size={16}/> {post.likeCount || 0}</span>
                        <span className="flex items-center gap-1"><MessageCircle size={16}/> {comments.length}</span>
                    </div>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t('comments')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {comments.map(comment => (
                        <div key={comment.id} className="flex items-start gap-3">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={comment.authorPhotoURL || `https://avatar.vercel.sh/${comment.authorId}.png`} />
                                <AvatarFallback>{comment.authorName ? comment.authorName.charAt(0) : 'U'}</AvatarFallback>
                            </Avatar>
                            <div className="bg-muted p-3 rounded-lg flex-1">
                                <div className="flex items-baseline gap-2">
                                    <p className="font-semibold text-sm">{comment.authorName}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {comment.createdAt ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true }) : ''}
                                    </p>
                                </div>
                                <p className="text-sm mt-1">{comment.content}</p>
                            </div>
                        </div>
                    ))}
                    {comments.length === 0 && <p className="text-muted-foreground text-center py-4">No comments yet. Be the first to reply!</p>}
                </CardContent>
                <Separator />
                <CardFooter className="pt-6">
                    <form onSubmit={handleSubmit(onCommentSubmit)} className="w-full flex items-start gap-3">
                         <Avatar>
                            <AvatarImage src={user?.photoURL || `https://avatar.vercel.sh/${user?.uid}.png`} />
                            <AvatarFallback>{user?.displayName?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        <Textarea 
                            {...register('content', { required: true })}
                            placeholder={t('addComment')}
                            disabled={!user || isCommenting}
                        />
                        <Button type="submit" disabled={!user || isCommenting}>
                            {isCommenting ? <Loader2 className="animate-spin"/> : <Send />}
                        </Button>
                    </form>
                </CardFooter>
            </Card>
        </motion.div>
    );
}

