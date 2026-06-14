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

let globalCurrentFeedTab = localStorage.getItem('cc_preferred_tab') || 'latest';
let globalCurrentCategory = 'all';        
let globalActiveFocusedPostId = null;   


// Global tracking variable definition
let currentSessionId = null;

// ==========================================
// CORE RE-ENGINEERED LIFECYCLE INITIALIZER
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    // 1. Attempt to retrieve an existing secure session token tracking ID
    const existingSession = localStorage.getItem('cc_session_id');

    // 2. Locate your exact DOM wrappers matching your HTML definitions
    const splashLayer = document.getElementById('splash-layer'); 
    const mainAppLayout = document.querySelector('.twitter'); 

    console.log("🔒 CampusCrypt Handshake - Active Session:", existingSession);

    if (existingSession) {
        // 🌟 SCENARIO A: Authenticated Peer Returning
        currentSessionId = existingSession;

        // Forcefully eliminate the onboarding layer instantly with zero layout flash
        if (splashLayer) {
            splashLayer.classList.add('hidden', 'fade-out');
            splashLayer.style.display = 'none';
        }

        // Forcefully mount and display your main feed timeline dashboard structure
        if (mainAppLayout) {
            mainAppLayout.classList.remove('hidden');
            mainAppLayout.style.display = 'block'; 
            mainAppLayout.style.opacity = '1';     
        }

        // Stream your data posts onto the timeline interface layout right away
        if (typeof fetchAndRenderFeed === 'function') {
            fetchAndRenderFeed();
        }

    } else {
        // 🌟 SCENARIO B: Brand New User Approaching
        // Keep the main feed completely unmounted while your welcome animations execute
        if (mainAppLayout) {
            mainAppLayout.classList.add('hidden');
            mainAppLayout.style.display = 'none';
            mainAppLayout.style.opacity = '0';
        }
        if (splashLayer) {
            splashLayer.classList.remove('hidden', 'fade-out');
            splashLayer.style.display = 'flex';
        }
    }
});

// ==========================================
// INTERACTIVE SPLASH ONBOARDING SWITCHERS
// ==========================================
function advanceToRulesScreen() {
    const welcomeStage = document.getElementById('splash-stage-welcome');
    const rulesStage = document.getElementById('splash-stage-rules');
    
    if (welcomeStage && rulesStage) {
        welcomeStage.classList.add('hidden');
        rulesStage.classList.remove('hidden');
    }
}

