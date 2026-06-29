// ==========================================
// 1. CONFIGURATION & IDENTITY INITIALIZATION
// ==========================================

const SUPABASE_URL = 'https://xtqfbaqckgodxmsnyexh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0cWZiYXFja2dvZHhtc255ZXhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyOTgwODIsImV4cCI6MjA5Njg3NDA4Mn0.cWsx_9gyk3m9Dz6ZMn_8qHQ0s_20qiNvJTUn8Q0p3uM';
const BANNED_KEYWORDS = [
    "kill", "porno", "porn", "fuck", "fvck", "bitch", "asshole", 
    "cunt", "dick", "suicide", "vagina", "penis", "breast", "boobs", "boob", "stupid", "pussy", "rape", "slut", "ass" 
];
const GIPHY_API_KEY = '1phayPh21mSPyikZDaw0xw0s6ikBIcxW'; 
let globalSelectedStickerUrl = null;
let scrollPosition = 0;


let isNewSession = false;

let currentSessionId = localStorage.getItem('crypt_session');
if (!currentSessionId) {
    isNewSession = true;
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
    console.log(" Advancing to rules stage...");
    const welcomeStage = document.getElementById('splash-stage-welcome');
    const rulesStage = document.getElementById('splash-stage-rules');
    
    if (welcomeStage && rulesStage) {
        welcomeStage.classList.add('hidden');
        rulesStage.classList.remove('hidden');
    }
}
function acceptRulesAndEnterApp() {
    console.log(" Verifying credential handshakes...");
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
        initPresenceTracking();
        initRealtimeSubscriptions();
        
    } else {
        // Handshake Entry Stage Setup Route
        if (mainAppLayout) mainAppLayout.classList.add('hidden');
        if (splashLayer) {
            splashLayer.classList.remove('hidden', 'fade-out');
            splashLayer.style.display = 'flex';
        }
    }
});

function checkSessionChange() {
    const storedSession = localStorage.getItem('crypt_session');
    if (storedSession && storedSession !== currentSessionId) {
        console.log("🔄 External session change detected. Recalibrating state parameters...");
        currentSessionId = storedSession;
        isNewSession = false; // System baseline established, drop initial welcome screen alerts
        fetchAndRenderFeed(false);
    }
}

window.addEventListener('focus', checkSessionChange);

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



