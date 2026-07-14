import { AnimatePresence, motion } from 'framer-motion';
import {
  CornerDownRight, Heart, ImagePlus, Megaphone, MessageCircle, Pin, Send, Trash2, X,
} from 'lucide-react';
import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { EmptyState, Page, Spinner, fadeUp, stagger } from '../components/ui';
import { api, errMsg } from '../lib/api';
import { useAuth } from '../stores/auth';
import { useUi } from '../stores/ui';

interface Author {
  id: string;
  fullName: string;
  role: string;
  department: string | null;
}
interface Person {
  id: string;
  fullName: string;
  role: string;
  department: string | null;
  studentNumber?: string | null;
  email?: string;
}
interface Post {
  id: string;
  content: string;
  imageUrl?: string;
  isAnnouncement: boolean;
  pinned: boolean;
  hidden: boolean;
  createdAt: string;
  author: Author;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  canDelete: boolean;
}
interface Comment {
  id: string;
  content: string;
  createdAt: string;
  parentId: string | null;
  author: Author;
  authorId: string;
}

const roleLabel: Record<string, string> = {
  STUDENT: 'Student',
  STAFF: 'Staff',
  LOST_FOUND_OFFICER: 'Lost & Found',
  ADMIN: 'Admin',
};

const initials = (name: string) =>
  name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
}

/** Render text with @Full Name mentions highlighted in the accent colour. */
function renderContent(text: string, people: Person[]): ReactNode {
  if (!text.includes('@') || people.length === 0) return text;
  const names = people.map((p) => p.fullName).sort((a, b) => b.length - a.length);
  const out: ReactNode[] = [];
  let buf = '';
  let i = 0;
  let key = 0;
  while (i < text.length) {
    if (text[i] === '@') {
      const rest = text.slice(i + 1);
      const name = names.find((n) => rest.startsWith(n));
      if (name) {
        if (buf) { out.push(buf); buf = ''; }
        out.push(
          <span key={key++} style={{ color: 'var(--accent)', fontWeight: 600 }}>@{name}</span>,
        );
        i += 1 + name.length;
        continue;
      }
    }
    buf += text[i++];
  }
  if (buf) out.push(buf);
  return out;
}

function Avatar({ name, small }: { name: string; small?: boolean }) {
  const size = small ? 34 : 44;
  return (
    <div
      aria-hidden
      style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        display: 'grid', placeItems: 'center', color: '#fff',
        fontSize: small ? 12.5 : 15, fontWeight: 700,
        background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
      }}
    >
      {initials(name)}
    </div>
  );
}

/**
 * Textarea with @mention autocomplete. Detects the @token being typed just
 * before the caret, suggests matching people, and inserts the canonical full
 * name on select so the backend can match `@${fullName}` reliably.
 */
