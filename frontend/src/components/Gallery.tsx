import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

const API = 'http://localhost:4000';

interface GalleryWork {
  _id: string;
  studentAddress: string;
  title: string;
  description?: string;
  fileUrl?: string;
  tokenId?: string;
  txHash?: string;
  isEndorsed: boolean;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
}

interface Comment {
  _id: string;
  workId: string;
  userAddress: string;
  content: string;
  createdAt: string;
}

export function Gallery() {
  const { address, getAuthHeaders } = useAuth();
  const [works, setWorks] = useState<GalleryWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'newest' | 'likes'>('newest');
  const [selectedWork, setSelectedWork] = useState<GalleryWork | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (address) {
      loadGallery();
    }
  }, [address, sortBy]);

  const loadGallery = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API}/api/gallery`, { headers });

      if (response.ok) {
        let worksData = await response.json();

        // 排序作品
        if (sortBy === 'likes') {
          worksData.sort((a: GalleryWork, b: GalleryWork) => b.likesCount - a.likesCount);
        } else {
          worksData.sort((a: GalleryWork, b: GalleryWork) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }

        setWorks(worksData);

        // 加载用户的点赞状态
        await loadUserLikes(worksData);
      }
    } catch (error) {
      console.error('Failed to load gallery:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserLikes = async (worksData: GalleryWork[]) => {
    try {
      const headers = getAuthHeaders();
      const likesPromises = worksData.map(work =>
        fetch(`${API}/api/student-work/${work._id}/like`, { headers })
          .then(res => res.json())
          .then(data => ({ workId: work._id, hasLiked: data.hasLiked }))
          .catch(() => ({ workId: work._id, hasLiked: false }))
      );

      const likesResults = await Promise.all(likesPromises);
      const likedWorkIds = new Set(
        likesResults.filter(result => result.hasLiked).map(result => result.workId)
      );

      setUserLikes(likedWorkIds);
    } catch (error) {
      console.error('Failed to load user likes:', error);
    }
  };

  const handleLike = async (workId: string) => {
    try {
      const headers = getAuthHeaders();
      const method = userLikes.has(workId) ? 'DELETE' : 'POST';
      const response = await fetch(`${API}/api/student-work/${workId}/like`, {
        method,
        headers
      });

      if (response.ok) {
        const data = await response.json();

        // 更新本地状态
        setWorks(prev => prev.map(work =>
          work._id === workId
            ? { ...work, likesCount: data.likesCount }
            : work
        ));

        // 更新用户点赞状态
        if (method === 'POST') {
          setUserLikes(prev => new Set([...prev, workId]));
        } else {
          setUserLikes(prev => {
            const newSet = new Set(prev);
            newSet.delete(workId);
            return newSet;
          });
        }
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  const handleViewComments = async (work: GalleryWork) => {
    setSelectedWork(work);
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API}/api/student-work/${work._id}/comments`, { headers });

      if (response.ok) {
        const commentsData = await response.json();
        setComments(commentsData);
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const handleAddComment = async () => {
    if (!selectedWork || !newComment.trim()) return;

    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API}/api/student-work/${selectedWork._id}/comment`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: newComment.trim() })
      });

      if (response.ok) {
        const newCommentData = await response.json();
        setComments(prev => [newCommentData, ...prev]);
        setNewComment('');

        // 更新作品的评论数
        setWorks(prev => prev.map(work =>
          work._id === selectedWork._id
            ? { ...work, commentsCount: work.commentsCount + 1 }
            : work
        ));
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (loading) {
    return (
      <div className="gallery-container">
        <div className="gallery-loading">
          <div className="loading-spinner">Loading gallery...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="gallery-container">
      <div className="gallery-header">
        <div className="header-icon">🎨</div>
        <div className="header-content">
          <h2>作品画廊</h2>
          <p>欣赏同学们的创意作品，为优秀作品点赞和评论</p>
        </div>
      </div>

      <div className="gallery-controls">
        <div className="sort-controls">
          <button
            className={`sort-btn ${sortBy === 'newest' ? 'active' : ''}`}
            onClick={() => setSortBy('newest')}
          >
            🕒 最新发布
          </button>
          <button
            className={`sort-btn ${sortBy === 'likes' ? 'active' : ''}`}
            onClick={() => setSortBy('likes')}
          >
            ❤️ 最多点赞
          </button>
        </div>
      </div>

      <div className="gallery-grid">
        {works.map(work => (
          <div key={work._id} className="gallery-card">
            {work.isEndorsed && (
              <div className="endorsement-badge">
                <span className="badge-icon">✅</span>
                <span className="badge-text">教师认证</span>
              </div>
            )}

            <div className="gallery-card-content">
              <h3>{work.title}</h3>
              {work.description && <p className="work-description">{work.description}</p>}

              <div className="work-meta">
                <div className="author-info">
                  <span className="author-label">创作者：</span>
                  <span className="author-address">{formatAddress(work.studentAddress)}</span>
                </div>
                <div className="work-date">
                  {new Date(work.createdAt).toLocaleDateString('zh-CN')}
                </div>
              </div>

              <div className="work-actions">
                <button
                  className={`action-btn like-btn ${userLikes.has(work._id) ? 'liked' : ''}`}
                  onClick={() => handleLike(work._id)}
                >
                  <span className="btn-icon">
                    {userLikes.has(work._id) ? '❤️' : '🤍'}
                  </span>
                  <span className="btn-count">{work.likesCount}</span>
                </button>

                <button
                  className="action-btn comment-btn"
                  onClick={() => handleViewComments(work)}
                >
                  <span className="btn-icon">💬</span>
                  <span className="btn-count">{work.commentsCount}</span>
                </button>

                {work.fileUrl && (
                  <a
                    href={work.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="action-btn view-btn"
                  >
                    <span className="btn-icon">👁️</span>
                    查看作品
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}

        {works.length === 0 && (
          <div className="gallery-empty">
            <div className="empty-icon">🎨</div>
            <h3>暂无作品</h3>
            <p>还没有同学提交作品，快去铸造你的第一个NFT作品吧！</p>
          </div>
        )}
      </div>

      {/* 评论弹窗 */}
      {selectedWork && (
        <div className="comments-modal">
          <div className="modal-backdrop" onClick={() => setSelectedWork(null)}></div>
          <div className="modal-content">
            <div className="modal-header">
              <h3>{selectedWork.title}</h3>
              <button className="close-btn" onClick={() => setSelectedWork(null)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="work-preview">
                <p><strong>创作者：</strong>{formatAddress(selectedWork.studentAddress)}</p>
                {selectedWork.description && <p>{selectedWork.description}</p>}
              </div>

              <div className="comments-section">
                <div className="add-comment">
                  <textarea
                    placeholder="写下你的评论..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                  ></textarea>
                  <button
                    className="submit-comment-btn"
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                  >
                    发表评论
                  </button>
                </div>

                <div className="comments-list">
                  {comments.map(comment => (
                    <div key={comment._id} className="comment-item">
                      <div className="comment-header">
                        <span className="comment-author">{formatAddress(comment.userAddress)}</span>
                        <span className="comment-date">
                          {new Date(comment.createdAt).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                      <div className="comment-content">{comment.content}</div>
                    </div>
                  ))}

                  {comments.length === 0 && (
                    <div className="no-comments">暂无评论，快来发表第一条评论吧！</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
