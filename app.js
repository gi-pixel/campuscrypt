// ==========================================
// 1. CONFIGURATION & IDENTITY INITIALIZATION
// ==========================================

const SUPABASE_URL = 'https://xtqfbaqckgodxmsnyexh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0cWZiYXFja2dvZHhtc255ZXhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyOTgwODIsImV4cCI6MjA5Njg3NDA4Mn0.cWsx_9gyk3m9Dz6ZMn_8qHQ0s_20qiNvJTUn8Q0p3uM';


let currentSessionId = localStorage.getItem('crypt_session');
if (!currentSessionId) {
    currentSessionId = `SESSION_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    localStorage.setItem('crypt_session', currentSessionId);
}

const badgeNode = document.getElementById('local-session-badge');
if (badgeNode) badgeNode.textContent = currentSessionId.substring(8, 18).toUpperCase();

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
        headers: { 'x-session-id': currentSessionId },
    },
});

let globalCurrentFeedTab = 'latest';     
let globalCurrentCategory = 'all';       
let globalActiveFocusedPostId = null;   

// Mount engine initialization handlers and trigger welcome splash screen
window.addEventListener('DOMContentLoaded', () => {
    fetchAndRenderFeed();
    initializeRealTimePipeline();

    // NEW: Handles the automatic fade out of the welcome intro animation
    setTimeout(() => {
        const splash = document.getElementById('splash-layer');
        if (splash) {
            splash.classList.add('fade-out');
        }
    }, 2000); // 2000 milliseconds = 2 seconds of pure intro vibe
});

// ==========================================
// 2. NEW COMPOSER MODAL WINDOW TOGGLES
// ==========================================

function openComposerModal() {
    const modal = document.getElementById('composer-modal');
    if (modal) {
        modal.classList.remove('hidden');
        document.getElementById('post-textarea').focus();
    }
}

function closeComposerModal() {
    const modal = document.getElementById('composer-modal');
    if (modal) modal.classList.add('hidden');
}


// ==========================================
// COHESIVE TIMELINE RENDER ENGINE (WITH TRENDING ALGORITHM)
// ==========================================
async function fetchAndRenderFeed() {
    const feedContainer = document.getElementById('feed-container');
    if (!feedContainer) return;
    
    let query = supabaseClient.from('posts').select('*');

    // Filter by active category pill selection
    if (globalCurrentCategory !== 'all') {
        query = query.eq('category', globalCurrentCategory);
    }

    // Always fetch latest rows first to calculate metrics on recent activity
    query = query.order('created_at', { ascending: false });

    const { data: posts, error } = await query.limit(40); // Pull slightly more rows to compute trends

    if (error) {
        console.error('Database Connection Error:', error.message);
        feedContainer.innerHTML = `<div style="padding:20px; text-align:center; color:#f91880;">Database Sync Failed. Check API keys.</div>`;
        return;
    }

    if (!posts || posts.length === 0) {
        feedContainer.innerHTML = `<div style="padding:40px; text-align:center; color:#71767b;">No posts in this track yet. Write a post to start the conversation!</div>`;
        return;
    }

    // Map through posts to inject live structural metrics
    const compiledPosts = [];
    for (const post of posts) {
        const { count: likesCount } = await supabaseClient
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

        const { count: repliesCount } = await supabaseClient
            .from('replies')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

        const { data: userLiked } = await supabaseClient
            .from('likes')
            .select('id')
            .eq('post_id', post.id)
            .eq('session_id', currentSessionId)
            .maybeSingle();

        post.likes_count = likesCount || 0;
        post.reply_count = repliesCount || 0;
        post.has_user_liked = !!userLiked;
        
        // MATHEMATICAL RANKING ENGINE: 1 Like = 1 point, 1 Comment = 2 points
        post.trending_score = post.likes_count + (post.reply_count * 2);

        compiledPosts.push(post);
    }

    // NEW: If the user is viewing Trending, sort by engagement score descending
    if (globalCurrentFeedTab === 'trending') {
        compiledPosts.sort((a, b) => b.trending_score - a.trending_score);
    }

    // Clear loading states and render the sorted array list
    feedContainer.innerHTML = '';
    compiledPosts.forEach(post => {
        feedContainer.appendChild(compilePostHtmlNode(post));
    });
}

function compilePostHtmlNode(post) {
    const postCard = document.createElement('div');
    postCard.className = 'tweet';
    postCard.id = `ui-post-${post.id}`;
    
    const isAuthor = post.session_id === currentSessionId;
    const minutesSinceCreation = (new Date() - new Date(post.created_at)) / 1000 / 60;
    const canDelete = isAuthor && minutesSinceCreation < 5;

    const formattedTime = formatTimestampRelative(post.created_at);
    const likeActiveStateClass = post.has_user_liked ? 'liked' : '';

    postCard.setAttribute('onclick', `openThreadModal('${post.id}')`);

    postCard.innerHTML = `
        <div class="avatar">🥷</div>
        <div class="tweet-content">
            <div class="tweet-header">
                <div class="header-meta-group">
                    <span class="name">Anonymous</span>
                    <span class="handle">@anon</span>
                    <span class="time">· ${formattedTime}</span>
                    <span class="cat-badge">${post.category}</span>
                </div>
                ${canDelete ? `<button class="delete-btn" onclick="event.stopPropagation(); executePostDeletion('${post.id}')"><i class="fa-regular fa-trash-can"></i></button>` : ''}
            </div>
            <div class="tweet-text">${escapeHtmlMarkup(post.content)}</div>
            <div class="actions">
                <div class="action comment">
                    <i class="fa-regular fa-comment"></i>
                    <span>${post.reply_count}</span>
                </div>
                <div class="action like ${likeActiveStateClass}" onclick="event.stopPropagation(); togglePostLikeState('${post.id}', this)">
                    <i class="fa-regular fa-heart"></i>
                    <span class="like-counter-val">${post.likes_count}</span>
                </div>
            </div>
        </div>
    `;
    return postCard;
}

// ==========================================
// 4. TARGET MUTATION PIPELINES
// ==========================================

async function handlePostSubmit() {
    const textarea = document.getElementById('post-textarea');
    const categorySelect = document.getElementById('category-select');
    const submitBtn = document.getElementById('submit-post-btn');
    
    if (!textarea || !categorySelect || !submitBtn) return;
    
    const content = textarea.value.trim();
    const category = categorySelect.value;

    if (!content || content.length > 280) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Posting...';

    const { data: newRowData, error } = await supabaseClient
        .from('posts')
        .insert([{ content, category, session_id: currentSessionId }])
        .select()
        .single();

    submitBtn.disabled = false;
    submitBtn.textContent = 'Post Anon';

    if (error) {
        alert('Submission failed: ' + error.message);
        return;
    }

    // Reset fields and close out the window drawer instantly
    textarea.value = '';
    document.getElementById('char-counter').textContent = '0 / 280';
    closeComposerModal();
    
    // Targeted Injection: Slip element dynamically to the top list
    const container = document.getElementById('feed-container');
    if (container.querySelector('div[style*="text-align:center"]')) container.innerHTML = '';

    newRowData.likes_count = 0;
    newRowData.reply_count = 0;
    newRowData.has_user_liked = false;

    const modernNode = compilePostHtmlNode(newRowData);
    modernNode.style.background = '#16181c';
    container.insertBefore(modernNode, container.firstChild);
    setTimeout(() => modernNode.style.background = 'transparent', 1200);
}

async function togglePostLikeState(postId, buttonNode) {
    const countSpan = buttonNode.querySelector('.like-counter-val');
    let currentCount = parseInt(countSpan.textContent) || 0;

    const { data: existingLike } = await supabaseClient
        .from('likes')
        .select('id')
        .eq('post_id', postId)
        .eq('session_id', currentSessionId)
        .maybeSingle();

    if (existingLike) {
        countSpan.textContent = Math.max(0, currentCount - 1);
        buttonNode.classList.remove('liked');

        await supabaseClient
            .from('likes')
            .delete()
            .match({ post_id: postId, session_id: currentSessionId });
    } else {
        countSpan.textContent = currentCount + 1;
        buttonNode.classList.add('liked');

        await supabaseClient
            .from('likes')
            .insert([{ post_id: postId, session_id: currentSessionId }]);
    }
}

// ==========================================
// 5. DISCUSSION MODAL SUBSYSTEMS
// ==========================================

async function openThreadModal(postId) {
    globalActiveFocusedPostId = postId;
    const modal = document.getElementById('thread-modal');
    const focusBox = document.getElementById('modal-focus-post');
    
    if (!modal || !focusBox) return;
    
    modal.classList.remove('hidden');
    focusBox.innerHTML = `<div style="text-align:center; color:#71767b; font-size:14px;">Syncing conversation stream...</div>`;

    const { data: post } = await supabaseClient.from('posts').select('*').eq('id', postId).single();
    if (!post) return;

    focusBox.innerHTML = `
        <div style="display:flex; gap:10px; align-items:center; margin-bottom:8px;">
            <div class="avatar" style="width:32px; height:32px; font-size:14px;">🥷</div>
            <div>
                <div style="font-weight:bold; font-size:14px;">Original Poster</div>
                <div style="color:#71767b; font-size:12px;">${formatTimestampRelative(post.created_at)}</div>
            </div>
        </div>
        <div style="font-size:17px; line-height:1.4; color:white; margin-bottom:8px;">${escapeHtmlMarkup(post.content)}</div>
        <span class="cat-badge">${post.category}</span>
    `;

    fetchAndRenderComments(postId);
}

async function fetchAndRenderComments(postId) {
    const container = document.getElementById('modal-comments-container');
    if (!container) return;
    container.innerHTML = '';

    const { data: replies } = await supabaseClient
        .from('replies')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

    if (!replies || replies.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:20px; color:#71767b; font-size:13px;">No replies yet. Say something anonymously!</div>`;
        return;
    }

    replies.forEach(reply => {
        const div = document.createElement('div');
        div.className = 'reply-node';
        div.innerHTML = `
            <div class="avatar" style="width:32px; height:32px; font-size:14px;">🥷</div>
            <div>
                <div style="display:flex; gap:6px; font-size:13px; margin-bottom:2px;">
                    <span style="font-weight:bold;">Anonymous</span>
                    <span style="color:#71767b;">· ${formatTimestampRelative(reply.created_at)}</span>
                </div>
                <div style="font-size:14px; color:#e1e8ed; line-height:1.4;">${escapeHtmlMarkup(reply.content)}</div>
            </div>
        `;
        container.appendChild(div);
    });
}

