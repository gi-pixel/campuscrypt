// ==========================================
// 1. CONFIGURATION & IDENTITY INITIALIZATION
// ==========================================

const SUPABASE_URL = 'https://xtqfbaqckgodxmsnyexh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0cWZiYXFja2dvZHhtc255ZXhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyOTgwODIsImV4cCI6MjA5Njg3NDA4Mn0.cWsx_9gyk3m9Dz6ZMn_8qHQ0s_20qiNvJTUn8Q0p3uM';
const BANNED_KEYWORDS = [
    "kill", "porno", "porn", "fuck", "fvck", "bitch", "asshole", 
    "cunt", "dick", "suicide", "vagina", "penis", "breast", "boobs", "boob", "stupid"
];

let currentSessionId = localStorage.getItem('cc_session_id');
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

let globalCurrentFeedTab = localStorage.getItem('cc_preferred_tab') || 'latest';
let globalCurrentCategory = 'all';        
let globalActiveFocusedPostId = null;   



// ==========================================
// 1. GLOBAL ONBOARDING SWITCHERS (Exposed directly to HTML)
// ==========================================

function advanceToRulesScreen() {
    console.log("👉 Advancing to rules stage...");
    const welcomeStage = document.getElementById('splash-stage-welcome');
    const rulesStage = document.getElementById('splash-stage-rules');
    
    if (welcomeStage && rulesStage) {
        welcomeStage.classList.add('hidden');
        rulesStage.classList.remove('hidden');
    }
}
function acceptRulesAndEnterApp() {
    console.log("🚀 Verifying credential handshakes...");
    const mainSplashLayer = document.getElementById('splash-layer');
    const mainAppLayout = document.querySelector('.twitter');

    // Generate and anchor secure layout token credentials
    const newSessionId = 'cc_peer_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('cc_session_id', newSessionId);
    currentSessionId = newSessionId;

    if (mainAppLayout) {
        mainAppLayout.style.opacity = '0';
        mainAppLayout.classList.remove('hidden');
    }

    if (mainSplashLayer) {
        mainSplashLayer.classList.add('fade-out');
    }

    setTimeout(() => {
        if (mainAppLayout) {
            mainAppLayout.style.transition = 'opacity 0.4s ease';
            mainAppLayout.style.opacity = '1';
        }
    }, 150);

    setTimeout(() => {
        if (mainSplashLayer) {
            mainSplashLayer.classList.add('hidden');
            mainSplashLayer.style.display = 'none';
        }
        fetchAndRenderFeed();
    }, 500);
}

// ==========================================
// 2. CORE RE-ENGINEERED LIFECYCLE INITIALIZER
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const splashLayer = document.getElementById('splash-layer'); 
    const mainAppLayout = document.querySelector('.twitter'); 

    if (currentSessionId) {
        // Returning Peer Profile Route
        if (splashLayer) {
            splashLayer.classList.add('hidden', 'fade-out');
            splashLayer.style.display = 'none';
        }
        if (mainAppLayout) {
            mainAppLayout.classList.remove('hidden');
            mainAppLayout.style.opacity = '1';     
        }
        fetchAndRenderFeed();
    } else {
        // Handshake Entry Stage Setup Route
        if (mainAppLayout) mainAppLayout.classList.add('hidden');
        if (splashLayer) {
            splashLayer.classList.remove('hidden', 'fade-out');
            splashLayer.style.display = 'flex';
        }
    }
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