function MentionField({
  value, onChange, people, placeholder, rows = 1, onEnterSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  people: Person[];
  placeholder?: string;
  rows?: number;
  onEnterSubmit?: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [menu, setMenu] = useState<{ query: string; atPos: number; caret: number } | null>(null);

  const detect = (v: string, caret: number) => {
    const upto = v.slice(0, caret);
    const m = /(?:^|\s)@([A-Za-z ]{0,30})$/.exec(upto);
    if (m) setMenu({ query: m[1], atPos: caret - m[1].length - 1, caret });
    else setMenu(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    detect(e.target.value, e.target.selectionStart ?? e.target.value.length);
  };

  const pick = (p: Person) => {
    if (!menu) return;
    const before = value.slice(0, menu.atPos);
    const after = value.slice(menu.caret);
    const insert = `@${p.fullName} `;
    const next = before + insert + after;
    onChange(next);
    setMenu(null);
    const caret = (before + insert).length;
    requestAnimationFrame(() => {
      const el = ref.current;
      if (el) { el.focus(); el.setSelectionRange(caret, caret); }
    });
  };

  const q = (menu?.query ?? '').trim().toLowerCase();
  const suggestions = menu
    ? people.filter((p) => !q || p.fullName.toLowerCase().includes(q)).slice(0, 6)
    : [];

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <textarea
        ref={ref}
        className="input"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        rows={rows}
        onKeyDown={(e) => {
          if (menu && suggestions.length && (e.key === 'Enter' || e.key === 'Tab')) {
            e.preventDefault();
            pick(suggestions[0]);
            return;
          }
          if (onEnterSubmit && e.key === 'Enter' && !e.shiftKey && !menu) {
            e.preventDefault();
            onEnterSubmit();
          }
        }}
        onBlur={() => setTimeout(() => setMenu(null), 120)}
        style={{ resize: rows > 1 ? 'vertical' : 'none', minHeight: rows > 1 ? 70 : 44 }}
      />
      {menu && suggestions.length > 0 && (
        <div
          className="glass-strong"
          style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 6, width: 260, zIndex: 60,
            padding: 6, borderRadius: 14, maxHeight: 240, overflowY: 'auto',
            boxShadow: '0 16px 40px rgba(8,10,20,0.28)',
          }}
        >
          {suggestions.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); pick(p); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                background: 'transparent', border: 'none', borderRadius: 10, padding: '7px 8px',
                color: 'var(--ink)', cursor: 'pointer',
              }}
            >
              <Avatar name={p.fullName} small />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.fullName}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {roleLabel[p.role] ?? p.role} · {p.studentNumber || p.email || p.id.slice(0, 8)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Community() {
  const { user } = useAuth();
  const { toast } = useUi();
  const [posts, setPosts] = useState<Post[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const canAnnounce = user?.role === 'STAFF' || user?.role === 'ADMIN';

  const load = async () => {
    try {
      const { data } = await api.get<Post[]>('/community/posts');
      setPosts(data);
    } catch (err) {
      toast('error', errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    api.get<Person[]>('/community/people').then(({ data }) => setPeople(data)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Page>
      <div className="page" style={{ paddingTop: 96 }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <div style={{ marginBottom: 22 }}>
            <h1 className="page-title">Community</h1>
            <p className="page-sub" style={{ marginBottom: 0 }}>
              Share updates, ask around campus, and catch staff announcements. Tag people with @.
            </p>
          </div>

          <Composer canAnnounce={canAnnounce} people={people} onPosted={load} />

          {loading ? (
            <Spinner label="Loading the feed…" />
          ) : posts.length === 0 ? (
            <EmptyState icon={<MessageCircle size={26} />} title="No posts yet"
              hint="Be the first to post something to the campus community." />
          ) : (
            <motion.div variants={stagger} initial="hidden" animate="show"
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {posts.map((p) => (
                <PostCard key={p.id} post={p} people={people} onChanged={load} />
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </Page>
  );
}

function Composer({ canAnnounce, people, onPosted }: { canAnnounce: boolean; people: Person[]; onPosted: () => void }) {
  const { toast } = useUi();
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [announce, setAnnounce] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!content.trim()) return;
    setBusy(true);
    const fd = new FormData();
    fd.append('content', content.trim());
    if (image) fd.append('image', image);
    try {
      await api.post(announce ? '/community/announce' : '/community/posts', fd);
      toast('success', announce ? 'Announcement sent to all students' : 'Posted to the community');
      setContent('');
      setImage(null);
      setAnnounce(false);
      if (fileRef.current) fileRef.current.value = '';
      onPosted();
    } catch (err) {
      toast('error', errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.form
      onSubmit={submit}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-strong"
      style={{ padding: 18, marginBottom: 24, borderRadius: 22 }}
    >
      <MentionField
        value={content}
        onChange={setContent}
        people={people}
        rows={3}
        placeholder={announce ? 'Write an announcement for all students…  use @ to tag people' : 'What is happening on campus?  use @ to tag people'}
      />
      {image && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 13, color: 'var(--ink-2)' }}>
          <ImagePlus size={15} /> {image.name}
          <button type="button" onClick={() => { setImage(null); if (fileRef.current) fileRef.current.value = ''; }}
            style={{ background: 'none', border: 'none', color: 'var(--ink-3)', display: 'flex', cursor: 'pointer' }}>
            <X size={15} />
          </button>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-glass btn-sm" onClick={() => fileRef.current?.click()}>
          <ImagePlus size={15} /> Photo
        </button>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden
          onChange={(e) => setImage(e.target.files?.[0] ?? null)} />

        {canAnnounce && (
          <button
            type="button"
            onClick={() => setAnnounce((a) => !a)}
            className={`btn btn-sm ${announce ? 'btn-primary' : 'btn-glass'}`}
            aria-pressed={announce}
            title="Announcements are pinned and notify every student"
          >
            <Megaphone size={15} /> Announcement
          </button>
        )}

        <div style={{ flex: 1 }} />
        <button className="btn btn-primary btn-sm" type="submit" disabled={busy || !content.trim()}>
          <Send size={15} /> {busy ? 'Posting…' : announce ? 'Send announcement' : 'Post'}
        </button>
      </div>
    </motion.form>
  );
}

/**
 * A single comment (or nested reply). Defined at module scope, not inside
 * PostCard, so it keeps a stable component identity across re-renders; an
 * inline definition would remount the reply textarea on every keystroke and
 * steal focus after each character.
 */
function CommentRow({
  c, isReply, people, currentUserId, isAdmin,
  replyOpen, replyText, setReplyText, onToggleReply, onDelete, onSubmitReply,
}: {
  c: Comment;
  isReply?: boolean;
  people: Person[];
  currentUserId?: string;
  isAdmin: boolean;
  replyOpen: boolean;
  replyText: string;
  setReplyText: (v: string) => void;
  onToggleReply: () => void;
  onDelete: () => void;
  onSubmitReply: () => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 10, marginLeft: isReply ? 30 : 0 }}>
      {isReply && <CornerDownRight size={15} style={{ color: 'var(--ink-3)', marginTop: 10, flexShrink: 0 }} />}
      <Avatar name={c.author.fullName} small />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="glass" style={{ padding: '9px 13px', borderRadius: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <strong style={{ fontSize: 13 }}>{c.author.fullName}</strong>
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{timeAgo(c.createdAt)}</span>
            {(isAdmin || c.authorId === currentUserId) && (
              <button onClick={onDelete} aria-label="Delete comment"
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--ink-3)', display: 'flex', cursor: 'pointer' }}>
                <Trash2 size={13} />
              </button>
            )}
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--ink-2)', marginTop: 2, whiteSpace: 'pre-wrap' }}>
            {renderContent(c.content, people)}
          </div>
        </div>
        {!isReply && (
          <button onClick={onToggleReply}
            style={{ background: 'none', border: 'none', color: 'var(--ink-3)', fontSize: 12, fontWeight: 600, padding: '4px 6px', cursor: 'pointer' }}>
            Reply
          </button>
        )}
        {replyOpen && (
          <form onSubmit={(e) => { e.preventDefault(); onSubmitReply(); }}
            style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <MentionField value={replyText} onChange={setReplyText} people={people}
              placeholder={`Reply to ${c.author.fullName.split(' ')[0]}…`}
              onEnterSubmit={onSubmitReply} />
            <button className="btn btn-primary btn-sm" type="submit" disabled={!replyText.trim()}
              style={{ width: 42, padding: 0, alignSelf: 'flex-start', height: 44 }} aria-label="Send reply">
              <Send size={15} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function PostCard({ post, people, onChanged }: { post: Post; people: Person[]; onChanged: () => void }) {
  const { user } = useAuth();
  const { toast } = useUi();
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const isAdmin = user?.role === 'ADMIN';

  const toggleLike = async () => {
    setLiked((v) => !v);
    setLikeCount((c) => c + (liked ? -1 : 1));
    try {
      const { data } = await api.post(`/community/posts/${post.id}/like`);
      setLiked(data.liked);
      setLikeCount(data.likeCount);
    } catch (err) {
      setLiked(post.likedByMe);
      setLikeCount(post.likeCount);
      toast('error', errMsg(err));
    }
  };

  const openComments = async () => {
    const next = !showComments;
    setShowComments(next);
    if (next && comments.length === 0) {
      setLoadingComments(true);
      try {
        const { data } = await api.get<Comment[]>(`/community/posts/${post.id}/comments`);
        setComments(data);
      } catch (err) {
        toast('error', errMsg(err));
      } finally {
        setLoadingComments(false);
      }
    }
  };

  const postComment = async (content: string, parentId?: string) => {
    if (!content.trim()) return;
    try {
      const { data } = await api.post<Comment>(`/community/posts/${post.id}/comments`,
        { content: content.trim(), parentId });
      setComments((c) => [...c, data]);
      setCommentCount((c) => c + 1);
      if (parentId) { setReplyTo(null); setReplyText(''); } else { setNewComment(''); }
    } catch (err) {
      toast('error', errMsg(err));
    }
  };

  const deleteComment = async (id: string) => {
    try {
      await api.delete(`/community/comments/${id}`);
      // remove the comment and any of its replies
      setComments((c) => c.filter((x) => x.id !== id && x.parentId !== id));
      setCommentCount((c) => Math.max(0, c - 1));
    } catch (err) {
      toast('error', errMsg(err));
    }
  };

  const deletePost = async () => {
    try {
      await api.delete(`/community/posts/${post.id}`);
      toast('success', 'Post removed');
      onChanged();
    } catch (err) {
      toast('error', errMsg(err));
    }
  };

  const toggleHide = async () => {
    try {
      await api.patch(`/community/posts/${post.id}/hide`, { hidden: !post.hidden });
      onChanged();
    } catch (err) {
      toast('error', errMsg(err));
    }
  };

  const isAnnouncement = post.isAnnouncement;
  const topLevel = comments.filter((c) => !c.parentId);
  const repliesOf = (id: string) => comments.filter((c) => c.parentId === id);

  return (
    <motion.article
      variants={fadeUp}
      className={isAnnouncement ? 'glass-strong' : 'glass'}
      style={{
        padding: 18, borderRadius: 22, position: 'relative',
        border: isAnnouncement ? '1px solid color-mix(in srgb, var(--accent) 45%, transparent)' : undefined,
        opacity: post.hidden ? 0.6 : 1,
      }}
    >
      {isAnnouncement && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12,
          color: 'var(--accent)', fontSize: 12.5, fontWeight: 700 }}>
          <Pin size={13} /> ANNOUNCEMENT
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <Avatar name={post.author.fullName} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 14.5 }}>{post.author.fullName}</strong>
            <span className="chip" style={{ fontSize: 11 }}>{roleLabel[post.author.role] ?? post.author.role}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 1 }}>
            {post.author.department ? `${post.author.department} · ` : ''}{timeAgo(post.createdAt)}
            {post.hidden && ' · hidden'}
          </div>
        </div>
        {isAdmin && (
          <button className="btn btn-glass btn-sm" onClick={toggleHide} title={post.hidden ? 'Unhide' : 'Hide from feed'}
            style={{ fontSize: 12 }}>
            {post.hidden ? 'Unhide' : 'Hide'}
          </button>
        )}
        {post.canDelete && (
          <button className="btn btn-glass btn-sm" onClick={deletePost} aria-label="Delete post"
            style={{ width: 34, height: 34, padding: 0, borderRadius: 10 }}>
            <Trash2 size={15} />
          </button>
        )}
      </div>

      <p style={{ fontSize: 15, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--ink)' }}>
        {renderContent(post.content, people)}
      </p>

      {post.imageUrl && (
        <img src={post.imageUrl} alt="" loading="lazy"
          style={{ width: '100%', height: 'auto', maxHeight: 460, objectFit: 'contain',
            borderRadius: 16, marginTop: 12, background: 'color-mix(in srgb, var(--accent) 6%, transparent)' }} />
      )}

      <div style={{ display: 'flex', gap: 6, marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--glass-border)' }}>
        <button onClick={toggleLike} className="btn btn-glass btn-sm"
          aria-pressed={liked}
          style={{ gap: 7, color: liked ? 'var(--danger)' : 'var(--ink-2)' }}>
          <Heart size={16} fill={liked ? 'var(--danger)' : 'none'} /> {likeCount > 0 ? likeCount : ''} Like
        </button>
        <button onClick={openComments} className="btn btn-glass btn-sm" style={{ gap: 7, color: 'var(--ink-2)' }}>
          <MessageCircle size={16} /> {commentCount > 0 ? commentCount : ''} Comment
        </button>
      </div>

      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {loadingComments ? (
                <Spinner />
              ) : (
                topLevel.map((c) => (
                  <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <CommentRow
                      c={c} people={people} currentUserId={user?.id} isAdmin={isAdmin}
                      replyOpen={replyTo === c.id} replyText={replyText} setReplyText={setReplyText}
                      onToggleReply={() => { setReplyTo(replyTo === c.id ? null : c.id); setReplyText(''); }}
                      onDelete={() => deleteComment(c.id)}
                      onSubmitReply={() => postComment(replyText, c.id)}
                    />
                    {repliesOf(c.id).map((r) => (
                      <CommentRow
                        key={r.id} c={r} isReply people={people} currentUserId={user?.id} isAdmin={isAdmin}
                        replyOpen={false} replyText="" setReplyText={() => {}}
                        onToggleReply={() => {}} onDelete={() => deleteComment(r.id)} onSubmitReply={() => {}}
                      />
                    ))}
                  </div>
                ))
              )}

              <form onSubmit={(e) => { e.preventDefault(); postComment(newComment); }}
                style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                <MentionField value={newComment} onChange={setNewComment} people={people}
                  placeholder="Write a comment…  use @ to tag"
                  onEnterSubmit={() => postComment(newComment)} />
                <button className="btn btn-primary btn-sm" type="submit" disabled={!newComment.trim()}
                  style={{ width: 42, padding: 0, alignSelf: 'flex-start', height: 44 }} aria-label="Send comment">
                  <Send size={15} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
