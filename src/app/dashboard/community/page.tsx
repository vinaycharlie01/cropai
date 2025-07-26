
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, MessageCircle, Send, ThumbsUp, PlusCircle, Filter } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, increment, getDoc, where } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { CommunityPost, PostTag } from '@/types/community';
import Link from 'next/link';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const postTags: PostTag[] = ['Help', 'Discussion', 'Sell Together', 'Advice'];


// Post Card Component
function PostCard({ post }: { post: CommunityPost }) {
    const { t } = useLanguage();
    const { user } = useAuth();
    const { toast } = useToast();
    const [likeCount, setLikeCount] = useState(post.likeCount || 0);

    const handleLike = async () => {
        if (!user) return;
        const postRef = doc(db, 'posts', post.id);
        
        try {
            const postDoc = await getDoc(postRef);
            if(postDoc.exists()){
                const postData = postDoc.data();
                const likedBy = postData.likedBy || [];

                if(likedBy.includes(user.uid)){
                    toast({variant: 'destructive', description: "You've already liked this post."})
                    return;
                }
                 await updateDoc(postRef, {
                    likeCount: increment(1),
                    likedBy: [...likedBy, user.uid]
                });
                setLikeCount(prev => prev + 1);
            }
        } catch (error) {
            console.error("Error liking post:", error);
            toast({ variant: 'destructive', title: t('error'), description: 'Could not like post.' });
        }
    };
    
    return (
        <Card className="bg-background hover:shadow-md transition-shadow duration-300">
            <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                <Avatar>
                    <AvatarImage src={post.authorPhotoURL || `https://avatar.vercel.sh/${post.authorId}.png`} />
                    <AvatarFallback>{post.authorName.charAt(0)}</AvatarFallback>
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
                <Link href={`/dashboard/community/${post.id}`} className="hover:underline">
                    <p className="whitespace-pre-wrap">{post.content}</p>
                </Link>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
                 <Button variant="ghost" size="sm" onClick={handleLike} disabled={!user}>
                    <ThumbsUp className="mr-2" /> {likeCount} {t('interested')}
                </Button>
                <Link href={`/dashboard/community/${post.id}`}>
                    <Button variant="outline" size="sm">
                        <MessageCircle className="mr-2" /> {post.commentCount || 0} {t('comments')}
                    </Button>
                </Link>
            </CardFooter>
        </Card>
    )
}

// Create Post Form Component
function CreatePostForm({ onPostCreated }: { onPostCreated: () => void }) {
    const { t } = useLanguage();
    const { toast } = useToast();
    const { user } = useAuth();
    const { register, handleSubmit, control, reset, formState: { errors } } = useForm<{ content: string, tag: PostTag }>();
    const [isLoading, setIsLoading] = useState(false);

    const onSubmit = async (data: { content: string, tag: PostTag }) => {
        if (!user) {
            toast({ variant: 'destructive', title: t('error'), description: 'You must be logged in to post.' });
            return;
        }
        setIsLoading(true);
        try {
            await addDoc(collection(db, 'posts'), {
                content: data.content,
                tag: data.tag,
                authorId: user.uid,
                authorName: user.displayName || 'Anonymous Farmer',
                authorPhotoURL: user.photoURL || '',
                createdAt: serverTimestamp(),
                likeCount: 0,
                commentCount: 0,
                likedBy: []
            });
            toast({ title: 'Success', description: 'Your post has been published.' });
            reset();
            onPostCreated();
        } catch (error) {
            console.error("Error creating post:", error);
            toast({ variant: 'destructive', title: t('error'), description: 'Could not publish your post.' });
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
                <Label htmlFor="content">{t('postPlaceholder')}</Label>
                <Textarea id="content" {...register('content', { required: true })} className="mt-2 min-h-[120px]" />
            </div>
             <div>
                <Label>{t('postType')}</Label>
                <Controller
                    name="tag"
                    control={control}
                    rules={{ required: true }}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger><SelectValue placeholder="Select a tag" /></SelectTrigger>
                            <SelectContent>
                                {postTags.map(tag => (
                                    <SelectItem key={tag} value={tag}>{t(`postType${tag.replace(/\s+/g, '')}` as any)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                />
            </div>
            <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? <Loader2 className="animate-spin" /> : <Send />}
                {t('post')}
            </Button>
        </form>
    )
}

// Main Community Page
export default function CommunityPage() {
    const { t } = useLanguage();
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [tagFilter, setTagFilter] = useState<PostTag | 'All'>('All');

    useEffect(() => {
        setIsLoading(true);
        let q;
        if (tagFilter === 'All') {
            q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        } else {
            q = query(collection(db, "posts"), where("tag", "==", tagFilter), orderBy("createdAt", "desc"));
        }

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const fetchedPosts: CommunityPost[] = [];
            querySnapshot.forEach((doc) => {
                fetchedPosts.push({ id: doc.id, ...doc.data() } as CommunityPost);
            });
            setPosts(fetchedPosts);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching posts:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [tagFilter]);
    
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
        >
            <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <div>
                        <CardTitle className="font-headline text-2xl">{t('communityTitle')}</CardTitle>
                        <p className="text-muted-foreground">{t('communityDescLong')}</p>
                    </div>
                     <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <DialogTrigger asChild>
                           <Button><PlusCircle className="mr-2" /> {t('newPost')}</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{t('newPost')}</DialogTitle>
                            </DialogHeader>
                            <CreatePostForm onPostCreated={() => setIsFormOpen(false)} />
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 mb-4">
                        <Filter className="text-muted-foreground" />
                        <Select value={tagFilter} onValueChange={(value) => setTagFilter(value as any)}>
                            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Posts</SelectItem>
                                {postTags.map(tag => (
                                    <SelectItem key={tag} value={tag}>{t(`postType${tag.replace(/\s+/g, '')}` as any)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
            ) : posts.length > 0 ? (
                <div className="space-y-6">
                    {posts.map(post => <PostCard key={post.id} post={post} />)}
                </div>
            ) : (
                <Card>
                    <CardContent className="pt-6 text-center text-muted-foreground">
                        <p>No posts found.</p>
                        <p>Be the first to start a conversation!</p>
                    </CardContent>
                </Card>
            )}
        </motion.div>
    );
}