async function fetchAndRenderFeed() {
    const feedContainer = document.getElementById('feed-container');
    if (!feedContainer) return;
    
    // 1. Show a sleek cinematic spinner instead of a blank layout flash while waiting
    feedContainer.innerHTML = `
        <div id="feed-loading-state" style="padding: 50px; text-align: center; color: #71767b;">
            <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 24px; color: #1d9bf0;"></i>
        </div>
    `;
    
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    
    // 2. Base Query Construction: Bulletproof builder chain referencing
    let query = supabaseClient.from('posts').select('*');

    // Filter by timestamp bounds parameters
    query = query.gt('created_at', fortyEightHoursAgo);

    // Conditional category checking execution
    if (typeof globalCurrentCategory !== 'undefined' && globalCurrentCategory !== 'all') {
        query = query.eq('category', globalCurrentCategory);
    }

    // Apply sorting rules and fetch records capped at a high performance safety ceiling
    const { data: posts, error } = await query
        .order('created_at', { ascending: false })
        .limit(40);

    // Wipe out the loading spinner state cleanly right before rendering content blocks
    feedContainer.innerHTML = '';

    if (error) {
        console.error('Database Sync Error:', error.message);
        feedContainer.innerHTML = `<div style="padding: 40px; text-align: center; color: #f91880; font-family: monospace;">[!] SECURE SYNC FAILURE.</div>`;
        return;
    }

    if (!posts || posts.length === 0) {
        feedContainer.innerHTML = `<div style="padding: 40px; text-align: center; color: #71767b; font-size: 14px;">No active anonymous encryption tracks on this wire.</div>`;
        return;
    }

    // 3. Stagger-render layout cards with native hardware acceleration
    posts.forEach((post, index) => {
    setTimeout(() => {
        post.likes_count = '...';
        post.reply_count = '...';
        post.has_user_liked = false;

        const modernNode = compilePostHtmlNode(post);
        if (!modernNode) return;
        
        modernNode.style.opacity = '0';
        modernNode.style.transform = 'translateY(8px)';
        modernNode.style.transition = 'opacity 0.25s ease, transform 0.25s ease-out';
        modernNode.style.willChange = 'opacity, transform'; 
        
        feedContainer.appendChild(modernNode);
        
        requestAnimationFrame(() => {
            modernNode.style.opacity = '1';
            modernNode.style.transform = 'translateY(0)';
        });

        if (typeof lazyLoadPostMetrics === 'function') {
            lazyLoadPostMetrics(post.id, modernNode);
        }

    }, index * 30); 
});

}

/**
 * Asynchronously fetches likes and replies for a single post card 
 * already rendered on the user's screen.
 */
async function lazyLoadPostMetrics(postId, postNodeElement) {
    try {
        // Run all three metric queries concurrently in parallel to maximize network speed
        const [likesRes, repliesRes, userLikedRes] = await Promise.all([
            supabaseClient.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', postId),
            supabaseClient.from('replies').select('*', { count: 'exact', head: true }).eq('post_id', postId),
            supabaseClient.from('likes').select('id').eq('post_id', postId).eq('session_id', currentSessionId).maybeSingle()
        ]);

        const likesCount = likesRes.count || 0;
        const repliesCount = repliesRes.count || 0;
        const hasUserLiked = !!userLikedRes.data;

        // Find the target counter text areas inside this specific post element card
        // Note: Update these querySelectors to match the exact class names inside your compilePostHtmlNode template!
        const likeSpan = postNodeElement.querySelector('.like-count-selector span, .like span');
        const replySpan = postNodeElement.querySelector('.reply-count-selector span, .comment span');
        const likeIcon = postNodeElement.querySelector('.like-icon-selector, .like i');

        // Dynamically inject the real values into the already visible node card
        if (likeSpan) likeSpan.textContent = likesCount;
        if (replySpan) replySpan.textContent = repliesCount;
        
        if (hasUserLiked && likeIcon) {
            likeIcon.classList.add('liked'); // Highlights heart/upvote if they liked it previously
        }

        postNodeElement.dataset.trendingScore = likesCount + (repliesCount * 2);

    } catch (err) {
        console.error(`Failed loading metrics background pipeline for post ${postId}:`, err);
    }
}

