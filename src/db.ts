import { createClient } from '@supabase/supabase-js';
import { User, Book, Recommendation, Poll, Activity } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

console.log('--- SUPABASE ENV CHECK ---');
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY);
console.log('--------------------------');

interface DbUser {
  id: string;
  name: string;
  avatar_color: string;
  created_at: string | number;
}

interface DbBook {
  id: string;
  title: string;
  author: string;
  genre: string;
  status: 'reading' | 'tbr' | 'read';
  rating?: number | null;
  review?: string | null;
  added_by: string;
  updated_at: string | number;
  cover_url?: string | null;
}

interface DbRecommendation {
  id: string;
  from_user_id: string;
  to_user_id: string;
  book_id: string;
  note?: string;
  timestamp: string | number;
  read: boolean;
}

interface DbPoll {
  id: string;
  question: string;
  options: string[];
  votes?: Record<string, number>;
  created_at: string | number;
  is_active: boolean;
}

interface DbActivity {
  id: string;
  user_id: string;
  type: 'add_book' | 'recommend' | 'vote' | 'review';
  details: {
    bookId?: string;
    bookTitle?: string;
    bookAuthor?: string;
    toUserId?: string;
    toUserName?: string;
    pollQuestion?: string;
    pollId?: string;
    rating?: number;
    coverUrl?: string;
  };
  timestamp: string | number;
}

const KEYS = {
  ACTIVE_USER_ID: 'bookclub_active_user_id',
};

// Session storage helpers for Active User (specific to local device)
export function getActiveUserId(): string | null {
  return localStorage.getItem(KEYS.ACTIVE_USER_ID);
}

export function setActiveUserId(id: string | null): void {
  if (id) {
    localStorage.setItem(KEYS.ACTIVE_USER_ID, id);
  } else {
    localStorage.removeItem(KEYS.ACTIVE_USER_ID);
  }
}

// User Actions
export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }

  return (data || []).map((u: DbUser) => ({
    id: u.id,
    name: u.name,
    avatarColor: u.avatar_color,
    createdAt: Number(u.created_at),
  }));
}

export async function addUser(name: string, avatarColor: string): Promise<User> {
  const newUser: User = {
    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    avatarColor,
    createdAt: Date.now(),
  };

  const { error } = await supabase
    .from('users')
    .insert({
      id: newUser.id,
      name: newUser.name,
      avatar_color: newUser.avatarColor,
      created_at: newUser.createdAt,
    });

  if (error) {
    console.error('Error adding user:', error);
  }

  return newUser;
}

// Book Actions
export async function getBooks(): Promise<Book[]> {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching books:', error);
    return [];
  }

  return (data || []).map((b: DbBook) => ({
    id: b.id,
    title: b.title,
    author: b.author,
    genre: b.genre,
    status: b.status,
    rating: b.rating ?? undefined,
    review: b.review ?? undefined,
    addedBy: b.added_by,
    updatedAt: Number(b.updated_at),
    coverUrl: b.cover_url ?? undefined,
  }));
}

