/* ============================================================
   ML Zoo — Search, Filter & Sort Module
   ============================================================ */
(function () {
    'use strict';

    var allModels = [];
    var searchIndex = [];
    var activeTask = 'all';
    var activeSubcategory = 'all';
    var activeSort = 'name';
    var searchQuery = '';
    var debounceTimer = null;

    var COMPLEXITY_ORDER = { beginner: 1, intermediate: 2, advanced: 3 };

    /* ---------- Build search index ---------- */

    function buildSearchIndex(models) {
        allModels = models;
        searchIndex = models.map(function (m) {
            var parts = [
                m.name || '',
                m.short_description || '',
                (m.tags || []).join(' '),
                (m.use_cases || []).join(' '),
                m.sklearn_class || '',
                m.task || '',
                m.subcategory || '',
                m.id || ''
            ];
            return parts.join(' ').toLowerCase();
        });
    }

    /* ---------- Filter ---------- */

    function filterModels() {
        var terms = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);

        var result = allModels.filter(function (m, idx) {
            // Task filter
            if (activeTask !== 'all' && m.task !== activeTask) return false;

            // Subcategory filter
            if (activeSubcategory !== 'all' && m.subcategory !== activeSubcategory) return false;

            // Text search — all terms must match
            if (terms.length > 0) {
                var text = searchIndex[idx];
                for (var i = 0; i < terms.length; i++) {
                    if (text.indexOf(terms[i]) === -1) return false;
                }
            }

            return true;
        });

        // Sort
        result.sort(function (a, b) {
            switch (activeSort) {
                case 'name':
                    return (a.name || '').localeCompare(b.name || '');
                case 'year-asc':
                    return (a.year_introduced || 9999) - (b.year_introduced || 9999);
                case 'year-desc':
                    return (b.year_introduced || 0) - (a.year_introduced || 0);
                case 'complexity':
                    return (COMPLEXITY_ORDER[a.complexity] || 0) - (COMPLEXITY_ORDER[b.complexity] || 0);
                default:
                    return 0;
            }
        });

        return result;
    }

    /* ---------- Get subcategories for current task filter ---------- */

    function getSubcategories() {
        var seen = {};
        var cats = [];
        allModels.forEach(function (m) {
            if (activeTask !== 'all' && m.task !== activeTask) return;
            var key = (m.task === 'classification' ? 'cls' : 'reg') + '-' + m.subcategory;
            if (!seen[key]) {
                seen[key] = true;
                cats.push({
                    id: m.subcategory,
                    key: key,
                    label: MLZoo.gallery.SUBCAT_LABELS[m.subcategory] || m.subcategory,
                    color: MLZoo.gallery.SUBCAT_COLORS[key] || '#8b949e'
                });
            }
        });
        // Deduplicate by id for "all" task view
        if (activeTask === 'all') {
            var deduped = {};
            cats.forEach(function (c) {
                if (!deduped[c.id]) deduped[c.id] = c;
            });
            cats = Object.keys(deduped).map(function (k) { return deduped[k]; });
        }
        return cats;
    }

    /* ---------- Render filter pills ---------- */

    function renderFilterPills(containerSelector) {
        var container = document.querySelector(containerSelector);
        if (!container) return;

        var cats = getSubcategories();
        var html = '<span class="zoo-filters__label">Category:</span>' +
            '<button class="zoo-filter-pill' + (activeSubcategory === 'all' ? ' zoo-filter-pill--active' : '') +
            '" data-subcat="all">All</button>';

        cats.forEach(function (c) {
            var active = activeSubcategory === c.id;
            html += '<button class="zoo-filter-pill' + (active ? ' zoo-filter-pill--active' : '') +
                '" data-subcat="' + c.id + '"' +
                ' style="' + (active ? 'color:' + c.color + ';border-color:' + c.color : '') + '">' +
                c.label + '</button>';
        });

        container.innerHTML = html;

        // Bind clicks
        container.querySelectorAll('.zoo-filter-pill').forEach(function (btn) {
            btn.addEventListener('click', function () {
                activeSubcategory = btn.getAttribute('data-subcat');
                renderFilterPills(containerSelector);
                triggerUpdate();
            });
        });
    }

    /* ---------- Bind task pills ---------- */

    function bindTaskPills(containerSelector, onChange) {
        var container = document.querySelector(containerSelector);
        if (!container) return;

        container.querySelectorAll('.zoo-task-pill').forEach(function (btn) {
            btn.addEventListener('click', function () {
                activeTask = btn.getAttribute('data-task');
                activeSubcategory = 'all'; // reset subcategory on task change
                container.querySelectorAll('.zoo-task-pill').forEach(function (b) {
                    b.classList.remove('zoo-task-pill--active');
                });
                btn.classList.add('zoo-task-pill--active');
                if (onChange) onChange();
            });
        });
    }

    /* ---------- Bind search input ---------- */

    function bindSearchInput(inputSelector, onChange) {
        var input = document.querySelector(inputSelector);
        if (!input) return;

        input.addEventListener('input', function () {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function () {
                searchQuery = input.value;
                if (onChange) onChange();
            }, 200);
        });
    }

    /* ---------- Bind sort ---------- */

    function bindSort(selectSelector, onChange) {
        var sel = document.querySelector(selectSelector);
        if (!sel) return;

        sel.addEventListener('change', function () {
            activeSort = sel.value;
            if (onChange) onChange();
        });
    }

    /* ---------- Update callback ---------- */

    var _onUpdate = null;

    function triggerUpdate() {
        if (_onUpdate) _onUpdate();
    }

    /* ---------- Init ---------- */

    function init(models, onUpdate) {
        buildSearchIndex(models);
        _onUpdate = onUpdate;
    }

    /* ---------- Update count display ---------- */

    function updateCount(countSelector, filtered, total) {
        var el = document.querySelector(countSelector);
        if (el) {
            el.textContent = filtered + ' of ' + total + ' models';
        }
    }

    /* ---------- Public API ---------- */

    window.MLZoo = window.MLZoo || {};
    window.MLZoo.search = {
        init: init,
        filterModels: filterModels,
        renderFilterPills: renderFilterPills,
        bindTaskPills: bindTaskPills,
        bindSearchInput: bindSearchInput,
        bindSort: bindSort,
        updateCount: updateCount,
        getActiveTask: function () { return activeTask; },
        getActiveSubcategory: function () { return activeSubcategory; }
    };
})();