async function fetchAndRenderFeed(isRefresh = false) {
    // === SCROLL POSITION: ONLY SAVE IF REFRESHING SAME TAB ===
    if (isRefresh) {
        scrollPosition = window.scrollY;
    } else {
        scrollPosition = 0; // Fresh tab change resets view height anchor cleanly
    }
    
    const feedContainer = document.getElementById('feed-container');
    if (!feedContainer) return;
    
    // 1. Show cinematic spinner
    feedContainer.innerHTML = `
        <div id="feed-loading-state" style="padding: 50px; text-align: center; color: #71767b;">
            <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 24px; color: #1d9bf0;"></i>
        </div>
    `;
    
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    
    // 2. Base Query Construction
    let query = supabaseClient.from('posts').select('*');
    query = query.gt('created_at', fortyEightHoursAgo);

    if (typeof globalCurrentCategory !== 'undefined' && globalCurrentCategory !== 'all') {
        query = query.eq('category', globalCurrentCategory);
    }

    // Apply sorting rules and fetch records capped at the 60-post ceiling
    const { data: posts, error } = await query
        .order('created_at', { ascending: false })
        .limit(60);

    // Clear spinner element
    feedContainer.innerHTML = '';

    if (error) {
        console.error('Database Sync Error:', error.message);
        feedContainer.innerHTML = `<div style="padding: 40px; text-align: center; color: #f91880; font-family: monospace;">[!] SECURE SYNC FAILURE.</div>`;
        return;
    }

    // INTEGRATION: Dynamic Empty / Welcome States
    if (!posts || posts.length === 0) {
        if (typeof isNewSession !== 'undefined' && isNewSession) {
            feedContainer.innerHTML = `
                <div class="welcome-state" style="padding: 50px 20px; text-align: center; color: #71767b;">
                    <div style="font-size: 48px; margin-bottom: 16px;">👋</div>
                    <p style="font-size: 20px; font-weight: bold; color: #ffffff; margin-bottom: 8px;">Welcome to CampusCrypt!</p>
                    <p style="font-size: 14px; max-width: 280px; margin: 0 auto;">Be the first to drop an anonymous trace on this network wire.</p>
                </div>
            `;
        } else {
            feedContainer.innerHTML = `
                <div style="padding: 40px; text-align: center; color: #71767b; font-size: 14px;">
                    No active anonymous encryption tracks on this wire.
                </div>
            `;
        }
        return;
    }

    // 🌟 INTEGRATION: Trending Sorting Hook
    if (typeof globalCurrentFeedTab !== 'undefined' && globalCurrentFeedTab === 'trending') {
        // Sorts descending based on live metric arrays before DOM insertion loops kick off
        posts.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
    }

    // 3. Stagger-render layout cards with native hardware acceleration
    let renderedCount = 0;

    posts.forEach((post, index) => {
        setTimeout(() => {
            // Safe fallback defaults preserve any real metrics parsed during stream transactions
            post.likes_count = post.likes_count ?? '...';
            post.reply_count = post.reply_count ?? '...';
            post.has_user_liked = post.has_user_liked ?? false;

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

            // === 🌟 FIXED TRACKING DISPATCHER ===
            renderedCount++;
            // Execute the scroll restoration precisely on the last appended node frame
            if (renderedCount === posts.length) {
                requestAnimationFrame(() => {
                    window.scrollTo(0, scrollPosition);
                });
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

    // ====== INTEGRATION: Sticker render ======
    let stickerHtml = '';
    if (post.image_url) {
        stickerHtml = `
            <div class="post-sticker-render" style="margin-top: 10px; display: flex; justify-content: flex-start;">
                <img src="${post.image_url}" loading="lazy" style="max-height: 140px; width: auto; object-fit: contain; border-radius: 8px;">
            </div>
        `;
    }
    // ========================================

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
            ${stickerHtml}
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
    // INTEGRATION: Include the selected sticker URL if any
    const payload = {
        content,
        category,
        session_id: currentSessionId,
        image_url: globalSelectedStickerUrl || null
    };

    const { data: newRowData, error } = await supabaseClient
        .from('posts')
        .insert([payload])
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
    
    // INTEGRATION: Reset sticker selection
    globalSelectedStickerUrl = null;
    const previewContainer = document.getElementById('selectedStickerPreview');
    if (previewContainer) {
        previewContainer.style.display = 'none';
        const previewImg = document.getElementById('previewStickerImg');
        if (previewImg) previewImg.src = '';
    }
    
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
        // INTEGRATION: Ensure the image_url is carried into the client-side post object
        newRowData.image_url = payload.image_url;

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
        
        // ====== INTEGRATION: Render reply sticker if present ======
        let replyStickerHtml = '';
        if (reply.image_url) {
            replyStickerHtml = `
                <div class="comment-sticker-render" style="margin-top: 8px; display: flex;">
                    <img src="${reply.image_url}" loading="lazy" style="max-height: 100px; width: auto; object-fit: contain; border-radius: 6px;">
                </div>
            `;
        }
        // ===========================================================
        
        // Build the reply HTML
        replyNode.innerHTML = `
            <div style="display:flex; align-items:center; margin-bottom:4px;">
                <span style="font-weight:bold; font-size:13px; color:#f7f9fa;">Anonymous</span>
                ${opTagHtml}
                <span style="color:#71767b; font-size:12px; margin-left:6px;">· ${displayTime}</span>
            </div>
            <div style="font-size:14px; line-height:1.4; color:#e7e9ea; white-space:pre-wrap; word-break:break-word;">${escapeHtmlMarkup(reply.content)}</div>
            ${replyStickerHtml}
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

    // ====== INTEGRATION: Build payload with reply sticker ======
    const replyPayload = {
        post_id: globalActiveFocusedPostId,
        content: tempReplyContent,
        session_id: currentSessionId,
        created_at: nowIsoString,
        image_url: globalSelectedReplyStickerUrl || null  // ← ADD THIS LINE
    };
    // =========================================================

    // Ship tracking records to backend tables quietly
    const { error } = await supabaseClient
        .from('replies')
        .insert([replyPayload]);

    if (error) {
        console.error('Failed to sync reply to cloud database:', error.message);
        localNode.remove();
        alert('Transmission failed. Your message could not be encrypted.');
        return;
    }

    // Solidify node presentation rules once verified by backend acknowledgments
    localNode.style.opacity = '1'; 
    localNode.classList.remove('temporary-optimistic-node');

    // ====== INTEGRATION: Reset reply sticker state after successful submission ======
    globalSelectedReplyStickerUrl = null;
    const previewContainer = document.getElementById('replyStickerPreview');
    if (previewContainer) {
        previewContainer.style.display = 'none';
        const previewImg = document.getElementById('previewReplyStickerImg');
        if (previewImg) previewImg.src = '';
    }
    const searchInput = document.getElementById('replyStickerSearchInput');
    if (searchInput) searchInput.value = '';
    const drawer = document.getElementById('replyStickerDrawer');
    if (drawer) drawer.style.display = 'none';
    // ============================================================================

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
    
    // Reset reply sticker state when modal closes
    globalSelectedReplyStickerUrl = null;
    const preview = document.getElementById('replyStickerPreview');
    if (preview) preview.style.display = 'none';
    const previewImg = document.getElementById('previewReplyStickerImg');
    if (previewImg) previewImg.src = '';
    const drawer = document.getElementById('replyStickerDrawer');
    if (drawer) drawer.style.display = 'none';
}

// ==========================================
// 6. NAVIGATION FILTERS & CONTROL ARRAYS
// ==========================================

function switchFeedTab(tabName) {
    // 1. Update the global state tracking index variable
    globalCurrentFeedTab = tabName;
    
    // 2. Burn choice into persistent local device storage matrix 
    localStorage.setItem('cc_preferred_tab', tabName);

    // 3. Toggle interactive UI class states securely using classList
    const latestTab = document.getElementById('tab-latest');
    const trendingTab = document.getElementById('tab-trending');

    if (latestTab && trendingTab) {
        if (tabName === 'latest') {
            latestTab.classList.add('active');
            trendingTab.classList.remove('active');
        } else {
            trendingTab.classList.add('active');
            latestTab.classList.remove('active');
        }
    }
    
    // 4. Trigger chronological timeline rendering loop
    fetchAndRenderFeed();
}


// ==========================================
// STICKER FEATURE FUNCTIONS
// ==========================================

// Toggle Sticker Drawer
function toggleStickerDrawer() {
    const drawer = document.getElementById('stickerDrawer');
    if (!drawer) return;
    
    if (drawer.style.display === 'none' || drawer.style.display === '') {
        drawer.style.display = 'block';
        // Load trending stickers if tray is empty
        const tray = document.getElementById('stickerResultsTray');
        if (tray && tray.children.length === 0) {
            fetchGiphyStickers();
        }
    } else {
        drawer.style.display = 'none';
    }
}

// Fetch Stickers from GIPHY
async function fetchGiphyStickers(searchQuery = '') {
    const tray = document.getElementById('stickerResultsTray');
    if (!tray) return;
    
    tray.innerHTML = `<div style="color: #71767b; font-size: 12px; padding: 20px; text-align: center;">Loading stickers...</div>`;
    
    const url = searchQuery.trim() === ''
        ? `https://api.giphy.com/v1/stickers/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`
        : `https://api.giphy.com/v1/stickers/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchQuery)}&limit=20&rating=g`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data.data || data.data.length === 0) {
            tray.innerHTML = `<div style="color: #71767b; font-size: 12px; padding: 20px; text-align: center;">No stickers found.</div>`;
            return;
        }
        
        tray.innerHTML = data.data.map(sticker => {
            const staticUrl = sticker.images.fixed_height_small.url;
            const fullUrl = sticker.images.fixed_height.url;
            return `
                <img src="${staticUrl}" 
                     class="sticker-grid-item"
                     onclick="selectSticker('${fullUrl}')"
                     alt="sticker">
            `;
        }).join('');
        
    } catch (err) {
        console.error("Giphy Error:", err);
        tray.innerHTML = `<div style="color: #f91880; font-size: 12px; padding: 20px; text-align: center;">Failed to load stickers.</div>`;
    }
}

// Select a sticker
function selectSticker(url) {
    globalSelectedStickerUrl = url;
    document.getElementById('previewStickerImg').src = url;
    document.getElementById('selectedStickerPreview').style.display = 'flex';
    document.getElementById('stickerDrawer').style.display = 'none';
}

// Remove selected sticker
function removeSticker() {
    globalSelectedStickerUrl = null;
    document.getElementById('selectedStickerPreview').style.display = 'none';
    document.getElementById('previewStickerImg').src = '';
}

function filterByCategory(categoryName, elementNode) {
    const validCategories = [
        'all', 'general', 'campus', 'programming', 
        'anime', 'studies', 'confessions'
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

// ==========================================================================
//  UNIFIED REAL-TIME DATA STREAM PIPELINE (POSTS LAYER)
// ==========================================================================
function initRealtimeSubscriptions() {
    console.log(" Initializing secure real-time stream links...");

    supabaseClient
        .channel('public-feed-stream')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'posts' }, 
            async (payload) => {
                
                // ----------------------------------------------------------
                // CASE A: NEW INCOMING POST BROADCAST
                // ----------------------------------------------------------
                if (payload.eventType === 'INSERT') {
                    const newPost = payload.new;
                    console.log('📡 New incoming post tracked:', newPost);

                    // 🛑 GUARDRAIL 1: Ignore insertion if the local user authored it
                    if (newPost.session_id === currentSessionId) return;

                    // 🛑 GUARDRAIL 2: Process PWA app badge indices if application window is backgrounded
                    if (document.visibilityState === 'hidden') {
                        let unreadCount = parseInt(localStorage.getItem('crypt_unread')) || 0;
                        unreadCount++;
                        localStorage.setItem('crypt_unread', unreadCount);
                        if ('setAppBadge' in navigator) {
                            navigator.setAppBadge(unreadCount).catch((err) => console.error("Badge sync error:", err));
                        }
                    }

                    // 🛑 GUARDRAIL 3: Verify the post matches active user category filters
                    if (typeof globalCurrentCategory !== 'undefined' && globalCurrentCategory !== 'all') {
                        if (newPost.category !== globalCurrentCategory) return;
                    }

                    // 🛑 GUARDRAIL 4: Only auto-inject layouts directly if the user is looking at the 'Latest' stream
                    if (globalCurrentFeedTab !== 'latest') return;

                    const container = document.getElementById('feed-container');
                    if (!container) return;

                    // Clear empty state placeholders text gracefully
                    if (container.querySelector('div[style*="text-align:center"]') || container.querySelector('div[style*="text-align: center"]')) {
                        container.innerHTML = '';
                    }

                    // Protect node mapping structures from duplicating items
                    if (document.getElementById(`ui-post-${newPost.id}`)) return;

                    // Assign standard base counter metrics fallback
                    newPost.likes_count = 0;
                    newPost.reply_count = 0;
                    newPost.has_user_liked = false;

                    // Append node array with highlight feedback color transitions
                    const incomingNode = compilePostHtmlNode(newPost);
                    if (incomingNode) {
                        incomingNode.style.backgroundColor = '#1d9bf015'; // Soft Twitter Blue glow highlights entry
                        incomingNode.style.transition = 'background-color 0.5s ease';
                        
                        container.insertBefore(incomingNode, container.firstChild);
                        
                        // Fade glowing entry smoothly to standard transparent dark layout space
                        setTimeout(() => { 
                            incomingNode.style.backgroundColor = 'transparent'; 
                        }, 2500);
                    }
                }

                // ----------------------------------------------------------
                // CASE B: REMOTE POST DELETION (MODERATION/ADMIN ENGINE FORCE)
                // ----------------------------------------------------------
                else if (payload.eventType === 'DELETE') {
                    console.log('🗑️ Remote deletion command intercepted:', payload.old.id);
                    const element = document.getElementById(`ui-post-${payload.old.id}`);
                    if (element) {
                        element.style.opacity = '0';
                        element.style.transform = 'scale(0.95)';
                        element.style.transition = 'all 0.3s ease';
                        
                        // Allow deletion animation frames to clear out before drop execution
                        setTimeout(() => { element.remove(); }, 300);
                    }
                }
            }
        )
        .subscribe((status) => {
            console.log('📡 Post stream sync validation status:', status);
        });
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


// ==========================================
// FETCH REPLY STICKERS FROM GIPHY
// ==========================================
async function fetchReplyGiphyStickers(searchQuery = '') {
    const tray = document.getElementById('replyStickerResultsTray');
    if (!tray) {
        console.error('replyStickerResultsTray element not found');
        return;
    }
    
    tray.innerHTML = `<div style="color: #71767b; font-size: 12px; padding: 20px; text-align: center;">Loading stickers...</div>`;
    
    const url = searchQuery.trim() === ''
        ? `https://api.giphy.com/v1/stickers/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`
        : `https://api.giphy.com/v1/stickers/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchQuery)}&limit=20&rating=g`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data.data || data.data.length === 0) {
            tray.innerHTML = `<div style="color: #71767b; font-size: 12px; padding: 20px; text-align: center;">No stickers found.</div>`;
            return;
        }
        
        tray.innerHTML = data.data.map(sticker => {
            const staticUrl = sticker.images.fixed_height_small.url;
            const fullUrl = sticker.images.fixed_height.url;
            return `
                <img src="${staticUrl}" 
                     style="height: 70px; width: auto; cursor: pointer; object-fit: contain; transition: transform 0.15s ease; border-radius: 6px;" 
                     onclick="selectReplySticker('${fullUrl}')"
                     onmouseover="this.style.transform='scale(1.08)'" 
                     onmouseout="this.style.transform='scale(1)'">
            `;
        }).join('');
        
    } catch (err) {
        console.error("Giphy Reply Sync Error:", err);
        tray.innerHTML = `<div style="color: #f91880; font-size: 12px; padding: 20px; text-align: center;">Failed to load stickers.</div>`;
    }
}

// ==========================================
// SELECT REPLY STICKER
// ==========================================
function selectReplySticker(url) {
    globalSelectedReplyStickerUrl = url;
    
    const previewImg = document.getElementById('previewReplyStickerImg');
    const previewContainer = document.getElementById('replyStickerPreview');
    
    if (previewImg) previewImg.src = url;
    if (previewContainer) previewContainer.style.display = 'flex';
    
    const drawer = document.getElementById('replyStickerDrawer');
    if (drawer) drawer.style.display = 'none';
}

// ==========================================
// REMOVE REPLY STICKER
// ==========================================
function removeReplySticker() {
    globalSelectedReplyStickerUrl = null;
    
    const previewContainer = document.getElementById('replyStickerPreview');
    const previewImg = document.getElementById('previewReplyStickerImg');
    
    if (previewContainer) previewContainer.style.display = 'none';
    if (previewImg) previewImg.src = '';
}

// ==========================================
// REPLY STICKER SEARCH (Debounced)
// ==========================================
document.getElementById('replyStickerSearchInput')?.addEventListener('input', (e) => {
    clearTimeout(window.replyStickerSearchTimer);
    window.replyStickerSearchTimer = setTimeout(() => {
        fetchReplyGiphyStickers(e.target.value);
    }, 400);
});

// ==========================================
// REPLY STICKER REMOVE BUTTON
// ==========================================
document.getElementById('removeReplyStickerBtn')?.addEventListener('click', removeReplySticker);



    document.getElementById('replyStickerToggleBtn')?.addEventListener('click', () => {
    const drawer = document.getElementById('replyStickerDrawer');
    if (!drawer) return;
    if (drawer.style.display === 'none') {
        drawer.style.display = 'block';
        if (document.getElementById('replyStickerResultsTray').children.length === 0) {
            fetchReplyGiphyStickers();
        }
    } else {
        drawer.style.display = 'none';
    }
});

// ==========================================
// APPEND REPLY TO MODAL (WITH STICKER SUPPORT)
// ==========================================
function appendReplyToModal(reply, isOP) {
    const commentsContainer = document.getElementById('modal-comments-list');
    if (!commentsContainer) return;
    
    // Remove empty state if present
    if (commentsContainer.innerHTML.includes('No replies yet') || 
        commentsContainer.innerHTML.includes('Loading replies')) {
        commentsContainer.innerHTML = '';
    }
    
    const replyNode = document.createElement('div');
    replyNode.className = 'reply-node';
    replyNode.style.cssText = 'width:100%; padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.04);';
    
    const opTagHtml = isOP ? '<span class="op-badge" style="background:#1d9bf0; color:#fff; font-size:10px; padding:2px 6px; border-radius:4px; font-weight:bold; margin-left:6px;">OP</span>' : '';
    const displayTime = formatTimestampRelative(reply.created_at);
    
    // ====== INTEGRATION: Render reply sticker if present ======
    let replyStickerHtml = '';
    if (reply.image_url) {
        replyStickerHtml = `
            <div class="comment-sticker-render" style="margin-top: 8px; display: flex;">
                <img src="${reply.image_url}" loading="lazy" style="max-height: 100px; width: auto; object-fit: contain; border-radius: 6px;">
            </div>
        `;
    }
    // ===========================================================
    
    replyNode.innerHTML = `
        <div style="display:flex; align-items:center; margin-bottom:4px;">
            <span style="font-weight:bold; font-size:13px; color:#f7f9fa;">Anonymous</span>
            ${opTagHtml}
            <span style="color:#71767b; font-size:12px; margin-left:6px;">· ${displayTime}</span>
        </div>
        <div style="font-size:14px; line-height:1.4; color:#e7e9ea; white-space:pre-wrap; word-break:break-word;">${escapeHtmlMarkup(reply.content)}</div>
        ${replyStickerHtml}
    `;
    
    commentsContainer.appendChild(replyNode);
    
    // Auto-scroll to bottom
    const modalScroll = document.querySelector('.modal-scroll');
    if (modalScroll) {
        modalScroll.scrollTop = modalScroll.scrollHeight;
    }
}

// ==========================================
// PRESENCE TRACKING (Online Users)
// ==========================================
function initPresenceTracking() {
    const presenceChannel = supabaseClient.channel('campus_crypt_analytics');
    
    presenceChannel
        .on('presence', { event: 'sync' }, () => {
            const newState = presenceChannel.presenceState();
            const totalOnlineNow = Object.keys(newState).length;
            
            // Store in localStorage for admin panel
            localStorage.setItem('crypt_online_count', totalOnlineNow);
            localStorage.setItem('crypt_online_last_update', Date.now());
            
            console.log(`👥 Active online: ${totalOnlineNow}`);
            
            // Dispatch event for admin panel
            window.dispatchEvent(new CustomEvent('presenceUpdate', { 
                detail: { online: totalOnlineNow } 
            }));
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await presenceChannel.track({
                    online_at: new Date().toISOString(),
                    user_session: currentSessionId
                });
            }
        });
}

// ==========================================
// PWA: SERVICE WORKER REGISTRATION
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log(' Service Worker registered:', registration.scope);
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    });
}

