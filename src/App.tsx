import { useState, useEffect } from 'react';
import * as db from './db';
import { User, Book, Recommendation, Poll, Activity, BookStatus } from './types';

// Preset colors for user avatars
const AVATAR_COLORS = [
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#f97316', // Orange
  '#6366f1', // Indigo
];

function App() {
  // State
  const [users, setUsers] = useState<User[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  
  // Navigation & Filtering Tabs
  const [currentTab, setCurrentTab] = useState<'feed' | 'shelf' | 'recs' | 'polls'>('feed');
  const [activeShelfTab, setActiveShelfTab] = useState<BookStatus>('reading');
  const [shelfUserIdFilter, setShelfUserIdFilter] = useState<string>('all');
  
  // Modals & Panels
  const [isAddBookOpen, setIsAddBookOpen] = useState(false);
  const [isRecommendOpen, setIsRecommendOpen] = useState(false);
  const [selectedBookForRec, setSelectedBookForRec] = useState<Book | null>(null);
  const [isCreatePollOpen, setIsCreatePollOpen] = useState(false);
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  
  // Form Inputs
  const [newUserName, setNewUserName] = useState('');
  const [newUserColor, setNewUserColor] = useState(AVATAR_COLORS[0]);
  const [friendName, setFriendName] = useState('');
  const [friendColor, setFriendColor] = useState(AVATAR_COLORS[1]);
  
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [bookGenre, setBookGenre] = useState('');
  const [bookStatus, setBookStatus] = useState<BookStatus>('reading');
  const [bookRating, setBookRating] = useState<number>(5);
  const [bookReview, setBookReview] = useState('');
  
  const [recToUserId, setRecToUserId] = useState('');
  const [recNote, setRecNote] = useState('');
  
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  // API Search State
  const [apiSearchQuery, setApiSearchQuery] = useState('');
  const [apiSearchResults, setApiSearchResults] = useState<{ title: string; author: string; genre: string; coverUrl?: string }[]>([]);
  const [isApiSearching, setIsApiSearching] = useState(false);
  const [selectedCoverUrl, setSelectedCoverUrl] = useState<string | undefined>(undefined);
  const [apiSearchError, setApiSearchError] = useState('');

  // Edit Book State
  const [isEditBookOpen, setIsEditBookOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [editBookTitle, setEditBookTitle] = useState('');
  const [editBookAuthor, setEditBookAuthor] = useState('');
  const [editBookGenre, setEditBookGenre] = useState('');
  const [editBookStatus, setEditBookStatus] = useState<BookStatus>('reading');
  const [editBookRating, setEditBookRating] = useState<number>(5);
  const [editBookReview, setEditBookReview] = useState('');
  const [editBookCoverUrl, setEditBookCoverUrl] = useState<string | undefined>(undefined);

  // Initial Load
  useEffect(() => {
    refreshAllData();
  }, []);

  const refreshAllData = async () => {
    const fetchedUsers = await db.getUsers();
    setUsers(fetchedUsers);
    
    const fetchedActiveId = db.getActiveUserId();
    if (fetchedActiveId && fetchedUsers.some(u => u.id === fetchedActiveId)) {
      setActiveUserId(fetchedActiveId);
    } else {
      setActiveUserId(null);
    }
    
    const [fetchedBooks, fetchedRecs, fetchedPolls, fetchedActivities] = await Promise.all([
      db.getBooks(),
      db.getRecommendations(),
      db.getPolls(),
      db.getActivities(),
    ]);

    setBooks(fetchedBooks);
    setRecs(fetchedRecs);
    setPolls(fetchedPolls);
    setActivities(fetchedActivities);
  };

  const activeUser = users.find(u => u.id === activeUserId) || null;

  // Onboarding Submit
  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;
    
    const createdUser = await db.addUser(newUserName.trim(), newUserColor);
    db.setActiveUserId(createdUser.id);
    setActiveUserId(createdUser.id);
    setNewUserName('');
    await refreshAllData();
  };

  // Add Friend Submit
  const handleAddFriendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendName.trim()) return;
    
    const createdUser = await db.addUser(friendName.trim(), friendColor);
    db.setActiveUserId(createdUser.id);
    setActiveUserId(createdUser.id);
    setFriendName('');
    setFriendColor(AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]);
    setIsAddFriendOpen(false);
    if (shelfUserIdFilter === activeUserId) {
      setShelfUserIdFilter(createdUser.id);
    }
    await refreshAllData();
  };

  const handleLogout = () => {
    db.setActiveUserId(null);
    setActiveUserId(null);
  };

  // API Search handler
  const handleApiSearch = async () => {
    if (!apiSearchQuery.trim()) return;

    setIsApiSearching(true);
    setApiSearchError('');
    setApiSearchResults([]);

    try {
      const response = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(apiSearchQuery.trim())}&limit=6`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch search results from Open Library.');
      }
      const data = await response.json();
      const results = (data.docs || []).map((doc: { title: string; author_name?: string[]; subject?: string[]; cover_i?: number }) => {
        const coverId = doc.cover_i;
        return {
          title: doc.title,
          author: doc.author_name?.[0] || 'Unknown Author',
          genre: doc.subject?.[0] || 'General',
          coverUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : undefined,
        };
      });
      setApiSearchResults(results);
      if (results.length === 0) {
        setApiSearchError('No books found. Try different search terms.');
      }
    } catch (err: unknown) {
      console.error(err);
      setApiSearchError('Unable to connect to the search API. Please fill details manually.');
    } finally {
      setIsApiSearching(false);
    }
  };

  const handleSelectApiBook = (book: { title: string; author: string; genre: string; coverUrl?: string }) => {
    setBookTitle(book.title);
    setBookAuthor(book.author);
    setBookGenre(book.genre);
    setSelectedCoverUrl(book.coverUrl);
    setApiSearchResults([]);
    setApiSearchQuery('');
  };

  // Add Book Submit
  const handleAddBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookTitle.trim() || !bookAuthor.trim() || !activeUserId) return;
    
    await db.addBook({
      title: bookTitle.trim(),
      author: bookAuthor.trim(),
      genre: bookGenre.trim() || 'General',
      status: bookStatus,
      rating: bookStatus === 'read' ? bookRating : undefined,
      review: bookStatus === 'read' ? bookReview.trim() : undefined,
      addedBy: activeUserId,
      coverUrl: selectedCoverUrl,
    });
    
    // Reset fields
    setBookTitle('');
    setBookAuthor('');
    setBookGenre('');
    setBookStatus('reading');
    setBookRating(5);
    setBookReview('');
    setSelectedCoverUrl(undefined);
    setApiSearchQuery('');
    setApiSearchResults([]);
    setIsAddBookOpen(false);
    
    await refreshAllData();
  };

  // Start Recommend Flow
  const openRecommendModal = (book: Book) => {
    setSelectedBookForRec(book);
    setIsRecommendOpen(true);
    // Auto-select first other user if available
    const otherUsers = users.filter(u => u.id !== activeUserId);
    if (otherUsers.length > 0) {
      setRecToUserId(otherUsers[0].id);
    }
  };

  // Submit Recommendation
  const handleRecommendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUserId || !recToUserId || !selectedBookForRec) return;
    
    await db.addRecommendation(activeUserId, recToUserId, selectedBookForRec.id, recNote.trim());
    
    setRecNote('');
    setIsRecommendOpen(false);
    setSelectedBookForRec(null);
    await refreshAllData();
  };

  // Create Poll Submit
  const handleCreatePollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = pollOptions.filter(o => o.trim() !== '');
    if (!pollQuestion.trim() || validOptions.length < 2) return;
    
    await db.createPoll(pollQuestion.trim(), validOptions);
    
    setPollQuestion('');
    setPollOptions(['', '']);
    setIsCreatePollOpen(false);
    await refreshAllData();
  };

  // Vote Cast
  const handleVote = async (pollId: string, optionIndex: number) => {
    if (!activeUserId) return;
    await db.castVote(pollId, activeUserId, optionIndex);
    await refreshAllData();
  };

  // Switch Active User
  const handleSwitchUser = async (userId: string) => {
    db.setActiveUserId(userId);
    setActiveUserId(userId);
    // If they were filtering by their own shelf, switch the filter to the new active user
    if (shelfUserIdFilter === activeUserId) {
      setShelfUserIdFilter(userId);
    }
    await refreshAllData();
  };

  // Copy Book to My Shelf
  const handleCopyToMyShelf = async (book: Book) => {
    if (!activeUserId) return;
    const allBooks = await db.getBooks();
    const userBooks = allBooks.filter(b => b.addedBy === activeUserId);
    const alreadyExists = userBooks.some(b => 
      b.title.toLowerCase() === book.title.toLowerCase() && 
      b.author.toLowerCase() === book.author.toLowerCase()
    );
    
    if (alreadyExists) {
      alert(`"${book.title}" is already on your shelf!`);
      return;
    }
    
    await db.addBook({
      title: book.title,
      author: book.author,
      genre: book.genre,
      status: 'tbr',
      addedBy: activeUserId,
      coverUrl: book.coverUrl,
    });
    
    alert(`Added "${book.title}" to your TBR shelf!`);
    await refreshAllData();
  };

  // Edit/Delete handlers
  const openEditBookModal = (book: Book) => {
    setEditingBook(book);
    setEditBookTitle(book.title);
    setEditBookAuthor(book.author);
    setEditBookGenre(book.genre);
    setEditBookStatus(book.status);
    setEditBookRating(book.rating || 5);
    setEditBookReview(book.review || '');
    setEditBookCoverUrl(book.coverUrl);
    setIsEditBookOpen(true);
  };

  const handleEditBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook || !editBookTitle.trim() || !editBookAuthor.trim()) return;

    await db.updateBook(editingBook.id, {
      title: editBookTitle.trim(),
      author: editBookAuthor.trim(),
      genre: editBookGenre.trim() || 'General',
      status: editBookStatus,
      rating: editBookStatus === 'read' ? editBookRating : undefined,
      review: editBookStatus === 'read' ? editBookReview.trim() : undefined,
      coverUrl: editBookCoverUrl,
    });

    setIsEditBookOpen(false);
    setEditingBook(null);
    await refreshAllData();
  };

  const handleDeleteBook = async (bookId: string) => {
    if (window.confirm('Are you sure you want to delete this book? This will also remove its reviews, recommendations, and activity logs.')) {
      await db.deleteBook(bookId);
      setIsEditBookOpen(false);
      setEditingBook(null);
      await refreshAllData();
    }
  };

  // Date formatter
  const formatTime = (timestamp: number) => {
    const diffMs = Date.now() - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Onboarding View
  if (users.length === 0) {
    return (
      <div className="app-container">
        <div className="onboarding-container">
          <div className="onboarding-logo">📖</div>
          <div>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Bespoke Book Club</h1>
            <p style={{ color: 'var(--text-secondary)' }}>A private dashboard to read, review, and recommend books with your inner circle.</p>
          </div>
          
          <div className="glass-panel onboarding-card glass-card-glow">
            <h2 style={{ fontSize: '1.4rem', marginBottom: '1.5rem', fontFamily: 'var(--font-sans)' }}>Create Your Profile</h2>
            <form onSubmit={handleOnboardingSubmit}>
              <div className="input-group">
                <label className="input-label">Your Name</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. Eleanor" 
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  required 
                />
              </div>
              <div className="input-group">
                <label className="input-label">Choose Profile Theme</label>
                <div className="color-picker-grid">
                  {AVATAR_COLORS.map(color => (
                    <div 
                      key={color} 
                      className={`color-option ${newUserColor === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewUserColor(color)}
                    />
                  ))}
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                Setup Book Club
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Profile Selection / Login View
  if (activeUserId === null) {
    return (
      <div className="app-container">
        <div className="login-container">
          <div className="login-logo">📖</div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', textAlign: 'center' }}>Bespoke Book Club</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', textAlign: 'center' }}>Who is reading today?</p>
          
          <div className="profile-grid">
            {users.map(u => (
              <div 
                key={u.id} 
                className="profile-card"
                onClick={() => handleSwitchUser(u.id)}
              >
                <div className="profile-avatar" style={{ backgroundColor: u.avatarColor }}>
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div className="profile-name">{u.name}</div>
              </div>
            ))}
            
            <div 
              className="profile-card add-profile"
              onClick={() => setIsAddFriendOpen(true)}
            >
              <div className="profile-avatar-placeholder">+</div>
              <div className="profile-name">Add Member</div>
            </div>
          </div>
        </div>

        {/* Add Friend Modal within Profile Selection */}
        {isAddFriendOpen && (
          <div className="modal-overlay">
            <div className="glass-panel modal-content">
              <button className="modal-close" onClick={() => setIsAddFriendOpen(false)}>×</button>
              <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem', fontFamily: 'var(--font-sans)' }}>Add Club Member</h2>
              
              <form onSubmit={handleAddFriendSubmit}>
                <div className="input-group">
                  <label className="input-label">Member's Name</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="e.g. Marcus"
                    value={friendName}
                    onChange={(e) => setFriendName(e.target.value)}
                    required 
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Avatar Color</label>
                  <div className="color-picker-grid">
                    {AVATAR_COLORS.map(color => (
                      <div 
                        key={color} 
                        className={`color-option ${friendColor === color ? 'selected' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setFriendColor(color)}
                      />
                    ))}
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Add Member</button>
                  <button type="button" onClick={() => setIsAddFriendOpen(false)} className="btn btn-secondary">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Active Poll Calculation helper
  const activePoll = polls.find(p => p.isActive);
  let totalVotes = 0;
  let optionVoteCounts: number[] = [];
  let userVotedOptionIndex: number | null = null;
  
  if (activePoll) {
    optionVoteCounts = activePoll.options.map(() => 0);
    Object.entries(activePoll.votes).forEach(([uId, optIndex]) => {
      if (optIndex >= 0 && optIndex < optionVoteCounts.length) {
        optionVoteCounts[optIndex]++;
        totalVotes++;
      }
      if (uId === activeUserId) {
        userVotedOptionIndex = optIndex;
      }
    });
  }

  return (
    <div className="app-container">
      {/* Upper header switcher */}
      <header className="header-bar">
        <div className="brand">
          <span className="brand-icon">📚</span>
          <span className="brand-title">Bespoke Reads</span>
        </div>
        
        {activeUser && (
          <div className="user-control">
            <div 
              className="avatar" 
              style={{ backgroundColor: activeUser.avatarColor }}
              title="Active user profile"
            >
              {activeUser.name.charAt(0).toUpperCase()}
            </div>
            <select 
              className="user-select"
              value={activeUserId || ''} 
              onChange={(e) => {
                if (e.target.value === 'logout') {
                  handleLogout();
                } else {
                  handleSwitchUser(e.target.value);
                }
              }}
            >
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} {u.id === activeUserId ? '(You)' : ''}
                </option>
              ))}
              <option value="logout">➡️ Switch Profile / Logout</option>
            </select>
          </div>
        )}
      </header>

      {/* Profile switcher slider bar */}
      <div className="glass-panel switch-user-card">
        {users.map(u => (
          <div 
            key={u.id} 
            className={`switch-user-item ${u.id === activeUserId ? 'active' : ''}`}
            onClick={() => handleSwitchUser(u.id)}
          >
            <div className="avatar" style={{ backgroundColor: u.avatarColor }}>
              {u.name.charAt(0).toUpperCase()}
            </div>
            <span>{u.name.split(' ')[0]}</span>
          </div>
        ))}
        <div 
          className="switch-user-item" 
          onClick={() => setIsAddFriendOpen(true)}
          style={{ justifyContent: 'center' }}
        >
          <div className="avatar" style={{ background: 'rgba(255,255,255,0.05)', border: '2px dashed rgba(255,255,255,0.2)' }}>
            +
          </div>
          <span>Add Friend</span>
        </div>
      </div>

      {/* Main Tab Renderings */}
      <main className="fade-in" style={{ flex: 1 }}>
        {currentTab === 'feed' && (
          <div>
            <div className="section-title-bar">
              <h2 className="section-title">Club Activity</h2>
            </div>
            
            {activities.length === 0 ? (
              <div className="glass-panel empty-state">
                <span className="empty-icon">📢</span>
                <p>Welcome! Add a book, rate a read, or suggest a book to kickstart the activity feed.</p>
              </div>
            ) : (
              <div className="feed-list">
                {activities.map(act => {
                  const actUser = users.find(u => u.id === act.userId);
                  if (!actUser) return null;
                  
                  return (
                    <div key={act.id} className="glass-panel feed-item" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                      <div className="avatar" style={{ backgroundColor: actUser.avatarColor, flexShrink: 0 }}>
                        {actUser.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="feed-content" style={{ flexGrow: 1 }}>
                        <div className="feed-title">
                          <strong>{actUser.name}</strong>{' '}
                          {act.type === 'add_book' && (
                            <>added <strong>{act.details.bookTitle}</strong> to their shelf</>
                          )}
                          {act.type === 'recommend' && (
                            <>recommended <strong>{act.details.bookTitle}</strong> to <strong>{act.details.toUserName}</strong></>
                          )}
                          {act.type === 'review' && (
                            <>reviewed <strong>{act.details.bookTitle}</strong> ({act.details.rating} ⭐)</>
                          )}
                          {act.type === 'vote' && (
                            <>voted in the poll: <em>"{act.details.pollQuestion}"</em></>
                          )}
                        </div>
                        <div className="feed-timestamp">{formatTime(act.timestamp)}</div>
                        
                        {act.type === 'review' && books.find(b => b.id === act.details.bookId)?.review && (
                          <div className="feed-note">
                            "{books.find(b => b.id === act.details.bookId)?.review}"
                          </div>
                        )}
                        {act.type === 'recommend' && recs.find(r => r.bookId === act.details.bookId && r.fromUserId === act.userId)?.note && (
                          <div className="feed-note">
                            "{recs.find(r => r.bookId === act.details.bookId && r.fromUserId === act.userId)?.note}"
                          </div>
                        )}
                      </div>
                      {act.details.coverUrl && (
                        <img 
                          src={act.details.coverUrl} 
                          alt={act.details.bookTitle} 
                          className="feed-item-cover"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {currentTab === 'shelf' && (
          <div>
            <div className="section-title-bar">
              <h2 className="section-title">Bookshelf</h2>
              <button onClick={() => setIsAddBookOpen(true)} className="btn btn-primary">
                Add Book
              </button>
            </div>

            {/* Shelf User Filtering capsules */}
            <div className="shelf-user-filters" style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
              <button 
                className={`shelf-tab-btn ${shelfUserIdFilter === 'all' ? 'active' : ''}`}
                style={{ flex: 'none', padding: '0.4rem 0.8rem' }}
                onClick={() => setShelfUserIdFilter('all')}
              >
                🌍 Everyone
              </button>
              {users.map(u => (
                <button
                  key={u.id}
                  className={`shelf-tab-btn ${shelfUserIdFilter === u.id ? 'active' : ''}`}
                  style={{ 
                    flex: 'none', 
                    padding: '0.4rem 0.8rem',
                    borderColor: shelfUserIdFilter === u.id ? u.avatarColor : 'var(--border-color)',
                    color: shelfUserIdFilter === u.id ? u.avatarColor : 'var(--text-secondary)'
                  }}
                  onClick={() => setShelfUserIdFilter(u.id)}
                >
                  <span 
                    className="avatar" 
                    style={{ 
                      display: 'inline-flex', 
                      width: '16px', 
                      height: '16px', 
                      fontSize: '0.55rem', 
                      marginRight: '0.35rem',
                      backgroundColor: u.avatarColor, 
                      border: 'none',
                      verticalAlign: 'middle'
                    }}
                  >
                    {u.name.charAt(0).toUpperCase()}
                  </span>
                  {u.name} {u.id === activeUserId ? '(You)' : ''}
                </button>
              ))}
            </div>

            <div className="shelf-tabs">
              <button 
                className={`shelf-tab-btn ${activeShelfTab === 'reading' ? 'active' : ''}`}
                onClick={() => setActiveShelfTab('reading')}
              >
                Reading
              </button>
              <button 
                className={`shelf-tab-btn ${activeShelfTab === 'tbr' ? 'active' : ''}`}
                onClick={() => setActiveShelfTab('tbr')}
              >
                TBR (To Read)
              </button>
              <button 
                className={`shelf-tab-btn ${activeShelfTab === 'read' ? 'active' : ''}`}
                onClick={() => setActiveShelfTab('read')}
              >
                Completed Reads
              </button>
            </div>

            {books.filter(b => {
              const matchStatus = b.status === activeShelfTab;
              const matchUser = shelfUserIdFilter === 'all' ? true : b.addedBy === shelfUserIdFilter;
              return matchStatus && matchUser;
            }).length === 0 ? (
              <div className="glass-panel empty-state">
                <span className="empty-icon">📚</span>
                <p>No books in this shelf yet.</p>
              </div>
            ) : (
              <div className="books-grid">
                {books
                  .filter(b => {
                    const matchStatus = b.status === activeShelfTab;
                    const matchUser = shelfUserIdFilter === 'all' ? true : b.addedBy === shelfUserIdFilter;
                    return matchStatus && matchUser;
                  })
                  .map(book => {
                    const adder = users.find(u => u.id === book.addedBy);
                    return (
                      <div key={book.id} className="glass-panel book-card book-card-with-cover">
                        {book.addedBy === activeUserId && (
                          <div className="book-card-actions">
                            <button 
                              type="button" 
                              className="book-card-action-btn edit" 
                              title="Edit Review / Details"
                              onClick={() => openEditBookModal(book)}
                            >
                              ✏️
                            </button>
                            <button 
                              type="button" 
                              className="book-card-action-btn delete" 
                              title="Delete Book"
                              onClick={() => handleDeleteBook(book.id)}
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                        
                        {book.coverUrl ? (
                          <div className="book-card-cover-container">
                            <div 
                              className="book-card-cover-blur" 
                              style={{ backgroundImage: `url(${book.coverUrl})` }}
                            />
                            <img src={book.coverUrl} alt={book.title} className="book-card-cover" />
                          </div>
                        ) : (
                          <div className="book-card-cover-placeholder">
                            <span>📖</span>
                            <span className="book-card-placeholder-text">{book.genre || 'General'}</span>
                          </div>
                        )}
                        
                        <div className="book-card-body">
                          <div>
                            <h3 className="book-title" style={{ marginTop: 0 }}>{book.title}</h3>
                            <p className="book-author">by {book.author}</p>
                            <span className="book-genre">{book.genre}</span>
                            
                            {book.rating && (
                              <div className="book-rating">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <span key={i}>{i < (book.rating || 0) ? '★' : '☆'}</span>
                                ))}
                              </div>
                            )}
                            
                            {book.review && (
                              <p className="book-review-snippet">"{book.review}"</p>
                            )}
                          </div>

                          <div className="book-footer" style={{ marginTop: '1rem' }}>
                            <span className="book-adder-tag">
                              <span 
                                className="avatar" 
                                style={{ 
                                  width: '18px', 
                                  height: '18px', 
                                  fontSize: '0.5rem', 
                                  backgroundColor: adder?.avatarColor || 'var(--text-muted)' 
                                }}
                              >
                                {adder?.name.charAt(0).toUpperCase() || '?'}
                              </span>
                              {adder?.name || 'Unknown'}
                            </span>
                            
                            {book.addedBy !== activeUserId ? (
                              <button 
                                onClick={() => handleCopyToMyShelf(book)} 
                                className="btn btn-primary"
                                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderRadius: '6px' }}
                              >
                                Add to TBR
                              </button>
                            ) : (
                              <button 
                                onClick={() => openRecommendModal(book)} 
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderRadius: '6px' }}
                              >
                                Recommend
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {currentTab === 'recs' && (
          <div>
            <div className="section-title-bar">
              <h2 className="section-title">Recommendations</h2>
            </div>
            
            {/* Filtered for active user */}
            {recs.filter(r => r.toUserId === activeUserId).length === 0 ? (
              <div className="glass-panel empty-state">
                <span className="empty-icon">🎁</span>
                <p>No recommendations waiting for you. Suggest a book to a friend to start the exchange!</p>
              </div>
            ) : (
              <div>
                {recs
                  .filter(r => r.toUserId === activeUserId)
                  .map(rec => {
                    const sender = users.find(u => u.id === rec.fromUserId);
                    const book = books.find(b => b.id === rec.bookId);
                    if (!sender || !book) return null;
                    
                    return (
                      <div key={rec.id} className="glass-panel rec-box">
                        <div className="rec-header">
                          <div className="rec-meta">
                            <div className="avatar" style={{ backgroundColor: sender.avatarColor, width: '24px', height: '24px', fontSize: '0.75rem' }}>
                              {sender.name.charAt(0).toUpperCase()}
                            </div>
                            <span>
                              <strong>{sender.name}</strong> suggested you read:
                            </span>
                          </div>
                          {!rec.read && <span className="unread-badge">New</span>}
                        </div>
                        
                        <div>
                          <h4 style={{ fontSize: '1.15rem' }}>{book.title}</h4>
                          <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>by {book.author}</p>
                        </div>

                        {rec.note && (
                          <p className="feed-note">"{rec.note}"</p>
                        )}
                        
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <button 
                            onClick={async () => {
                              await db.markRecommendationAsRead(rec.id);
                              // Copy book to active user shelf
                              await db.addBook({
                                title: book.title,
                                author: book.author,
                                genre: book.genre,
                                status: 'tbr',
                                addedBy: activeUserId || '',
                                coverUrl: book.coverUrl,
                              });
                              await refreshAllData();
                            }}
                            className="btn btn-primary"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '6px' }}
                          >
                            Add to My TBR Shelf
                          </button>
                          {!rec.read && (
                            <button 
                              onClick={async () => {
                                await db.markRecommendationAsRead(rec.id);
                                await refreshAllData();
                              }}
                              className="btn btn-secondary"
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '6px' }}
                            >
                              Dismiss
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {currentTab === 'polls' && (
          <div>
            <div className="section-title-bar">
              <h2 className="section-title">Book of the Month Polls</h2>
              {!activePoll && (
                <button onClick={() => setIsCreatePollOpen(true)} className="btn btn-primary">
                  New Poll
                </button>
              )}
            </div>

            {!activePoll ? (
              <div className="glass-panel empty-state">
                <span className="empty-icon">🗳️</span>
                <p>No active poll. Create a new poll to vote on the next book club read!</p>
              </div>
            ) : (
              <div className="glass-panel poll-card glass-card-glow">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>{activePoll.question}</h3>
                  <span style={{ fontSize: '0.8rem', background: 'rgba(245, 158, 11, 0.2)', padding: '0.2rem 0.5rem', borderRadius: '4px', color: 'var(--accent-amber)', fontWeight: 600 }}>Active</span>
                </div>
                
                <div className="poll-option-list">
                  {activePoll.options.map((option, index) => {
                    const votesForOption = optionVoteCounts[index] || 0;
                    const votePercent = totalVotes > 0 ? (votesForOption / totalVotes) * 100 : 0;
                    const hasVotedThis = userVotedOptionIndex === index;
                    
                    return (
                      <button 
                        key={index} 
                        className={`poll-option-btn ${hasVotedThis ? 'selected' : ''}`}
                        onClick={() => handleVote(activePoll.id, index)}
                      >
                        <div className="poll-option-bg" style={{ width: `${votePercent}%` }} />
                        <span className="poll-option-text">{option}</span>
                        <span className="poll-option-count">
                          {votesForOption} {votesForOption === 1 ? 'vote' : 'votes'} ({Math.round(votePercent)}%)
                        </span>
                      </button>
                    );
                  })}
                </div>
                
                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <span>Total votes: {totalVotes}</span>
                  <button 
                    onClick={async () => {
                      // Close poll
                      await db.endPoll(activePoll.id);
                      refreshAllData();
                    }}
                    className="btn btn-secondary" 
                    style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', borderRadius: '4px' }}
                  >
                    End Poll
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals definitions */}
      
      {/* 1. Add Book Modal */}
      {isAddBookOpen && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <button className="modal-close" onClick={() => {
              setIsAddBookOpen(false);
              setApiSearchQuery('');
              setApiSearchResults([]);
              setSelectedCoverUrl(undefined);
            }}>×</button>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem', fontFamily: 'var(--font-sans)' }}>Add Book to Shelf</h2>
            
            {/* Online Book Search (Open Library API) */}
            <div className="api-search-wrapper">
              <label className="input-label">Search Online (Autofill)</label>
              <div className="api-search-row">
                <input 
                  type="text" 
                  className="input-field api-search-input" 
                  placeholder="Search title, author, or ISBN..."
                  value={apiSearchQuery}
                  onChange={(e) => setApiSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleApiSearch();
                    }
                  }}
                />
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  disabled={isApiSearching}
                  onClick={handleApiSearch}
                >
                  {isApiSearching ? 'Searching...' : 'Search'}
                </button>
              </div>

              {isApiSearching && (
                <div className="api-search-loading">
                  <div className="api-search-loading-spinner"></div>
                  <span>Searching Open Library...</span>
                </div>
              )}

              {apiSearchError && (
                <div className="api-search-empty-state" style={{ color: '#f87171' }}>
                  {apiSearchError}
                </div>
              )}

              {!isApiSearching && apiSearchResults.length > 0 && (
                <div className="api-search-results-list">
                  {apiSearchResults.map((result, idx) => (
                    <div 
                      key={idx} 
                      className="api-search-result-item"
                      onClick={() => handleSelectApiBook(result)}
                    >
                      {result.coverUrl ? (
                        <img src={result.coverUrl} alt={result.title} className="api-search-result-cover" />
                      ) : (
                        <div className="api-search-result-cover">📖</div>
                      )}
                      <div className="api-search-result-info">
                        <div className="api-search-result-title">{result.title}</div>
                        <div className="api-search-result-author">by {result.author}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleAddBookSubmit}>
              {selectedCoverUrl && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '6px' }}>
                  <img src={selectedCoverUrl} alt="Cover preview" style={{ width: '30px', height: '45px', objectFit: 'cover', borderRadius: '3px' }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent-amber)' }}>Cover loaded successfully!</span>
                  <button type="button" style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }} onClick={() => setSelectedCoverUrl(undefined)}>×</button>
                </div>
              )}
              
              <div className="input-group">
                <label className="input-label">Title</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. Tomorrow, and Tomorrow, and Tomorrow"
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  required 
                />
              </div>
              <div className="input-group">
                <label className="input-label">Author</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. Gabrielle Zevin"
                  value={bookAuthor}
                  onChange={(e) => setBookAuthor(e.target.value)}
                  required 
                />
              </div>
              <div className="input-group">
                <label className="input-label">Genre</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. Fiction / Gaming"
                  value={bookGenre}
                  onChange={(e) => setBookGenre(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Shelf Status</label>
                <select 
                  className="select-field"
                  value={bookStatus}
                  onChange={(e) => setBookStatus(e.target.value as BookStatus)}
                >
                  <option value="reading">Currently Reading</option>
                  <option value="tbr">TBR (To Read)</option>
                  <option value="read">Completed Read</option>
                </select>
              </div>
              
              {bookStatus === 'read' && (
                <>
                  <div className="input-group">
                    <label className="input-label">Rating</label>
                    <select 
                      className="select-field"
                      value={bookRating}
                      onChange={(e) => setBookRating(Number(e.target.value))}
                    >
                      <option value={5}>⭐⭐⭐⭐⭐ (Excellent)</option>
                      <option value={4}>⭐⭐⭐⭐ (Great)</option>
                      <option value={3}>⭐⭐⭐ (Good)</option>
                      <option value={2}>⭐⭐ (Okay)</option>
                      <option value={1}>⭐ (Poor)</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Your Review</label>
                    <textarea 
                      className="textarea-field" 
                      rows={3} 
                      placeholder="Share your thoughts on the book..."
                      value={bookReview}
                      onChange={(e) => setBookReview(e.target.value)}
                    />
                  </div>
                </>
              )}
              
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Book</button>
                <button type="button" onClick={() => setIsAddBookOpen(false)} className="btn btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Add Friend Modal */}
      {isAddFriendOpen && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <button className="modal-close" onClick={() => setIsAddFriendOpen(false)}>×</button>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem', fontFamily: 'var(--font-sans)' }}>Add Club Member</h2>
            
            <form onSubmit={handleAddFriendSubmit}>
              <div className="input-group">
                <label className="input-label">Friend's Name</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. Marcus"
                  value={friendName}
                  onChange={(e) => setFriendName(e.target.value)}
                  required 
                />
              </div>
              <div className="input-group">
                <label className="input-label">Avatar Color</label>
                <div className="color-picker-grid">
                  {AVATAR_COLORS.map(color => (
                    <div 
                      key={color} 
                      className={`color-option ${friendColor === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFriendColor(color)}
                    />
                  ))}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Add Member</button>
                <button type="button" onClick={() => setIsAddFriendOpen(false)} className="btn btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2.5 Edit Book Modal */}
      {isEditBookOpen && editingBook && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <button className="modal-close" onClick={() => {
              setIsEditBookOpen(false);
              setEditingBook(null);
            }}>×</button>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem', fontFamily: 'var(--font-sans)' }}>Edit Book Details</h2>
            
            <form onSubmit={handleEditBookSubmit}>
              {editBookCoverUrl && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '6px' }}>
                  <img src={editBookCoverUrl} alt="Cover preview" style={{ width: '30px', height: '45px', objectFit: 'cover', borderRadius: '3px' }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent-amber)' }}>Book cover active</span>
                  <button type="button" style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }} onClick={() => setEditBookCoverUrl(undefined)}>×</button>
                </div>
              )}

              <div className="input-group">
                <label className="input-label">Title</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={editBookTitle}
                  onChange={(e) => setEditBookTitle(e.target.value)}
                  required 
                />
              </div>

              <div className="input-group">
                <label className="input-label">Author</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={editBookAuthor}
                  onChange={(e) => setEditBookAuthor(e.target.value)}
                  required 
                />
              </div>

              <div className="input-group">
                <label className="input-label">Genre</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={editBookGenre}
                  onChange={(e) => setEditBookGenre(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Shelf Status</label>
                <select 
                  className="select-field"
                  value={editBookStatus}
                  onChange={(e) => setEditBookStatus(e.target.value as BookStatus)}
                >
                  <option value="reading">Currently Reading</option>
                  <option value="tbr">TBR (To Read)</option>
                  <option value="read">Completed Read</option>
                </select>
              </div>

              {editBookStatus === 'read' && (
                <>
                  <div className="input-group">
                    <label className="input-label">Rating</label>
                    <select 
                      className="select-field"
                      value={editBookRating}
                      onChange={(e) => setEditBookRating(Number(e.target.value))}
                    >
                      <option value={5}>⭐⭐⭐⭐⭐ (Excellent)</option>
                      <option value={4}>⭐⭐⭐⭐ (Great)</option>
                      <option value={3}>⭐⭐⭐ (Good)</option>
                      <option value={2}>⭐⭐ (Okay)</option>
                      <option value={1}>⭐ (Poor)</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Your Review</label>
                    <textarea 
                      className="textarea-field" 
                      rows={3} 
                      placeholder="Share your thoughts on the book..."
                      value={editBookReview}
                      onChange={(e) => setEditBookReview(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Changes</button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={() => handleDeleteBook(editingBook.id)}
                >
                  Delete Book
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setIsEditBookOpen(false);
                    setEditingBook(null);
                  }} 
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Recommend Book Modal */}
      {isRecommendOpen && selectedBookForRec && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <button className="modal-close" onClick={() => setIsRecommendOpen(false)}>×</button>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '0.25rem', fontFamily: 'var(--font-sans)' }}>Recommend Book</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Recommend <strong>{selectedBookForRec.title}</strong> to a fellow book club member.
            </p>
            
            <form onSubmit={handleRecommendSubmit}>
              <div className="input-group">
                <label className="input-label">Choose Friend</label>
                <select 
                  className="select-field"
                  value={recToUserId}
                  onChange={(e) => setRecToUserId(e.target.value)}
                  required
                >
                  {users.filter(u => u.id !== activeUserId).map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                  {users.filter(u => u.id !== activeUserId).length === 0 && (
                    <option value="">No other friends added yet</option>
                  )}
                </select>
              </div>
              
              <div className="input-group">
                <label className="input-label">Personal Message</label>
                <textarea 
                  className="textarea-field" 
                  rows={3} 
                  placeholder="Why should they read this? e.g. 'I know you love cyberpunk worldbuilding, this is right up your alley!'"
                  value={recNote}
                  onChange={(e) => setRecNote(e.target.value)}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                  disabled={users.filter(u => u.id !== activeUserId).length === 0}
                >
                  Send Recommendation
                </button>
                <button type="button" onClick={() => setIsRecommendOpen(false)} className="btn btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Create Poll Modal */}
      {isCreatePollOpen && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <button className="modal-close" onClick={() => setIsCreatePollOpen(false)}>×</button>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '1.25rem', fontFamily: 'var(--font-sans)' }}>Create New Book Poll</h2>
            
            <form onSubmit={handleCreatePollSubmit}>
              <div className="input-group">
                <label className="input-label">Question</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. What should we read in July?"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  required 
                />
              </div>
              
              <div className="input-group">
                <label className="input-label">Options</label>
                {pollOptions.map((opt, i) => (
                  <div key={i} className="poll-option-input-row">
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder={`Option ${i + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...pollOptions];
                        newOpts[i] = e.target.value;
                        setPollOptions(newOpts);
                      }}
                      required={i < 2} 
                    />
                    {pollOptions.length > 2 && (
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-icon-only" 
                        onClick={() => {
                          const newOpts = pollOptions.filter((_, idx) => idx !== i);
                          setPollOptions(newOpts);
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                
                {pollOptions.length < 5 && (
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ fontSize: '0.85rem', padding: '0.5rem', marginTop: '0.25rem' }}
                    onClick={() => setPollOptions([...pollOptions, ''])}
                  >
                    + Add Option
                  </button>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Launch Poll</button>
                <button type="button" onClick={() => setIsCreatePollOpen(false)} className="btn btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sticky Bottom Tab Nav */}
      <nav className="nav-tabs">
        <button 
          className={`nav-tab-btn ${currentTab === 'feed' ? 'active' : ''}`}
          onClick={() => setCurrentTab('feed')}
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 11a9 9 0 0 1 9 9" />
            <path d="M4 4a16 16 0 0 1 16 16" />
            <circle cx="5" cy="19" r="1" fill="currentColor" />
          </svg>
          Activity
        </button>
        
        <button 
          className={`nav-tab-btn ${currentTab === 'shelf' ? 'active' : ''}`}
          onClick={() => setCurrentTab('shelf')}
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          Bookshelf
        </button>
        
        <button 
          className={`nav-tab-btn ${currentTab === 'recs' ? 'active' : ''}`}
          onClick={() => setCurrentTab('recs')}
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          Suggestions
          {recs.filter(r => r.toUserId === activeUserId && !r.read).length > 0 && (
            <span className="unread-badge" style={{ position: 'absolute', top: '2px', right: '15px' }}>
              {recs.filter(r => r.toUserId === activeUserId && !r.read).length}
            </span>
          )}
        </button>
        
        <button 
          className={`nav-tab-btn ${currentTab === 'polls' ? 'active' : ''}`}
          onClick={() => setCurrentTab('polls')}
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          Polls
        </button>
      </nav>
    </div>
  );
}

export default App;