async function handleReplySubmit() {
    const textarea = document.getElementById('reply-textarea');
    const submitBtn = document.getElementById('submit-reply-btn');
    if (!textarea || !submitBtn || !globalActiveFocusedPostId) return;

    const content = textarea.value.trim();
    if (!content || content.length > 280) return;

    submitBtn.disabled = true;

    const { error } = await supabaseClient
        .from('replies')
        .insert([{ post_id: globalActiveFocusedPostId, content, session_id: currentSessionId }]);

    submitBtn.disabled = false;

    if (error) {
        alert('Could not post reply: ' + error.message);
        return;
    }

    textarea.value = '';
    await fetchAndRenderComments(globalActiveFocusedPostId);
    
    const postCard = document.getElementById(`ui-post-${globalActiveFocusedPostId}`);
    if (postCard) {
        const commentCounter = postCard.querySelector('.comment span');
        if (commentCounter) {
            let currentNum = parseInt(commentCounter.textContent) || 0;
            commentCounter.textContent = currentNum + 1;
        }
    }
}

async function executePostDeletion(postId) {
    if (!confirm('Permanently wipe this anonymous post?')) return;

    const { error } = await supabaseClient.from('posts').delete().eq('id', postId);
    if (error) {
        alert('Deletion window expired or unauthorized execution.');
        return;
    }

    const element = document.getElementById(`ui-post-${postId}`);
    if (element) element.remove();
}