export async function addBook(bookData: Omit<Book, 'id' | 'updatedAt'>): Promise<Book> {
  const newBook: Book = {
    ...bookData,
    id: `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    updatedAt: Date.now(),
  };

  const { error } = await supabase
    .from('books')
    .insert({
      id: newBook.id,
      title: newBook.title,
      author: newBook.author,
      genre: newBook.genre,
      status: newBook.status,
      rating: newBook.rating ?? null,
      review: newBook.review ?? null,
      added_by: newBook.addedBy,
      updated_at: newBook.updatedAt,
      cover_url: newBook.coverUrl ?? null,
    });

  if (error) {
    console.error('Error adding book:', error);
  }

  // Log activity
  await logActivity(bookData.addedBy, 'add_book', {
    bookId: newBook.id,
    bookTitle: newBook.title,
    bookAuthor: newBook.author,
    coverUrl: newBook.coverUrl,
  });

  return newBook;
}

export async function updateBook(id: string, updates: Partial<Omit<Book, 'id' | 'addedBy'>>): Promise<Book | null> {
  const { data: currentBooks, error: fetchErr } = await supabase
    .from('books')
    .select('*')
    .eq('id', id);

  if (fetchErr || !currentBooks || currentBooks.length === 0) {
    console.error('Error finding book to update:', fetchErr);
    return null;
  }

  const currentBook = currentBooks[0];
  const updatedAt = Date.now();

  const dbUpdates: Record<string, string | number | null> = {
    updated_at: updatedAt,
  };
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.author !== undefined) dbUpdates.author = updates.author;
  if (updates.genre !== undefined) dbUpdates.genre = updates.genre;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.rating !== undefined) dbUpdates.rating = updates.rating ?? null;
  if (updates.review !== undefined) dbUpdates.review = updates.review ?? null;
  if (updates.coverUrl !== undefined) dbUpdates.cover_url = updates.coverUrl ?? null;

  const { error: updateErr } = await supabase
    .from('books')
    .update(dbUpdates)
    .eq('id', id);

  if (updateErr) {
    console.error('Error updating book:', updateErr);
    return null;
  }

  const updatedBook: Book = {
    id,
    title: updates.title ?? currentBook.title,
    author: updates.author ?? currentBook.author,
    genre: updates.genre ?? currentBook.genre,
    status: updates.status ?? currentBook.status,
    rating: updates.rating !== undefined ? (updates.rating ?? undefined) : (currentBook.rating ?? undefined),
    review: updates.review !== undefined ? (updates.review ?? undefined) : (currentBook.review ?? undefined),
    addedBy: currentBook.added_by,
    updatedAt,
    coverUrl: updates.coverUrl !== undefined ? (updates.coverUrl ?? undefined) : (currentBook.cover_url ?? undefined),
  };

  // If status is updated or review is added, log activity
  if (updates.review || updates.rating) {
    await logActivity(updatedBook.addedBy, 'review', {
      bookId: id,
      bookTitle: updatedBook.title,
      bookAuthor: updatedBook.author,
      rating: updates.rating,
      coverUrl: updatedBook.coverUrl,
    });
  }

  return updatedBook;
}

export async function deleteBook(id: string): Promise<void> {
  const { error } = await supabase
    .from('books')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting book:', error);
  }
}

// Recommendation Actions
export async function getRecommendations(): Promise<Recommendation[]> {
  const { data, error } = await supabase
    .from('recommendations')
    .select('*')
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('Error fetching recommendations:', error);
    return [];
  }

  return (data || []).map((r: DbRecommendation) => ({
    id: r.id,
    fromUserId: r.from_user_id,
    toUserId: r.to_user_id,
    bookId: r.book_id,
    note: r.note || '',
    timestamp: Number(r.timestamp),
    read: r.read,
  }));
}

export async function addRecommendation(fromUserId: string, toUserId: string, bookId: string, note: string): Promise<Recommendation> {
  const newRec: Recommendation = {
    id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    fromUserId,
    toUserId,
    bookId,
    note,
    timestamp: Date.now(),
    read: false,
  };

  const { error } = await supabase
    .from('recommendations')
    .insert({
      id: newRec.id,
      from_user_id: newRec.fromUserId,
      to_user_id: newRec.toUserId,
      book_id: newRec.bookId,
      note: newRec.note,
      timestamp: newRec.timestamp,
      read: newRec.read,
    });

  if (error) {
    console.error('Error adding recommendation:', error);
  }

  // Fetch book and user to build activity log
  const { data: books } = await supabase.from('books').select('title, author, cover_url').eq('id', bookId);
  const { data: users } = await supabase.from('users').select('name').eq('id', toUserId);
  
  const book = books?.[0];
  const toUser = users?.[0];

  await logActivity(fromUserId, 'recommend', {
    bookId,
    bookTitle: book?.title || 'Unknown Book',
    bookAuthor: book?.author || 'Unknown Author',
    toUserId,
    toUserName: toUser?.name || 'Someone',
    coverUrl: book?.cover_url || undefined,
  });

  return newRec;
}

export async function markRecommendationAsRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('recommendations')
    .update({ read: true })
    .eq('id', id);

  if (error) {
    console.error('Error marking recommendation as read:', error);
  }
}

// Poll Actions
export async function getPolls(): Promise<Poll[]> {
  const { data, error } = await supabase
    .from('polls')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching polls:', error);
    return [];
  }

  return (data || []).map((p: DbPoll) => ({
    id: p.id,
    question: p.question,
    options: p.options,
    votes: p.votes || {},
    createdAt: Number(p.created_at),
    isActive: p.is_active,
  }));
}

export async function createPoll(question: string, options: string[]): Promise<Poll> {
  const newPoll: Poll = {
    id: `poll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    question,
    options,
    votes: {},
    createdAt: Date.now(),
    isActive: true,
  };

  const { error } = await supabase
    .from('polls')
    .insert({
      id: newPoll.id,
      question: newPoll.question,
      options: newPoll.options,
      votes: newPoll.votes,
      created_at: newPoll.createdAt,
      is_active: newPoll.isActive,
    });

  if (error) {
    console.error('Error creating poll:', error);
  }

  return newPoll;
}

export async function castVote(pollId: string, userId: string, optionIndex: number): Promise<void> {
  const { data: currentPolls, error: fetchErr } = await supabase
    .from('polls')
    .select('votes, question')
    .eq('id', pollId);

  if (fetchErr || !currentPolls || currentPolls.length === 0) {
    console.error('Error fetching poll to vote:', fetchErr);
    return;
  }

  const poll = currentPolls[0];
  const votes = { ...(poll.votes || {}) };
  votes[userId] = optionIndex;

  const { error: updateErr } = await supabase
    .from('polls')
    .update({ votes })
    .eq('id', pollId);

  if (updateErr) {
    console.error('Error saving vote:', updateErr);
    return;
  }

  // Log activity
  await logActivity(userId, 'vote', {
    pollQuestion: poll.question,
    pollId,
  });
}

export async function endPoll(pollId: string): Promise<void> {
  const { error } = await supabase
    .from('polls')
    .update({ is_active: false })
    .eq('id', pollId);

  if (error) {
    console.error('Error ending poll:', error);
  }
}

// Activity Feed Actions
export async function getActivities(): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('Error fetching activities:', error);
    return [];
  }

  return (data || []).map((a: DbActivity) => ({
    id: a.id,
    userId: a.user_id,
    type: a.type as Activity['type'],
    details: a.details,
    timestamp: Number(a.timestamp),
  }));
}

export async function logActivity(userId: string, type: Activity['type'], details: Activity['details']): Promise<Activity> {
  const newAct: Activity = {
    id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    type,
    details,
    timestamp: Date.now(),
  };

  const { error } = await supabase
    .from('activities')
    .insert({
      id: newAct.id,
      user_id: newAct.userId,
      type: newAct.type,
      details: newAct.details,
      timestamp: newAct.timestamp,
    });

  if (error) {
    console.error('Error logging activity:', error);
  }

  return newAct;
}

// Complete Database Reset
export async function resetDatabase(): Promise<void> {
  await supabase.from('activities').delete().neq('id', '');
  await supabase.from('polls').delete().neq('id', '');
  await supabase.from('recommendations').delete().neq('id', '');
  await supabase.from('books').delete().neq('id', '');
  await supabase.from('users').delete().neq('id', '');
  localStorage.removeItem(KEYS.ACTIVE_USER_ID);
}
