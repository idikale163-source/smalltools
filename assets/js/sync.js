function toggleCloudConfigCollapse() {
            cloudConfigCollapsed = !cloudConfigCollapsed;
            const body = document.getElementById('cloudConfigBody');
            const chevron = document.getElementById('cloudConfigChevron');
            if (cloudConfigCollapsed) { body.classList.add('hidden'); chevron.classList.remove('rotate-180'); }
            else { body.classList.remove('hidden'); chevron.classList.add('rotate-180'); }
        }

        const SQL_CODE = `CREATE TABLE IF NOT EXISTS tavern_assets (id TEXT PRIMARY KEY, category TEXT, name TEXT, file_type TEXT, card_data JSONB, raw_text TEXT, raw_buffer_base64 TEXT, created_at BIGINT); ALTER TABLE tavern_assets ENABLE ROW LEVEL SECURITY; CREATE POLICY "Public Access" ON tavern_assets FOR ALL USING (true) WITH CHECK (true);`;

        function copySqlCode() { navigator.clipboard.writeText(SQL_CODE); showToast('📋', '建表 SQL 已复制到剪贴板！'); }

        var db = null;
        window.db = db;
        var currentTab = 'cards';
        window.currentTab = currentTab;
        var currentItem = null;
        window.currentItem = currentItem;
        var personalityCollapsed = true;
        window.personalityCollapsed = personalityCollapsed;

        function toggleSidebar(forceOpen) {
            const drawer = document.getElementById('sidebarDrawer') || document.getElementById('sidebar');
            const overlay = document.getElementById('drawerOverlay');
            if (!drawer) return;

            let shouldOpen;
            if (typeof forceOpen === 'boolean') {
                shouldOpen = forceOpen;
            } else {
                const isOpen = drawer.getAttribute('data-open') === '1' || drawer.classList.contains('active') || (!drawer.classList.contains('-translate-x-full') && drawer.style.transform === 'translateX(0%)');
                shouldOpen = !isOpen;
            }

            if (shouldOpen) {
                drawer.setAttribute('data-open', '1');
                drawer.classList.remove('-translate-x-full');
                drawer.classList.add('active', 'translate-x-0');
                drawer.style.transform = 'translateX(0%)';
                if (overlay) {
                    overlay.classList.remove('opacity-0', 'pointer-events-none', 'hidden');
                    overlay.classList.add('active', 'opacity-100', 'pointer-events-auto');
                    overlay.style.display = 'block';
                    overlay.style.pointerEvents = 'auto';
                    overlay.style.opacity = '1';
                }
            } else {
                drawer.setAttribute('data-open', '0');
                drawer.classList.add('-translate-x-full');
                drawer.classList.remove('active', 'translate-x-0');
                drawer.style.transform = 'translateX(-100%)';
                if (overlay) {
                    overlay.classList.add('opacity-0', 'pointer-events-none');
                    overlay.classList.remove('active', 'opacity-100', 'pointer-events-auto');
                    overlay.style.display = 'none';
                    overlay.style.pointerEvents = 'none';
                    overlay.style.opacity = '0';
                }
            }
        }
        window.toggleSidebar = toggleSidebar;

        const request = indexedDB.open('TavernCardHubDB', 1);
        request.onupgradeneeded = (e) => {
            db = e.target.result;
            if (!db.objectStoreNames.contains('assets')) {
                const store = db.createObjectStore('assets', { keyPath: 'id' });
                store.createIndex('category', 'category', { unique: false });
            }
        };
        request.onsuccess = (e) => {
            db = e.target.result;
            let retryCount = 0;
            const boot = () => {
                if (typeof updateBadges !== 'function' || typeof renderItems !== 'function') {
                    if (retryCount++ < 120) {
                        setTimeout(boot, 30);
                    }
                    return;
                }
                window._appBooted = true;
                if (typeof initSupabaseClient === 'function') initSupabaseClient();
                if (typeof initGithubClient === 'function') initGithubClient();
                if (typeof updateBadges === 'function') updateBadges();
                if (typeof renderItems === 'function') renderItems();
                if (typeof autoSyncFromCloudSilent === 'function') autoSyncFromCloudSilent();
                if (typeof renderEmojiFormatBuilder === 'function') renderEmojiFormatBuilder();
                if (typeof setupGlobalPasteListener === 'function') setupGlobalPasteListener();
            };
            boot();
        };