function closeThreadModal() {
    const modal = document.getElementById('thread-modal');
    if (modal) modal.classList.add('hidden');
    globalActiveFocusedPostId = null;
}

// ==========================================
// 6. NAVIGATION FILTERS & CONTROL ARRAYS
// ==========================================

function switchFeedTab(tabName) {
    globalCurrentFeedTab = tabName;
    document.getElementById('tab-latest').className = tabName === 'latest' ? 'active' : '';
    document.getElementById('tab-trending').className = tabName === 'trending' ? 'active' : '';
    fetchAndRenderFeed();
}

function filterByCategory(categoryName, elementNode) {
    globalCurrentCategory = categoryName;
    document.querySelectorAll('.cat-pill').forEach(pill => pill.classList.remove('active'));
    elementNode.classList.add('active');
    fetchAndRenderFeed();
}

// ==========================================
// 7. REAL-TIME EVENT STREAM TUNNELS
// ==========================================

function initializeRealTimePipeline() {
    supabaseClient
        .channel('public-feed-stream')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, async (payload) => {
            if (payload.eventType === 'INSERT') {
                if (globalCurrentCategory === 'all' || globalCurrentCategory === payload.new.category) {
                    if (globalCurrentFeedTab === 'latest') {
                        const container = document.getElementById('feed-container');
                        if (container.querySelector('div[style*="text-align:center"]')) container.innerHTML = '';
                        
                        const incomingPost = payload.new;
                        if (document.getElementById(`ui-post-${incomingPost.id}`)) return;

                        incomingPost.likes_count = 0;
                        incomingPost.reply_count = 0;
                        incomingPost.has_user_liked = false;
                        
                        const incomingNode = compilePostHtmlNode(incomingPost);
                        incomingNode.style.background = '#16181c'; 
                        container.insertBefore(incomingNode, container.firstChild);
                        setTimeout(() => incomingNode.style.background = 'transparent', 1500);
                    }
                }
            } else if (payload.eventType === 'DELETE') {
                const element = document.getElementById(`ui-post-${payload.old.id}`);
                if (element) element.remove();
            }
        })
        .subscribe();
}

// ==========================================
// 8. UTILITY SANITIZATION LAYER
// ==========================================

function escapeHtmlMarkup(stringInput) {
    const proxyDiv = document.createElement('div');
    proxyDiv.textContent = stringInput;
    return proxyDiv.innerHTML;
}

function formatTimestampRelative(dateString) {
    const now = new Date();
    const past = new Date(dateString);
    const differenceInMs = now - past;
    
    const seconds = Math.floor(differenceInMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
}