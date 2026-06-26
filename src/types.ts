export interface User {
  id: string;
  name: string;
  avatarColor: string; // HEX or HSL color value for profile styling
  createdAt: number;
}

export type BookStatus = 'reading' | 'tbr' | 'read';

export interface Book {
  id: string;
  title: string;
  author: string;
  genre: string;
  status: BookStatus;
  rating?: number; // 1 to 5 stars, optional if not read yet
  review?: string; // review text, optional
  addedBy: string; // User ID of the member who added it
  updatedAt: number;
  coverUrl?: string; // Optional URL for the book cover image
}

export interface Recommendation {
  id: string;
  fromUserId: string;
  toUserId: string;
  bookId: string;
  note: string;
  timestamp: number;
  read: boolean;
}

export interface Poll {
  id: string;
  question: string;
  options: string[]; // List of book titles/choices
  votes: Record<string, number>; // Maps userId -> index of selected option
  createdAt: number;
  isActive: boolean;
}

export interface Activity {
  id: string;
  userId: string;
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
  timestamp: number;
}
