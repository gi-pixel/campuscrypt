// ==========================================
// 1. CONFIGURATION & IDENTITY INITIALIZATION
// ==========================================

// Replace these values with your actual credentials from your Supabase Project Settings
const SUPABASE_URL = 'https://xtqfbaqckgodxmsnyexh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0cWZiYXFja2dvZHhtc255ZXhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyOTgwODIsImV4cCI6MjA5Njg3NDA4Mn0.cWsx_9gyk3m9Dz6ZMn_8qHQ0s_20qiNvJTUn8Q0p3uM';

// Automatically resolve or generate a unique tracking session ID for this browser
let currentSessionId = localStorage.getItem('crypt_session');
if (!currentSessionId) {
    currentSessionId = `SESSION_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    localStorage.setItem('crypt_session', currentSessionId);
}

// Display the local identifier strings onto the HTML UI nodes
document.getElementById('local-session-badge').textContent = currentSessionId.substring(0, 15) + '...';
document.getElementById('mobile-session-badge').textContent = currentSessionId.substring(0, 10) + '...';

// FIXED: Variable renamed to 'supabaseClient' to prevent global CDN conflicts
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
        headers: {
            'x-session-id': currentSessionId,
        },
    },
});

// ==========================================
// 2. GLOBAL STATE APPARATUS
// ==========================================
let globalCurrentFeedTab = 'latest';     
let globalCurrentCategory = 'all';       
let globalActiveFocusedPostId = null;   

// Run the core engine bootstrap sequence when the browser compiles the page layout
window.addEventListener('DOMContentLoaded', () => {
    fetchAndRenderFeed();
    initializeRealTimePipeline();
});

// ==========================================
// 3. DATA READ OPERATIONS (FETCH & RENDER)
// ==========================================

async function fetchAndRenderFeed() {
    const feedContainer = document.getElementById('feed-container');
    
    // 1. Fetch the primary posts list
    let query = supabaseClient.from('posts').select('*');

    if (globalCurrentCategory !== 'all') {
        query = query.eq('category', globalCurrentCategory);
    }

    // Default sort by timeline creation order
    query = query.order('created_at', { ascending: false });

    const { data: posts, error } = await query.limit(20);

    if (error) {
        console.error('Database connection error:', error.message);
        feedContainer.innerHTML = `<div class="p-4 text-rose-500 font-medium text-center bg-rose-50 rounded-xl">Failed to synchronize campus data. Verify Supabase keys.</div>`;
        return;
    }

    if (!posts || posts.length === 0) {
        feedContainer.innerHTML = `
            <div class="p-8 text-center text-slate-400">
                <p class="text-3xl mb-2">🤷‍♂️</p>
                <p class="font-medium">No posts here yet. Be the first to drop one!</p>
            </div>`;
        return;
    }

    feedContainer.innerHTML = '';

    // 2. Loop through each post and dynamically fetch exact like/reply counts
    for (const post of posts) {
        
        // Fetch real count from 'likes' table
        const { count: realLikes, error: likeErr } = await supabaseClient
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

        // Fetch real count from 'replies' table
        const { count: realReplies, error: replyErr } = await supabaseClient
            .from('replies')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

        // Check if this specific device liked the post to color the heart red
        const { data: userLiked } = await supabaseClient
            .from('likes')
            .select('id')
            .eq('post_id', post.id)
            .eq('session_id', currentSessionId)
            .maybeSingle();

        // Assign the accurate database counts to our post object
        post.likes_count = realLikes || 0;
        post.reply_count = realReplies || 0;
        post.has_user_liked = !!userLiked;

        // Build and append the node to the feed
        feedContainer.appendChild(compilePostHtmlNode(post));
    }
}

function compilePostHtmlNode(post) {
    const postCard = document.createElement('article');
    postCard.className = `p-4 hover:bg-slate-50/70 transition cursor-pointer flex space-x-3 border-b border-slate-100/60 post-entry-node`;
    postCard.id = `ui-post-${post.id}`;
    
    const isAuthor = post.session_id === currentSessionId;
    const minutesSinceCreation = (new Date() - new Date(post.created_at)) / 1000 / 60;
    const canDelete = isAuthor && minutesSinceCreation < 5;

    const formattedTime = formatTimestampRelative(post.created_at);
    
    // Apply red color style instantly if database confirms user already liked it
    const heartClass = post.has_user_liked ? 'text-rose-600' : '';

    postCard.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-lg flex-shrink-0" onclick="event.stopPropagation(); openThreadModal('${post.id}')">👤</div>
        <div class="flex-1 min-w-0" onclick="openThreadModal('${post.id}')">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-1.5">
                    <span class="font-bold text-slate-800 text-sm">Anonymous</span>
                    <span class="text-slate-300 text-xs">•</span>
                    <span class="text-xs text-slate-400 font-medium">${formattedTime}</span>
                    <span class="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider scale-90">${post.category}</span>
                </div>
                ${canDelete ? `<button class="text-slate-300 hover:text-rose-500 text-xs font-semibold px-2 py-1 transition" onclick="event.stopPropagation(); executePostDeletion('${post.id}')">Delete</button>` : ''}
            </div>
            <p class="text-slate-700 text-[15px] leading-normal whitespace-pre-wrap mt-1 break-words">${escapeHtmlMarkup(post.content)}</p>
            
            <div class="flex items-center space-x-6 mt-3 text-slate-400 text-xs font-medium">
                <button class="flex items-center space-x-1.5 hover:text-indigo-600 group transition" onclick="event.stopPropagation(); openThreadModal('${post.id}')">
                    <span class="text-base group-hover:scale-110 transition">💬</span>
                    <span>${post.reply_count}</span>
                </button>
                <button class="flex items-center space-x-1.5 hover:text-rose-600 group transition ${heartClass}" onclick="event.stopPropagation(); togglePostLikeState('${post.id}', this)">
                    <span class="text-base group-hover:scale-110 transition">❤️</span>
                    <span class="like-counter-val">${post.likes_count}</span>
                </button>
            </div>
        </div>
    `;
    return postCard;
}