// ==========================================
// PWA: BADGE MANAGEMENT
// ==========================================
function clearPwaBadges() {
    if ('clearAppBadge' in navigator) {
        navigator.clearAppBadge().catch((err) => console.log("⚠️ PWA Badge clear failure:", err));
    }
    localStorage.setItem('crypt_unread', '0');
}

// Clear active badge and local disk count indicators when the window gains focus
window.addEventListener('focus', clearPwaBadges);
window.addEventListener('pageshow', clearPwaBadges); // Catches specific mobile OS wake vectors

// ==========================================
// PWA: DEVICE INSTALL PROMPT PIPELINE
// ==========================================
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
    // Intercept native browser installation manager prompts
    e.preventDefault();
    deferredPrompt = e;
    
    // Unhide your custom dashboard entry point installation trigger button
    const installBtn = document.getElementById('installBtn');
    if (installBtn) installBtn.style.display = 'block';
});

document.getElementById('installBtn')?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User installation prompt resolution state: ${outcome}`);
    
    // Strip layout visibility constraints if approved or dismissed
    const installBtn = document.getElementById('installBtn');
    if (installBtn) installBtn.style.display = 'none';
    
    deferredPrompt = null;
});

// ==========================================
// PWA: RUNTIME PERMISSIONS BOOTSTRAPPER
// ==========================================
// Solicits system notification channel authorizations on the user's first page interaction click
document.addEventListener('click', () => {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
            console.log(` System notice authorization status: ${permission}`);
        });
    }
}, { once: true });

// ==========================================
// STICKER EVENT BINDINGS
// ==========================================

// Toggle drawer on button click
document.getElementById('stickerToggleBtn')?.addEventListener('click', toggleStickerDrawer);

// Sticker search with debounce
const stickerSearchInput = document.getElementById('stickerSearchInput');
if (stickerSearchInput) {
    let searchTimer;
    stickerSearchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            fetchGiphyStickers(e.target.value);
        }, 400);
    });
}

// Remove sticker button
document.getElementById('removeStickerBtn')?.addEventListener('click', removeSticker);

// Close drawer when clicking outside
document.addEventListener('click', (e) => {
    const drawer = document.getElementById('stickerDrawer');
    const toggleBtn = document.getElementById('stickerToggleBtn');
    if (drawer && drawer.style.display !== 'none') {
        if (!drawer.contains(e.target) && !toggleBtn?.contains(e.target)) {
            drawer.style.display = 'none';
        }
    }
});