function acceptRulesAndEnterApp() {
    const mainSplashLayer = document.getElementById('splash-layer');
    const mainAppLayout = document.querySelector('.twitter'); 

    if (!mainSplashLayer) return;

    // 1. Commit the session tracking identifier to permanent memory storage strings
    const newSessionId = 'cc_peer_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('cc_session_id', newSessionId);
    currentSessionId = newSessionId;

    // 2. Prepare the main feed timeline framework layout underneath invisibly
    if (mainAppLayout) {
        mainAppLayout.style.opacity = '0';
        mainAppLayout.classList.remove('hidden');
        mainAppLayout.style.display = 'block';
    }

    // 3. Trigger your hardware-accelerated fade-out sequence using your exact CSS rules
    mainSplashLayer.classList.add('fade-out');

    // 4. Smoothly bring the main dashboard timeline up into sharp focus mid-way
    setTimeout(() => {
        if (mainAppLayout) {
            mainAppLayout.style.transition = 'opacity 0.4s ease';
            mainAppLayout.style.opacity = '1';
        }
    }, 150);

    // 5. HARD RE-LOCK: Drop splash layout completely out of rendering space when animation settles
    setTimeout(() => {
        mainSplashLayer.classList.add('hidden');
        mainSplashLayer.style.display = 'none'; 
        
        // Load feed post data cards safely with zero user interface lag or loop loops
        if (typeof fetchAndRenderFeed === 'function') {
            fetchAndRenderFeed();
        }
    }, 500); // Matches your 0.5s CSS transition definitions precisely!
}



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
    
    // 1. Clear previous view state and show instant layout container
    feedContainer.innerHTML = '';
    
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    
    // 2. Base Query: Grab ONLY the posts. No blocking loops.
    let query = supabaseClient
        .from('posts')
        .select('*')
        .gt('created_at', fortyEightHoursAgo);

    if (globalCurrentCategory !== 'all') {
        query = query.eq('category', globalCurrentCategory);
    }

    query = query.order('created_at', { ascending: false });

    const { data: posts, error } = await query.limit(40);

    if (error) {
        console.error('Database Sync Error:', error.message);
        feedContainer.innerHTML = `<div style="padding:20px; text-align:center; color:#f91880;">Database Sync Failed.</div>`;
        return;
    }

    if (!posts || posts.length === 0) {
        feedContainer.innerHTML = `<div style="padding:40px; text-align:center; color:#71767b;">No active threads over the last 48 hours.</div>`;
        return;
    }

    // 3. Stagger-render the raw posts instantly without waiting for metrics
    posts.forEach((post, index) => {
        setTimeout(() => {
            // Initialize safe temporary default counts so compiling doesn't break
            post.likes_count = '...';
            post.reply_count = '...';
            post.has_user_liked = false;

            const modernNode = compilePostHtmlNode(post);
            
            // Subtle entry style animations
            modernNode.style.opacity = '0';
            modernNode.style.transform = 'translateY(8px)';
            modernNode.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
            
            feedContainer.appendChild(modernNode);
            
            requestAnimationFrame(() => {
                modernNode.style.opacity = '1';
                modernNode.style.transform = 'translateY(0)';
            });

            // 4. BACKGROUND FETCH: Tell this specific post to go fetch its own scores invisibly
            lazyLoadPostMetrics(post.id, modernNode);

        }, index * 40); // Fast 40ms trickle cascade
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
                    <span class="name">Anonymous</span>
                    <span class="handle">@anon</span>
                    <span class="time">· ${formattedTime}</span>
                    <span class="cat-badge">${post.category}</span>
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
    globalActiveFocusedPostId = postId;
    const modal = document.getElementById('thread-modal');
    const focusBox = document.getElementById('modal-focus-post');
    
    if (!modal || !focusBox) return;
    
    // 1. Reveal the modal layout wrapper instantly
    modal.classList.remove('hidden');

    const formattedTime = typeof formatTimestampRelative === 'function' ? formatTimestampRelative(postCreatedAt) : 'Just now';

    // 2. NATIVE SANITIZATION: Prevents XSS injections without crashing if escapeHtmlMarkup is missing
    const safeContent = typeof escapeHtmlMarkup === 'function' ? escapeHtmlMarkup(postContent) : postContent;

    // 3. INSTANT UI PAINT: Render the focused parent post text right away
    focusBox.innerHTML = `
        <div style="display:flex; gap:10px; align-items:center; margin-bottom:8px;">
            <div class="avatar" style="width:32px; height:32px; font-size:14px; display:flex; align-items:center; justify-content:center;">🥷</div>
            <div>
                <div style="font-weight:bold; font-size:14px; color:#f7f9fa;">Original Poster</div>
                <div style="color:#71767b; font-size:12px;">${formattedTime}</div>
            </div>
        </div>
        <div style="font-size:17px; line-height:1.4; color:white; margin-bottom:8px; white-space:pre-wrap; word-break:break-word;">${safeContent}</div>
        <span class="cat-badge">${postCategory}</span>
    `;

    // 4. DEFERRED OP SECURITY FETCH: Quietly resolve owner verification in the background
    supabaseClient
        .from('posts')
        .select('session_id')
        .eq('id', postId)
        .single()
        .then(({ data, error }) => {
            if (!error && data) {
                globalActiveThreadAuthorSessionId = data.session_id;
                // Re-trigger the comment loop so badges align correctly with the resolved session
                fetchAndRenderComments(postId);
            }
        });

    // 5. DEFERRED COMMENT FETCH: Fire off the replies data trickle loop asynchronously
    fetchAndRenderComments(postId);
}


async function fetchAndRenderComments(postId) {
    const commentsList = document.getElementById('modal-comments-list');
    if (!commentsList) return;

    // 1. Initialize clean loading state layout
    commentsList.innerHTML = `<div style="text-align:center; color:#71767b; font-size:13px; padding:20px;">Reading responses...</div>`;

    // 2. Pull comments from database
    const { data: replies, error } = await supabaseClient
        .from('replies')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Supabase Reply Fetch Error:', error.message);
        commentsList.innerHTML = `<div style="text-align:center; color:#f91880; font-size:13px; padding:20px;">Database connection failed.</div>`;
        return;
    }

    if (!replies || replies.length === 0) {
        commentsList.innerHTML = `<div style="text-align:center; color:#71767b; font-size:13px; padding:20px;">No replies yet. Be the first to add a node!</div>`;
        return;
    }

    commentsList.innerHTML = '';
    
    replies.forEach(reply => {
        const replyNode = document.createElement('div');
        replyNode.className = 'reply-node';
        replyNode.style.cssText = 'width:100%; padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.04);';

        // Compute OP badges safely
        let isOriginalPoster = false;
        if (reply?.session_id && typeof globalActiveThreadAuthorSessionId !== 'undefined') {
            isOriginalPoster = reply.session_id === globalActiveThreadAuthorSessionId;
        }
        
        // Shortened styling properties
        const opTagHtml = isOriginalPoster ? `<span style="background:#1d9bf0; color:#fff; font-size:10px; padding:2px 6px; border-radius:4px; font-weight:bold; margin-left:6px;">OP</span>` : '';
        const displayTime = typeof formatTimestampRelative === 'function' ? formatTimestampRelative(reply.created_at) : 'Just now';

        // Assemble header layout using "Anon" instead of "Anonymous Operator"
        replyNode.innerHTML = `
            <div style="display:flex; align-items:center; margin-bottom:4px;">
                <span style="font-weight:bold; font-size:13px; color:#f7f9fa;">Anon</span>
                ${opTagHtml}
                <span style="color:#71767b; font-size:12px; margin-left:6px;">· ${displayTime}</span>
            </div>
        `;
        
        // Native comment body sanitizer (Handles long word text-wrapping flawlessly)
        const textContainer = document.createElement('div');
        textContainer.style.cssText = 'font-size:14px; line-height:1.4; color:#e7e9ea; white-space:pre-wrap; word-break:break-word;';
        textContainer.textContent = reply.content;
        
        replyNode.appendChild(textContainer);
        commentsList.appendChild(replyNode);
    });
}