// ==========================================
// 1. UPDATE POST SUBMISSION (TARGETED INJECTION)
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

    // Insert to database
    const { data: newRowData, error } = await supabaseClient
        .from('posts')
        .insert([{ content, category, session_id: currentSessionId }])
        .select() // Tells Supabase to immediately return the created row with its new ID
        .single();

    submitBtn.disabled = false;
    submitBtn.textContent = 'Post Anon';

    if (error) {
        alert('Could not submit anonymous post: ' + error.message);
        return;
    }

    // Clear the input box instantly
    textarea.value = '';
    const charCounter = document.getElementById('char-counter');
    if (charCounter) charCounter.textContent = '0 / 280';
    
    // TARGETED INJECTION: Build ONLY this one post and slide it to the top.
    // No full feed reload, no flashing.
    const container = document.getElementById('feed-container');
    if (container.querySelector('div.text-center')) container.innerHTML = '';

    // Assign default starting metrics for your local view
    newRowData.likes_count = 0;
    newRowData.reply_count = 0;
    newRowData.has_user_liked = false;

    const modernNode = compilePostHtmlNode(newRowData);
    modernNode.classList.add('bg-indigo-50/40'); // Soft confirmation flash
    container.insertBefore(modernNode, container.firstChild);

    setTimeout(() => modernNode.classList.remove('bg-indigo-50/40'), 1500);
}

async function executePostDeletion(postId) {
    if (!confirm('Are you absolutely sure you want to permanently delete your post?')) return;

    const { error } = await supabaseClient
        .from('posts')
        .delete()
        .eq('id', postId);

    if (error) {
        alert('Deletion rejected. Your 5-minute ownership window may have expired.');
        return;
    }

    const element = document.getElementById(`ui-post-${postId}`);
    if (element) element.remove();
    
    if (globalActiveFocusedPostId === postId) closeThreadModal();
}

