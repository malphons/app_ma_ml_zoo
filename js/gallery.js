/* ============================================================
   ML Zoo — Gallery Module
   Renders card grid from model data, thumbnails, skeletons.
   ============================================================ */
(function () {
    'use strict';

    var gridEl = null;
    var allModels = [];

    /* ---------- Subcategory colours ---------- */

    var SUBCAT_COLORS = {
        'reg-linear':   '#58a6ff',
        'reg-glm':      '#3fb950',
        'reg-tree':     '#f0883e',
        'reg-kernel':   '#bc8cff',
        'reg-instance': '#f778ba',
        'reg-bayes':    '#d29922',
        'reg-robust':   '#8b949e',
        'cls-linear':   '#79c0ff',
        'cls-tree':     '#56d364',
        'cls-kernel':   '#d2a8ff',
        'cls-instance': '#ff7eb6',
        'cls-prob':     '#e3b341',
        'cls-ensemble': '#a5d6ff'
    };

    var SUBCAT_LABELS = {
        'linear':   'Linear',
        'glm':      'GLM',
        'tree':     'Tree-Based',
        'kernel':   'Kernel',
        'instance': 'Instance',
        'bayes':    'Bayesian',
        'robust':   'Robust',
        'prob':     'Probabilistic',
        'ensemble': 'Ensemble'
    };

    function getColor(model) {
        var key = (model.task === 'classification' ? 'cls' : 'reg') + '-' + model.subcategory;
        return SUBCAT_COLORS[key] || '#8b949e';
    }

    /* ---------- Complexity helpers ---------- */

    var COMPLEXITY_MAP = { beginner: 1, intermediate: 2, advanced: 3 };

    function complexityDots(level) {
        var n = COMPLEXITY_MAP[level] || 1;
        var html = '';
        for (var i = 0; i < 3; i++) {
            html += '<span class="zoo-card__complexity-dot' +
                (i < n ? ' zoo-card__complexity-dot--filled' : '') + '"></span>';
        }
        return html;
    }

    /* ---------- Fallback thumbnail generators ---------- */

    function svgWrap(inner, color) {
        return '<svg viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">' +
            '<rect width="400" height="250" fill="none"/>' + inner + '</svg>';
    }

    function scatterDots(color, count, seed) {
        var dots = '';
        for (var i = 0; i < count; i++) {
            var x = 40 + ((seed * (i + 1) * 137) % 320);
            var y = 30 + ((seed * (i + 1) * 97) % 180);
            var r = 4 + (i % 3);
            dots += '<circle class="ml-node" cx="' + x + '" cy="' + y + '" r="' + r +
                '" fill="' + color + '" opacity="0.6"/>';
        }
        return dots;
    }

    function generateScatterLineThumbnail(color) {
        var dots = scatterDots(color, 12, 42);
        var line = '<line class="ml-edge" x1="40" y1="200" x2="370" y2="50" stroke="' +
            color + '" stroke-width="2.5" opacity="0.8"/>';
        return svgWrap(dots + line, color);
    }

    function generateTreeThumbnail(color) {
        var nodes = '<circle class="ml-node" cx="200" cy="40" r="8" fill="' + color + '" opacity="0.8"/>' +
            '<circle class="ml-node" cx="120" cy="110" r="7" fill="' + color + '" opacity="0.7"/>' +
            '<circle class="ml-node" cx="280" cy="110" r="7" fill="' + color + '" opacity="0.7"/>' +
            '<circle class="ml-node" cx="70" cy="180" r="6" fill="' + color + '" opacity="0.6"/>' +
            '<circle class="ml-node" cx="160" cy="180" r="6" fill="' + color + '" opacity="0.6"/>' +
            '<circle class="ml-node" cx="240" cy="180" r="6" fill="' + color + '" opacity="0.6"/>' +
            '<circle class="ml-node" cx="330" cy="180" r="6" fill="' + color + '" opacity="0.6"/>';
        var edges = '<line class="ml-edge" x1="200" y1="48" x2="120" y2="103" stroke="' + color + '" stroke-width="2" opacity="0.5"/>' +
            '<line class="ml-edge" x1="200" y1="48" x2="280" y2="103" stroke="' + color + '" stroke-width="2" opacity="0.5"/>' +
            '<line class="ml-edge" x1="120" y1="117" x2="70" y2="174" stroke="' + color + '" stroke-width="1.5" opacity="0.4"/>' +
            '<line class="ml-edge" x1="120" y1="117" x2="160" y2="174" stroke="' + color + '" stroke-width="1.5" opacity="0.4"/>' +
            '<line class="ml-edge" x1="280" y1="117" x2="240" y2="174" stroke="' + color + '" stroke-width="1.5" opacity="0.4"/>' +
            '<line class="ml-edge" x1="280" y1="117" x2="330" y2="174" stroke="' + color + '" stroke-width="1.5" opacity="0.4"/>';
        return svgWrap(edges + nodes, color);
    }

    function generateBoundaryThumbnail(color) {
        var region = '<rect class="ml-region" x="20" y="20" width="180" height="210" rx="8" fill="' +
            color + '" opacity="0.12"/>';
        var boundary = '<line class="ml-edge" x1="200" y1="20" x2="200" y2="230" stroke="' +
            color + '" stroke-width="2.5" stroke-dasharray="6 3" opacity="0.7"/>';
        var dotsA = '';
        var dotsB = '';
        for (var i = 0; i < 8; i++) {
            dotsA += '<circle class="ml-node" cx="' + (60 + (i * 37 % 120)) + '" cy="' +
                (50 + (i * 47 % 160)) + '" r="5" fill="' + color + '" opacity="0.7"/>';
            dotsB += '<circle class="ml-node" cx="' + (230 + (i * 41 % 130)) + '" cy="' +
                (40 + (i * 53 % 170)) + '" r="5" fill="#e3b341" opacity="0.7"/>';
        }
        return svgWrap(region + boundary + dotsA + dotsB, color);
    }

    function generateNeighborhoodThumbnail(color) {
        var dots = scatterDots(color, 15, 77);
        var query = '<circle cx="200" cy="125" r="6" fill="#fff" stroke="' + color +
            '" stroke-width="2.5"/>';
        var ring = '<circle cx="200" cy="125" r="55" fill="none" stroke="' + color +
            '" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.5"/>';
        return svgWrap(dots + ring + query, color);
    }

    function generateDistributionThumbnail(color) {
        var curve1 = '<path class="ml-edge" d="M40,220 Q100,220 130,180 Q160,100 200,60 Q240,100 270,180 Q300,220 360,220" ' +
            'fill="none" stroke="' + color + '" stroke-width="2.5" opacity="0.8"/>';
        var fill1 = '<path d="M40,220 Q100,220 130,180 Q160,100 200,60 Q240,100 270,180 Q300,220 360,220 L360,220 L40,220 Z" ' +
            'fill="' + color + '" opacity="0.1"/>';
        var curve2 = '<path class="ml-edge" d="M80,220 Q130,220 160,190 Q190,130 220,100 Q260,130 290,190 Q310,220 370,220" ' +
            'fill="none" stroke="#e3b341" stroke-width="2" opacity="0.6"/>';
        return svgWrap(fill1 + curve1 + curve2, color);
    }

    function generateEnsembleThumbnail(color) {
        var boxes = '';
        var labels = ['M1', 'M2', 'M3'];
        for (var i = 0; i < 3; i++) {
            var x = 60 + i * 110;
            boxes += '<rect class="ml-node" x="' + x + '" y="50" width="60" height="45" rx="6" ' +
                'fill="' + color + '" opacity="' + (0.4 + i * 0.15) + '"/>' +
                '<text x="' + (x + 30) + '" y="78" text-anchor="middle" fill="#fff" font-size="13" font-weight="600">' +
                labels[i] + '</text>';
        }
        var arrows = '';
        for (var j = 0; j < 3; j++) {
            arrows += '<line class="ml-edge" x1="' + (90 + j * 110) + '" y1="95" x2="200" y2="155" ' +
                'stroke="' + color + '" stroke-width="1.5" opacity="0.5"/>';
        }
        var final_box = '<rect x="170" y="155" width="60" height="40" rx="6" fill="' + color + '" opacity="0.9"/>' +
            '<text x="200" y="180" text-anchor="middle" fill="#fff" font-size="11" font-weight="600">Vote</text>';
        return svgWrap(boxes + arrows + final_box, color);
    }

    function generateRobustThumbnail(color) {
        var dots = scatterDots(color, 10, 33);
        var outliers = '<circle class="ml-node" cx="350" cy="40" r="5" fill="#f85149" opacity="0.8"/>' +
            '<circle class="ml-node" cx="60" cy="210" r="5" fill="#f85149" opacity="0.8"/>' +
            '<circle class="ml-node" cx="320" cy="200" r="5" fill="#f85149" opacity="0.8"/>';
        var line = '<line class="ml-edge" x1="50" y1="190" x2="360" y2="55" stroke="' +
            color + '" stroke-width="2.5" opacity="0.8"/>';
        return svgWrap(dots + outliers + line, color);
    }

    function generateFallbackThumbnail(model) {
        var color = getColor(model);
        var subcat = model.subcategory || 'linear';
        switch (subcat) {
            case 'tree':     return generateTreeThumbnail(color);
            case 'kernel':   return generateBoundaryThumbnail(color);
            case 'instance': return generateNeighborhoodThumbnail(color);
            case 'prob':
            case 'bayes':
            case 'glm':      return generateDistributionThumbnail(color);
            case 'ensemble': return generateEnsembleThumbnail(color);
            case 'robust':   return generateRobustThumbnail(color);
            default:         return generateScatterLineThumbnail(color);
        }
    }

    /* ---------- Create a single card ---------- */

    function createCard(model) {
        var isComingSoon = model._coming_soon;
        var card = document.createElement('a');
        card.className = 'zoo-card' + (isComingSoon ? ' zoo-card--coming-soon' : '');
        card.target = '_blank';
        card.rel = 'noopener';

        if (!isComingSoon && model._model_page_url) {
            card.href = model._model_page_url;
        } else if (!isComingSoon && model._repo_url) {
            card.href = model._repo_url + '/';
        } else {
            card.href = '#';
            card.style.cursor = 'default';
        }

        // Task badge
        var taskLabel = model.task === 'classification' ? 'CLS' : 'REG';
        var taskClass = model.task === 'classification' ? 'classification' : 'regression';

        // Category label
        var catLabel = SUBCAT_LABELS[model.subcategory] || model.subcategory;

        // Tags (first 3)
        var tagsHtml = '';
        var tags = model.tags || [];
        for (var i = 0; i < Math.min(3, tags.length); i++) {
            tagsHtml += '<span class="zoo-card__tag">' + tags[i] + '</span>';
        }

        // Year
        var yearHtml = model.year_introduced ?
            '<div class="zoo-card__year">Est. ' + model.year_introduced + '</div>' : '';

        card.innerHTML =
            '<div class="zoo-card__thumbnail" data-model-id="' + model.id + '">' +
                generateFallbackThumbnail(model) +
            '</div>' +
            '<div class="zoo-card__body">' +
                '<div class="zoo-card__title">' + model.name + '</div>' +
                yearHtml +
                '<div class="zoo-card__description">' + model.short_description + '</div>' +
            '</div>' +
            '<div class="zoo-card__meta">' +
                '<span class="zoo-card__task-badge zoo-card__task-badge--' + taskClass + '">' + taskLabel + '</span>' +
                '<span class="zoo-card__category-badge" style="color:' + getColor(model) + '">' + catLabel + '</span>' +
                tagsHtml +
                '<span class="zoo-card__complexity">' + complexityDots(model.complexity) + '</span>' +
            '</div>';

        return card;
    }

    /* ---------- Render cards ---------- */

    function renderCards(models) {
        if (!gridEl) return;
        gridEl.innerHTML = '';

        if (models.length === 0) {
            gridEl.innerHTML =
                '<div class="zoo-no-results">' +
                    '<div class="zoo-no-results__icon">?</div>' +
                    '<div class="zoo-no-results__text">No models match your filters</div>' +
                '</div>';
            return;
        }

        var frag = document.createDocumentFragment();
        models.forEach(function (m) {
            frag.appendChild(createCard(m));
        });
        gridEl.appendChild(frag);
    }

    /* ---------- Render grouped view ---------- */

    function renderGroupedCards(models) {
        if (!gridEl) return;
        gridEl.innerHTML = '';

        // Group by task → subcategory
        var groups = {};
        models.forEach(function (m) {
            var task = m.task || 'other';
            var sub = m.subcategory || 'other';
            var key = task + '|' + sub;
            if (!groups[key]) groups[key] = { task: task, subcategory: sub, models: [] };
            groups[key].models.push(m);
        });

        // Sort: regression first, then by subcategory
        var taskOrder = { regression: 0, classification: 1 };
        var subOrder = { linear: 0, glm: 1, tree: 2, kernel: 3, instance: 4, bayes: 5, prob: 5, robust: 6, ensemble: 7 };
        var sortedKeys = Object.keys(groups).sort(function (a, b) {
            var ga = groups[a], gb = groups[b];
            var td = (taskOrder[ga.task] || 9) - (taskOrder[gb.task] || 9);
            if (td !== 0) return td;
            return (subOrder[ga.subcategory] || 9) - (subOrder[gb.subcategory] || 9);
        });

        var frag = document.createDocumentFragment();
        var lastTask = '';

        sortedKeys.forEach(function (key) {
            var group = groups[key];

            // Task header
            if (group.task !== lastTask) {
                lastTask = group.task;
                var header = document.createElement('div');
                header.className = 'zoo-section-header';
                header.innerHTML = '<h2 class="zoo-section-header__title">' +
                    (group.task === 'regression' ? 'Regression' : 'Classification') +
                    '</h2>';
                frag.appendChild(header);
            }

            // Subcategory header
            var subHeader = document.createElement('h3');
            subHeader.className = 'zoo-subsection-header';
            subHeader.textContent = (SUBCAT_LABELS[group.subcategory] || group.subcategory) +
                ' (' + group.models.length + ')';
            frag.appendChild(subHeader);

            // Card grid for this group
            var subGrid = document.createElement('div');
            subGrid.className = 'zoo-grid';
            group.models.forEach(function (m) {
                subGrid.appendChild(createCard(m));
            });
            frag.appendChild(subGrid);
        });

        gridEl.appendChild(frag);
    }

    /* ---------- Render skeleton loading ---------- */

    function renderSkeletons(count) {
        if (!gridEl) return;
        gridEl.innerHTML = '';
        var frag = document.createDocumentFragment();
        for (var i = 0; i < count; i++) {
            var skel = document.createElement('div');
            skel.className = 'zoo-skeleton';
            skel.innerHTML =
                '<div class="zoo-skeleton__thumb"></div>' +
                '<div class="zoo-skeleton__body">' +
                    '<div class="zoo-skeleton__line zoo-skeleton__line--short"></div>' +
                    '<div class="zoo-skeleton__line zoo-skeleton__line--medium"></div>' +
                    '<div class="zoo-skeleton__line"></div>' +
                '</div>';
            frag.appendChild(skel);
        }
        gridEl.appendChild(frag);
    }

    /* ---------- Try loading live thumbnails ---------- */

    function loadThumbnails(models) {
        models.forEach(function (m) {
            if (!m._repo_url || m._coming_soon) return;
            var thumbEl = document.querySelector('[data-model-id="' + m.id + '"]');
            if (!thumbEl) return;

            MLZoo.registry.fetchThumbnail(m._repo_url, m.id)
                .then(function (svg) {
                    if (svg && thumbEl) thumbEl.innerHTML = svg;
                });
        });
    }

    /* ---------- Init ---------- */

    function init(containerSelector) {
        gridEl = document.querySelector(containerSelector || '.zoo-grid');
    }

    /* ---------- Public API ---------- */

    window.MLZoo = window.MLZoo || {};
    window.MLZoo.gallery = {
        init: init,
        renderCards: renderCards,
        renderGroupedCards: renderGroupedCards,
        renderSkeletons: renderSkeletons,
        loadThumbnails: loadThumbnails,
        getColor: getColor,
        SUBCAT_COLORS: SUBCAT_COLORS,
        SUBCAT_LABELS: SUBCAT_LABELS
    };
})();