async function handleReplySubmit() {
    const textarea = document.getElementById('reply-textarea');
    const submitBtn = document.getElementById('submit-reply-btn');
    
    // 🌟 FIXED: Target 'modal-comments-list' to match your actual HTML template ID exactly
    const commentsContainer = document.getElementById('modal-comments-list');

    if (!textarea || !submitBtn || !commentsContainer) {
        console.error("Missing critical DOM elements in thread modal.");
        return;
    }

    const content = textarea.value.trim();
    if (!content) return;

    // 1. Lock input states to prevent double-submitting spam
    textarea.disabled = true;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Posting...';

    // Capture values for instant rendering
    const tempReplyContent = content;
    const nowIsoString = new Date().toISOString();

    // 2. IMMEDIATE INJECTION (Optimistic UI)
    // Clear out placeholder messages if present
    if (commentsContainer.innerHTML.includes('No replies yet') || commentsContainer.innerHTML.includes('Reading responses')) {
        commentsContainer.innerHTML = '';
    }

    // Create a temporary local node card
    const localNode = document.createElement('div');
    localNode.className = 'reply-node temporary-optimistic-node';
    localNode.style.cssText = 'width:100%; padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.04); opacity: 0.6;'; 

    // Is the replier the Original Poster?
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
    
    // Append your new node straight to the bottom of the list instantly!
    commentsContainer.appendChild(localNode);

    // Auto-scroll the container to the bottom so you see your reply slip into place
    const modalScroll = document.querySelector('.modal-scroll');
    if (modalScroll) {
        modalScroll.scrollTop = modalScroll.scrollHeight;
    }

    // 3. Clear the text input field immediately for clean user experience
    textarea.value = '';
    textarea.disabled = false;
    submitBtn.disabled = false;
    submitBtn.textContent = 'Reply';

    // 4. QUIET BACKGROUND SYNC: Ship data to Supabase silently
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

    // 5. Finalize the node styling once confirmed by the database
    localNode.style.opacity = '1'; 
    localNode.classList.remove('temporary-optimistic-node');

    // 6. Dynamically increment the comment counter on the main timeline post card
    const mainTimelinePostCard = document.getElementById(`ui-post-${globalActiveFocusedPostId}`);
    if (mainTimelinePostCard) {
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

// ==========================================
// CLIENT-SIDE ANTI-HARASSMENT GUARD
// ==========================================
const BANNED_KEYWORDS = [
    "kill", "porno", "porn", "fuck", "fvck", "bitch", "asshole", "cunt", "dick", "suicide", "vagina", "penis", "breast", "boobs", "boob", "stupid"
    ];

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