async function togglePostLikeState(postId, buttonNode) {
    const countSpan = buttonNode.querySelector('.like-counter-val');
    let currentCount = parseInt(countSpan.textContent);

    // 1. Check if this device session has already liked this post
    const { data: existingLike, error: checkError } = await supabaseClient
        .from('likes')
        .select('id')
        .eq('post_id', postId)
        .eq('session_id', currentSessionId)
        .maybeSingle();

    if (checkError) {
        console.error("Error checking like state:", checkError.message);
        return;
    }

    if (existingLike) {
        // 2. UNLIKE OPERATION: Row exists, so delete it
        // Optimistically drop UI feedback instantly
        countSpan.textContent = Math.max(0, currentCount - 1);
        buttonNode.classList.remove('text-rose-600');

        const { error: deleteError } = await supabaseClient
            .from('likes')
            .delete()
            .match({ post_id: postId, session_id: currentSessionId });

        if (deleteError) {
            // Revert back if database fails network request
            countSpan.textContent = currentCount;
            buttonNode.classList.add('text-rose-600');
            console.error("Unlike transaction failed:", deleteError.message);
        }
    } else {
        // 3. LIKE OPERATION: No row exists, insert a brand new one
        // Optimistically increment UI feedback instantly
        countSpan.textContent = currentCount + 1;
        buttonNode.classList.add('text-rose-600');

        const { error: insertError } = await supabaseClient
            .from('likes')
            .insert([{ post_id: postId, session_id: currentSessionId }]);

        if (insertError) {
            // Revert back if database validation fails
            countSpan.textContent = currentCount;
            buttonNode.classList.remove('text-rose-600');
            console.error("Like transaction failed:", insertError.message);
        }
    }
}

// ==========================================
// 5. THREAD DISCUSSION SYSTEM (COMMENTS)
// ==========================================

async function openThreadModal(postId) {
    globalActiveFocusedPostId = postId;
    const modal = document.getElementById('thread-modal');
    const focusBox = document.getElementById('modal-focus-post');
    
    modal.classList.remove('hidden');
    focusBox.innerHTML = `<div class="p-4 text-center text-slate-400 animate-pulse text-sm">Syncing conversation stream...</div>`;

    const { data: post, error } = await supabaseClient.from('posts').select('*').eq('id', postId).single();
    if (error || !post) {
        closeThreadModal();
        return;
    }

    focusBox.innerHTML = `
        <div class="flex items-center space-x-1.5 text-xs text-slate-400 font-medium mb-1.5">
            <span class="font-bold text-slate-700">Anonymous Original Poster</span>
            <span>•</span>
            <span>${formatTimestampRelative(post.created_at)}</span>
        </div>
        <p class="text-slate-800 text-base leading-normal whitespace-pre-wrap break-words">${escapeHtmlMarkup(post.content)}</p>
        <div class="mt-2 text-xs font-bold text-indigo-500 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded w-fit">${post.category}</div>
    `;

    fetchAndRenderComments(postId);
}

async function fetchAndRenderComments(postId) {
    const commentsContainer = document.getElementById('modal-comments-container');
    commentsContainer.innerHTML = '';

    const { data: replies, error } = await supabaseClient
        .from('replies')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

    if (error) return;

    if (!replies || replies.length === 0) {
        commentsContainer.innerHTML = `<div class="p-6 text-center text-sm text-slate-400">Nobody has commented yet. Speak your mind anonymously below!</div>`;
        return;
    }

    replies.forEach(reply => {
        const replyDiv = document.createElement('div');
        replyDiv.className = "py-3 flex space-x-3 text-sm border-b border-slate-50";
        replyDiv.innerHTML = `
            <div class="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs flex-shrink-0">👤</div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center space-x-1 text-xs text-slate-400">
                    <span class="font-bold text-slate-700">Anonymous</span>
                    <span>•</span>
                    <span>${formatTimestampRelative(reply.created_at)}</span>
                </div>
                <p class="text-slate-700 leading-normal mt-0.5 break-words whitespace-pre-wrap">${escapeHtmlMarkup(reply.content)}</p>
            </div>
        `;
        commentsContainer.appendChild(replyDiv);
    });
}

