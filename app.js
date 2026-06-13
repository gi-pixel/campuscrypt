        // ========== SUPABASE CONFIG ==========
        const SUPABASE_URL = 'https://xtqfbaqckgodxmsnyexh.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0cWZiYXFja2dvZHhtc255ZXhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyOTgwODIsImV4cCI6MjA5Njg3NDA4Mn0.cWsx_9gyk3m9Dz6ZMn_8qHQ0s_20qiNvJTUn8Q0p3uM';
        
        let currentSessionId = localStorage.getItem('crypt_session');
        if (!currentSessionId) {
            currentSessionId = `SESSION_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
            localStorage.setItem('crypt_session', currentSessionId);
        }
        document.getElementById('session-badge').innerHTML = `Session: ${currentSessionId.substring(0, 12)}...`;
        
        const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: { headers: { 'x-session-id': currentSessionId } }
        });
        
        // ========== GLOBAL STATE ==========
        let globalCurrentCategory = 'all';
        let globalActiveFocusedPostId = null;
        
        // ========== UTILITIES ==========
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        function formatTime(dateString) {
            const diff = (new Date() - new Date(dateString)) / 1000;
            if (diff < 60) return 'Just now';
            if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
            if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
            return `${Math.floor(diff / 86400)}d ago`;
        }
        
        // ========== RENDER TWEET ==========
        async function renderTweet(post) {
            const { count: likesCount } = await supabaseClient.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', post.id);
            const { count: repliesCount } = await supabaseClient.from('replies').select('*', { count: 'exact', head: true }).eq('post_id', post.id);
            const { data: userLiked } = await supabaseClient.from('likes').select('id').eq('post_id', post.id).eq('session_id', currentSessionId).maybeSingle();
            
            const isAuthor = post.session_id === currentSessionId;
            const canDelete = isAuthor && (new Date() - new Date(post.created_at)) / 1000 / 60 < 5;
            
            const div = document.createElement('div');
            div.className = 'p-4 hover:bg-[#080808] transition cursor-pointer flex gap-3 border-b border-[#222]';
            div.id = `post-${post.id}`;
            div.onclick = (e) => { if(!e.target.closest('button')) openThreadModal(post.id); };
            
            div.innerHTML = `
                <div class="w-12 h-12 rounded-full bg-[#1d9bf0] flex items-center justify-center text-xl flex-shrink-0"><i class="far fa-user"></i></div>
                <div class="flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-bold">Anonymous</span>
                        <span class="text-[#71767b] text-sm">@crypt</span>
                        <span class="text-[#71767b] text-sm">· ${formatTime(post.created_at)}</span>
                        <span class="bg-[#1d9bf0]/10 text-[#1d9bf0] text-[10px] font-bold px-2 py-0.5 rounded-full">${post.category}</span>
                        ${canDelete ? `<button class="text-[#71767b] text-xs hover:text-[#f91880] ml-auto" onclick="event.stopPropagation(); deletePost('${post.id}')">Delete</button>` : ''}
                    </div>
                    <p class="text-lg leading-relaxed mt-1 break-words">${escapeHtml(post.content)}</p>
                    <div class="flex gap-10 mt-3 text-[#71767b] text-sm">
                        <button class="flex items-center gap-2 hover:text-[#1d9bf0] comment-hover" onclick="event.stopPropagation(); openThreadModal('${post.id}')">
                            <div class="w-8 h-8 rounded-full flex items-center justify-center"><i class="far fa-comment"></i></div>
                            <span class="reply-count">${repliesCount || 0}</span>
                        </button>
                        <button class="flex items-center gap-2 hover:text-[#f91880] like-hover ${userLiked ? 'liked' : ''}" onclick="event.stopPropagation(); toggleLike('${post.id}', this)">
                            <div class="w-8 h-8 rounded-full flex items-center justify-center"><i class="far fa-heart"></i></div>
                            <span class="like-count">${likesCount || 0}</span>
                        </button>
                    </div>
                </div>
            `;
            return div;
        }
        
        // ========== FETCH FEED ==========
        async function fetchAndRenderFeed() {
            const container = document.getElementById('feed-container');
            container.innerHTML = '<div class="p-4 text-center text-[#71767b]">Loading feed...</div>';
            
            let query = supabaseClient.from('posts').select('*');
            if (globalCurrentCategory !== 'all') query = query.eq('category', globalCurrentCategory);
            const { data: posts, error } = await query.order('created_at', { ascending: false }).limit(30);
            
            if (error || !posts?.length) {
                container.innerHTML = '<div class="p-8 text-center text-[#71767b]">✨ No posts yet. Be the first!</div>';
                return;
            }
            
            container.innerHTML = '';
            for (const post of posts) {
                container.appendChild(await renderTweet(post));
            }
        }
        
        // ========== POST SUBMIT ==========
        async function handlePostSubmit() {
            const textarea = document.getElementById('post-textarea');
            const content = textarea.value.trim();
            const category = document.getElementById('category-select').value;
            const btn = document.getElementById('submit-post-btn');
            
            if (!content || content.length > 280) return;
            btn.disabled = true;
            btn.textContent = '...';
            
            const { error } = await supabaseClient.from('posts').insert([{ content, category, session_id: currentSessionId }]);
            btn.disabled = false;
            btn.textContent = 'Post';
            
            if (error) alert('Error: ' + error.message);
            else {
                textarea.value = '';
                document.getElementById('char-counter').textContent = '0/280';
                fetchAndRenderFeed();
            }
        }
        
        // ========== DELETE POST ==========
        async function deletePost(postId) {
            if (!confirm('Delete permanently?')) return;
            await supabaseClient.from('posts').delete().eq('id', postId);
            document.getElementById(`post-${postId}`)?.remove();
        }
        
        // ========== LIKE TOGGLE ==========
        async function toggleLike(postId, btn) {
            const countSpan = btn.querySelector('.like-count');
            let count = parseInt(countSpan.textContent);
            const isLiked = btn.classList.contains('liked');
            
            if (isLiked) {
                countSpan.textContent = count - 1;
                btn.classList.remove('liked');
                await supabaseClient.from('likes').delete().match({ post_id: postId, session_id: currentSessionId });
            } else {
                countSpan.textContent = count + 1;
                btn.classList.add('liked');
                await supabaseClient.from('likes').insert([{ post_id: postId, session_id: currentSessionId }]);
            }
        }
        
        // ========== THREAD MODAL ==========
        async function openThreadModal(postId) {
            globalActiveFocusedPostId = postId;
            const modal = document.getElementById('thread-modal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            
            const { data: post } = await supabaseClient.from('posts').select('*').eq('id', postId).single();
            if (post) {
                document.getElementById('modal-focus-post').innerHTML = `
                    <div class="flex items-center gap-2 mb-2">
                        <span class="font-bold">Anonymous</span>
                        <span class="text-[#71767b] text-sm">${formatTime(post.created_at)}</span>
                        <span class="bg-[#1d9bf0]/10 text-[#1d9bf0] text-[10px] font-bold px-2 py-0.5 rounded-full">${post.category}</span>
                    </div>
                    <p class="text-base">${escapeHtml(post.content)}</p>
                `;
            }
            await loadComments(postId);
        }
        
        async function loadComments(postId) {
            const { data: replies } = await supabaseClient.from('replies').select('*').eq('post_id', postId).order('created_at', { ascending: true });
            const container = document.getElementById('modal-comments-container');
            
            if (!replies?.length) {
                container.innerHTML = '<div class="text-center text-[#71767b] py-8">💬 No comments yet</div>';
                return;
            }
            
            container.innerHTML = replies.map(reply => `
                <div class="pt-3 border-t border-[#222]">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="font-bold text-sm">Anonymous</span>
                        <span class="text-[#71767b] text-xs">${formatTime(reply.created_at)}</span>
                    </div>
                    <p class="text-sm">${escapeHtml(reply.content)}</p>
                </div>
            `).join('');
        }
        
        async function handleReplySubmit() {
            const textarea = document.getElementById('reply-textarea');
            const content = textarea.value.trim();
            if (!content || !globalActiveFocusedPostId) return;
            
            const btn = event.target;
            btn.disabled = true;
            
            const { error } = await supabaseClient.from('replies').insert([{ post_id: globalActiveFocusedPostId, content, session_id: currentSessionId }]);
            btn.disabled = false;
            
            if (error) alert('Reply failed');
            else {
                textarea.value = '';
                await loadComments(globalActiveFocusedPostId);
                const postCard = document.getElementById(`post-${globalActiveFocusedPostId}`);
                const replySpan = postCard?.querySelector('.reply-count');
                if (replySpan) replySpan.textContent = parseInt(replySpan.textContent) + 1;
            }
        }
        
        function closeThreadModal() {
            document.getElementById('thread-modal').classList.add('hidden');
            document.getElementById('thread-modal').classList.remove('flex');
            globalActiveFocusedPostId = null;
        }
        
        // ========== FILTERS ==========
        function switchFeedTab(tabName, btn) {
            document.querySelectorAll('.top-bar button').forEach(b => b.classList.remove('active-tab'));
            btn.classList.add('active-tab');
            fetchAndRenderFeed();
        }
        
        function filterByCategory(category, btn) {
            globalCurrentCategory = category;
            document.querySelectorAll('.filter-btn').forEach(b => {
                b.classList.remove('active-filter');
                b.classList.add('bg-transparent', 'border', 'border-[#333]', 'text-[#71767b]');
            });
            btn.classList.add('active-filter');
            btn.classList.remove('bg-transparent', 'border-[#333]', 'text-[#71767b]');
            fetchAndRenderFeed();
        }
        
        // ========== CHAR COUNTER ==========
        document.getElementById('post-textarea')?.addEventListener('input', function() {
            const len = this.value.length;
            document.getElementById('char-counter').textContent = `${len}/280`;
            document.getElementById('char-counter').classList.toggle('text-[#f91880]', len >= 260);
        });
        
        // ========== REAL-TIME ==========
        supabaseClient.channel('public-feed')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => fetchAndRenderFeed())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'replies' }, () => {
                if (globalActiveFocusedPostId) loadComments(globalActiveFocusedPostId);
            })
            .subscribe();
        
        // ========== INIT ==========
        window.addEventListener('DOMContentLoaded', fetchAndRenderFeed);
