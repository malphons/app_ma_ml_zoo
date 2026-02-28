/* ============================================================
   ML Zoo — App Entry Point
   Theme toggle, view toggle, initialization.
   ============================================================ */
(function () {
    'use strict';

    var THEME_KEY = 'mlzoo_theme';
    var VIEW_KEY  = 'mlzoo_view';
    var viewMode  = 'grid'; // 'grid' or 'grouped'

    /* ---------- Theme ---------- */

    function initTheme() {
        var saved = localStorage.getItem(THEME_KEY);
        if (saved) {
            document.documentElement.setAttribute('data-theme', saved);
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            document.documentElement.setAttribute('data-theme', 'light');
        }

        var btn = document.querySelector('.zoo-theme-toggle');
        if (btn) {
            btn.addEventListener('click', function () {
                var current = document.documentElement.getAttribute('data-theme');
                var next = current === 'light' ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', next);
                localStorage.setItem(THEME_KEY, next);
                updateThemeIcon(next);
            });
            updateThemeIcon(document.documentElement.getAttribute('data-theme') || 'dark');
        }
    }

    function updateThemeIcon(theme) {
        var btn = document.querySelector('.zoo-theme-toggle');
        if (!btn) return;
        btn.innerHTML = theme === 'light'
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
    }

    /* ---------- View toggle ---------- */

    function initViewToggle() {
        var saved = localStorage.getItem(VIEW_KEY);
        if (saved) viewMode = saved;

        document.querySelectorAll('.zoo-view-toggle').forEach(function (btn) {
            var mode = btn.getAttribute('data-view');
            if (mode === viewMode) btn.classList.add('zoo-view-toggle--active');

            btn.addEventListener('click', function () {
                viewMode = mode;
                localStorage.setItem(VIEW_KEY, viewMode);
                document.querySelectorAll('.zoo-view-toggle').forEach(function (b) {
                    b.classList.remove('zoo-view-toggle--active');
                });
                btn.classList.add('zoo-view-toggle--active');
                refreshGallery();
            });
        });
    }

    /* ---------- Refresh gallery ---------- */

    function refreshGallery() {
        var filtered = MLZoo.search.filterModels();
        MLZoo.search.updateCount('.zoo-search__count', filtered.length, allModels.length);
        MLZoo.search.renderFilterPills('.zoo-filters');

        if (viewMode === 'grouped') {
            MLZoo.gallery.renderGroupedCards(filtered);
        } else {
            MLZoo.gallery.renderCards(filtered);
        }
    }

    /* ---------- Main init ---------- */

    var allModels = [];

    function boot() {
        initTheme();

        MLZoo.gallery.init('.zoo-grid');
        MLZoo.gallery.renderSkeletons(12);

        MLZoo.registry.loadRegistry().then(function (models) {
            allModels = models;

            MLZoo.search.init(models, refreshGallery);
            MLZoo.search.bindTaskPills('.zoo-task-filters', function () {
                MLZoo.search.renderFilterPills('.zoo-filters');
                refreshGallery();
            });
            MLZoo.search.bindSearchInput('.zoo-search__input', refreshGallery);
            MLZoo.search.bindSort('.zoo-search__sort', refreshGallery);

            initViewToggle();
            refreshGallery();

            // Try loading live thumbnails
            MLZoo.gallery.loadThumbnails(models);
        });
    }

    // Boot on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