async function handleReplySubmit() {
    const textarea = document.getElementById('reply-textarea');
    const submitBtn = document.getElementById('submit-reply-btn');
    const content = textarea.value.trim();

    if (!content || !globalActiveFocusedPostId || content.length > 280) return;

    submitBtn.disabled = true;

    const { error } = await supabaseClient
        .from('replies')
        .insert([{ post_id: globalActiveFocusedPostId, content, session_id: currentSessionId }]);

    submitBtn.disabled = false;

    if (error) {
        alert('Could not submit reply: ' + error.message);
        return;
    }

    textarea.value = '';
    
    // A. Re-render ONLY the small comments list inside the modal popup window
    await fetchAndRenderComments(globalActiveFocusedPostId);
    
    // B. TARGETED INJECTION: Find the specific background post card and update its counter number
    const backgroundPostCard = document.getElementById(`ui-post-${globalActiveFocusedPostId}`);
    if (backgroundPostCard) {
        // Find the comment counter slot inside that specific post element block
        const commentIcons = backgroundPostCard.querySelectorAll('button');
        // The comment button is the first button inside our template layout
        if (commentIcons && commentIcons[0]) {
            const counterSpan = commentIcons[0].querySelector('span:not(.text-base)');
            if (counterSpan) {
                let existingCount = parseInt(counterSpan.textContent) || 0;
                counterSpan.textContent = existingCount + 1; // Bump it up by 1 instantly
            }
        }
    }
}

function closeThreadModal() {
    document.getElementById('thread-modal').classList.add('hidden');
    globalActiveFocusedPostId = null;
}

// ==========================================
// 6. FILTER & NAVIGATION ARCHITECTURE
// ==========================================

function switchFeedTab(tabName) {
    globalCurrentFeedTab = tabName;
    document.getElementById('tab-latest').className = `flex-1 py-4 text-center text-slate-500 hover:bg-slate-50 transition font-medium ${tabName === 'latest' ? 'feed-tab-active' : ''}`;
    document.getElementById('tab-trending').className = `flex-1 py-4 text-center text-slate-500 hover:bg-slate-50 transition font-medium ${tabName === 'trending' ? 'feed-tab-active' : ''}`;
    fetchAndRenderFeed();
}

function filterByCategory(categoryName, elementNode) {
    globalCurrentCategory = categoryName;
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.className = "bg-white hover:bg-slate-100 text-slate-600 text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-200 whitespace-nowrap filter-btn";
    });
    elementNode.className = "bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap filter-btn";
    
    fetchAndRenderFeed();
}

// ==========================================
// REPLACE SECTION 7 IN YOUR APP.JS
// ==========================================
function initializeRealTimePipeline() {
    supabaseClient
        .channel('public-feed-stream')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, async (payload) => {
            
            // A. If a brand new post is inserted into the database
            if (payload.eventType === 'INSERT') {
                // Only inject it if the user is looking at 'All Feed' or matching category
                if (globalCurrentCategory === 'all' || globalCurrentCategory === payload.new.category) {
                    if (globalCurrentFeedTab === 'latest') {
                        const container = document.getElementById('feed-container');
                        
                        // Clear out the "No posts here yet" message if it's there
                        if (container.querySelector('div.text-center')) container.innerHTML = '';
                        
                        // Set up fresh default metrics for the new post object
                        const newPost = payload.new;
                        newPost.likes_count = 0;
                        newPost.reply_count = 0;
                        newPost.has_user_liked = false;
                        
                        // Compile the HTML block for the incoming post
                        const newPostNode = compilePostHtmlNode(newPost);
                        
                        // Add a beautiful soft blue flash animation so the user notices the live arrival
                        newPostNode.classList.add('bg-indigo-50/80', 'scale-[0.99]');
                        container.insertBefore(newPostNode, container.firstChild);
                        
                        // Smoothly fade the background highlight out after 1.5 seconds
                        setTimeout(() => {
                            newPostNode.classList.remove('bg-indigo-50/80', 'scale-[0.99]');
                        }, 1500);
                    } else {
                        // If they are on the trending tab, just silently rebuild the feed order
                        fetchAndRenderFeed();
                    }
                }
            } 
            
            // B. If a post gets deleted externally, instantly vanish it from the screen
            else if (payload.eventType === 'DELETE') {
                const element = document.getElementById(`ui-post-${payload.old.id}`);
                if (element) {
                    element.style.opacity = '0';
                    setTimeout(() => element.remove(), 300);
                }
            } 
            
            // C. For any other generic changes, run a safe background update sync
            else {
                fetchAndRenderFeed();
            }
        })
        .subscribe();
}

// ==========================================
// 8. SECURITY & UTILITY HELPER MATRIX
// ==========================================

function escapeHtmlMarkup(stringInput) {
    const div = document.createElement('div');
    div.textContent = stringInput;
    return div.innerHTML;
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
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}