function compilePostHtmlNode(post) {
    const postCard = document.createElement('div');
    postCard.className = 'tweet';
    postCard.id = `ui-post-${post.id}`;
    
    const isAuthor = post.session_id === currentSessionId;
    const minutesSinceCreation = (new Date() - new Date(post.created_at)) / 1000 / 60;
    const canDelete = isAuthor && minutesSinceCreation < 5;

    const formattedTime = typeof formatTimestampRelative === 'function' ? formatTimestampRelative(post.created_at) : '';
    const likeActiveStateClass = post.has_user_liked ? 'liked' : '';
    const safeContent = typeof escapeHtmlMarkup === 'function' ? escapeHtmlMarkup(post.content) : post.content;

    postCard.addEventListener('click', () => {
        openThreadModal(post.id, post.content, post.category, post.created_at);
    });

    postCard.innerHTML = `
        <div class="avatar">🥷</div>
        <div class="tweet-content">
            <div class="tweet-header">
                <div class="header-meta-group">
                    <span class="name">Anon</span>
                    <span class="handle">@anon</span>
                    <span class="time">· ${formattedTime}</span>
                    <span class="cat-badge">${getCategoryDisplayName(post.category)}</span>
                </div>
                ${canDelete ? `<button class="delete-btn" onclick="event.stopPropagation(); executePostDeletion('${post.id}')"><i class="fa-regular fa-trash-can"></i></button>` : ''}
            </div>
            <div class="tweet-text">${safeContent}</div>
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
    
    // 1. Ensure all essential structural elements exist
    if (!textarea || !categorySelect || !submitBtn) return;
    
    const content = textarea.value.trim();
    const category = categorySelect.value;

    // 2. Validate basic empty states and character threshold constraints
    if (!content || content.length > 280) return;

    // 3. INTERCEPT: Run the local word filter scanner BEFORE freezing the user interface
    if (containsProhibitedContent(content)) {
        alert("Post blocked: Your message contains language that violates the CampusCrypt Code of Respect.");
        return; // Halts processing instantly so no database entry or UI freeze occurs
    }

    // 4. Freeze UI controls to block dangerous duplicate double-submit events
    submitBtn.disabled = true;
    submitBtn.textContent = 'Posting...';

    // 5. Asynchronously stream data payload to Supabase database
    const { data: newRowData, error } = await supabaseClient
        .from('posts')
        .insert([{ content, category, session_id: currentSessionId }])
        .select()
        .single();

    // 6. Restore interactive buttons immediately after server transaction finishes
    submitBtn.disabled = false;
    submitBtn.textContent = 'Post Anon';

    // 7. Handle network connection disruptions safely
    if (error) {
        alert('Submission failed: ' + error.message);
        return;
    }

    // 8. Success: Clear out input states and reset visual trackers
    textarea.value = '';
    const charCounter = document.getElementById('char-counter');
    if (charCounter) charCounter.textContent = '0 / 280';
    
    closeComposerModal(); // Closes out the view overlay drawer layout
    
    // 9. DYNAMIC LOCAL INJECTION: Instantly push row to feed without reloading
    const container = document.getElementById('feed-container');
    if (container) {
        // Drop any fallback "No posts yet" empty state message cards
        if (container.querySelector('div[style*="text-align:center"]')) {
            container.innerHTML = '';
        }

        // Initialize zeroed runtime metrics for compiling the raw component template
        newRowData.likes_count = 0;
        newRowData.reply_count = 0;
        newRowData.has_user_liked = false;

        // Compile and insert node card at the very absolute top position
        const modernNode = compilePostHtmlNode(newRowData);
        modernNode.style.background = '#16181c';
        modernNode.style.transition = 'background 1.2s ease'; // Smooth transition property guarantee
        
        container.insertBefore(modernNode, container.firstChild);
        
        // Fades background highlight away slowly to match premium vibe
        setTimeout(() => {
            modernNode.style.background = 'transparent';
        }, 1200);
    }
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

// Global state pointer to track the current thread author
let globalActiveThreadAuthorSessionId = '';

function openThreadModal(postId, postContent, postCategory, postCreatedAt) {
    // Standardize your global ID reference state immediately
    globalActiveFocusedPostId = postId;
    
    const modal = document.getElementById('thread-modal');
    const focusBox = document.getElementById('modal-focus-post');
    
    if (!modal || !focusBox) return;
    
    modal.classList.remove('hidden');

    const formattedTime = typeof formatTimestampRelative === 'function' ? formatTimestampRelative(postCreatedAt) : 'Just now';
    const safeContent = typeof escapeHtmlMarkup === 'function' ? escapeHtmlMarkup(postContent) : postContent;

    focusBox.innerHTML = `
        <div style="display:flex; gap:10px; align-items:center; margin-bottom:8px;">
            <div class="avatar" style="width:32px; height:32px; font-size:14px; display:flex; align-items:center; justify-content:center;">🥷</div>
            <div>
                <div style="font-weight:bold; font-size:14px; color:#f7f9fa;">Original Poster</div>
                <div style="color:#71767b; font-size:12px;">${formattedTime}</div>
            </div>
        </div>
        <div style="font-size:17px; line-height:1.4; color:white; margin-bottom:8px; white-space:pre-wrap; word-break:break-word;">${safeContent}</div>
        <span class="cat-badge">${typeof getCategoryDisplayName === 'function' ? getCategoryDisplayName(postCategory) : postCategory}</span>
    `;

    // 🌟 OPTIMIZATION: Fetch OP session tracking metadata and thread replies at the exact same time
    // This stops your interface from clearing out and re-rendering twice!
    Promise.all([
        supabaseClient.from('posts').select('session_id').eq('id', postId).single(),
        typeof fetchAndRenderComments === 'function' ? fetchAndRenderComments(postId) : Promise.resolve()
    ]).then(([postResult]) => {
        if (postResult && !postResult.error && postResult.data) {
            globalActiveThreadAuthorSessionId = postResult.data.session_id;
            
            // If the active user happens to be the OP, quietly re-render comments to attach OP badges cleanly
            if (currentSessionId === globalActiveThreadAuthorSessionId) {
                fetchAndRenderComments(postId);
            }
        }
    }).catch(err => console.error("Thread Sync Error:", err));
}


async function fetchAndRenderComments(postId) {
    const commentsList = document.getElementById('modal-comments-list');
    if (!commentsList) return;

    commentsList.innerHTML = `<div style="padding:16px;text-align:center;color:#71767b;"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading replies...</div>`;

    const { data: replies, error } = await supabaseClient
        .from('replies')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

    if (error) {
        commentsList.innerHTML = `<div style="padding:16px;color:#f91880;">Failed to load replies.</div>`;
        return;
    }

    if (!replies || replies.length === 0) {
        commentsList.innerHTML = `<div style="padding:30px;text-align:center;color:#71767b;font-size:13px;">No replies yet. Be the first to respond.</div>`;
        return;
    }

    commentsList.innerHTML = '';
    
    replies.forEach(reply => {
        const replyNode = document.createElement('div');
        replyNode.className = 'reply-node';
        replyNode.style.cssText = 'width:100%; padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.04);';
        
        // Check if this reply is from the original poster
        const isOriginalPoster = reply.session_id === globalActiveThreadAuthorSessionId;
        const opTagHtml = isOriginalPoster ? '<span class="op-badge" style="background:#1d9bf0; color:#fff; font-size:10px; padding:2px 6px; border-radius:4px; font-weight:bold; margin-left:6px;">OP</span>' : '';
        const displayTime = typeof formatTimestampRelative === 'function' ? formatTimestampRelative(reply.created_at) : 'Just now';
        
        // Build the reply HTML
        replyNode.innerHTML = `
            <div style="display:flex; align-items:center; margin-bottom:4px;">
                <span style="font-weight:bold; font-size:13px; color:#f7f9fa;">Anonymous</span>
                ${opTagHtml}
                <span style="color:#71767b; font-size:12px; margin-left:6px;">· ${displayTime}</span>
            </div>
            <div style="font-size:14px; line-height:1.4; color:#e7e9ea; white-space:pre-wrap; word-break:break-word;">${escapeHtmlMarkup(reply.content)}</div>
        `;
        
        commentsList.appendChild(replyNode);
    });
}

// =========================================================================
// 3. OPTIMISTIC REPLY INJECTION ENGINE
// =========================================================================
async function handleReplySubmit() {
    const textarea = document.getElementById('reply-textarea');
    const submitBtn = document.getElementById('submit-reply-btn');
    const commentsContainer = document.getElementById('modal-comments-list');

    if (!textarea || !submitBtn || !commentsContainer) {
        console.error("Missing critical DOM elements in thread modal.");
        return;
    }

    const content = textarea.value.trim();
    if (!content || !globalActiveFocusedPostId) return;

    // Lock controls to block multi-click race condition states
    textarea.disabled = true;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Posting...';

    const tempReplyContent = content;
    const nowIsoString = new Date().toISOString();

    // Clear loading state placeholders gracefully
    if (commentsContainer.innerHTML.includes('No replies yet') || commentsContainer.innerHTML.includes('Reading responses')) {
        commentsContainer.innerHTML = '';
    }

    // Build the optimistic UI card component block
    const localNode = document.createElement('div');
    localNode.className = 'reply-node temporary-optimistic-node';
    localNode.style.cssText = 'width:100%; padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.04); opacity: 0.6;'; 

    const isOriginalPoster = currentSessionId === globalActiveThreadAuthorSessionId;
    const opTagHtml = isOriginalPoster ? `<span style="background:#1d9bf0; color:#fff; font-size:10px; padding:2px 6px; border-radius:4px; font-weight:bold; margin-left:6px;">OP</span>` : '';

    localNode.innerHTML = `
        <div style="display:flex; align-items:center; margin-bottom:4px;">
            <span style="font-weight:bold; font-size:13px; color:#f7f9fa;">Anon</span>
            ${opTagHtml}
            <span style="color:#71767b; font-size:12px; margin-left:6px;">· Just now</span>
        </div>
    `;

    const textContainer = document.createElement('div');
    textContainer.style.cssText = 'font-size:14px; line-height:1.4; color:#e7e9ea; white-space:pre-wrap; word-break:break-word;';
    textContainer.textContent = tempReplyContent; 
    localNode.appendChild(textContainer);
    
    commentsContainer.appendChild(localNode);

    const modalScroll = document.querySelector('.modal-scroll');
    if (modalScroll) {
        modalScroll.scrollTop = modalScroll.scrollHeight;
    }

    // Reset input fields immediately for seamless look-and-feel transitions
    textarea.value = '';
    textarea.disabled = false;
    submitBtn.disabled = false;
    submitBtn.textContent = 'Reply';

    // Ship tracking records to backend tables quietly
    const { error } = await supabaseClient
        .from('replies')
        .insert([
            {
                post_id: globalActiveFocusedPostId,
                content: tempReplyContent,
                session_id: currentSessionId,
                created_at: nowIsoString
            }
        ]);

    if (error) {
        console.error('Failed to sync reply to cloud database:', error.message);
        localNode.remove();
        alert('Transmission failed. Your message could not be encrypted.');
        return;
    }

    // Solidify node presentation rules once verified by backend acknowledgments
    localNode.style.opacity = '1'; 
    localNode.classList.remove('temporary-optimistic-node');

    // Dynamically update your main feed metric displays inline
    const mainTimelinePostCard = document.getElementById(`ui-post-${globalActiveFocusedPostId}`);
    if (mainTimelinePostCard) {
        // Find your comment badge span layout securely
        const commentCounterSpan = mainTimelinePostCard.querySelector('.action.comment span');
        if (commentCounterSpan) {
            const currentCount = parseInt(commentCounterSpan.textContent) || 0;
            commentCounterSpan.textContent = currentCount + 1;
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
    // 1. Update the global state tracking index variable
    globalCurrentFeedTab = tabName;
    
    // 2. NEW: Burn choice into persistent local device storage matrix 
    localStorage.setItem('cc_preferred_tab', tabName);

    // 3. Toggle interactive UI class states to match current active selection layout
    const latestTab = document.getElementById('tab-latest');
    const trendingTab = document.getElementById('tab-trending');

    if (latestTab) latestTab.className = tabName === 'latest' ? 'active' : '';
    if (trendingTab) trendingTab.className = tabName === 'trending' ? 'active' : '';
    
    // 4. Trigger chronological timeline rendering loop (Sorting algorithms automatically execute inside)
    fetchAndRenderFeed();
}

function filterByCategory(categoryName, elementNode) {
    // 🌟 FIXED: Added 'vibes_chills' to match your HTML dropdown select capabilities
    const validCategories = [
        'all', 'general', 'campus', 'programming', 
        'anime', 'studies', 'confessions', 'vibes_chills'
    ];
    
    if (categoryName === 'all') {
        globalCurrentCategory = 'all';
    } else if (validCategories.includes(categoryName)) {
        globalCurrentCategory = categoryName;
    } else {
        console.warn('Unknown category:', categoryName);
        return;
    }
    
    // Update active pill styling securely
    document.querySelectorAll('.cat-pill').forEach(pill => {
        pill.classList.remove('active');
    });
    if (elementNode) elementNode.classList.add('active');
    
    // Refresh feed cleanly with the updated category constraint parameter
    if (typeof fetchAndRenderFeed === 'function') {
        fetchAndRenderFeed();
    }
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
    if (!stringInput) return '';
    const div = document.createElement('div');
    div.textContent = stringInput;
    return div.innerHTML;
}

function formatTimestampRelative(dateString) {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now - past;
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
}

function getCategoryDisplayName(category) {
    const names = {
        'general': 'General',
        'campus': 'Campus',
        'programming': 'Programming',
        'anime': 'Anime',
        'studies': 'Studies',
        'confessions': 'Confessions',
    };
    return names[category] || category;
}


/**
 * Checks if text contains any banned words or targeted harassment.
 * @param {string} text - The user input to scan.
 * @returns {boolean} - True if toxic content is detected.
 */
function containsProhibitedContent(text) {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    return BANNED_KEYWORDS.some(word => lowerText.includes(word.toLowerCase()));
}

