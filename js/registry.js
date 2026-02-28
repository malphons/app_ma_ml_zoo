/* ============================================================
   ML Zoo — Registry Module
   Fetches spoke manifests, caches in sessionStorage, fallback.
   ============================================================ */
(function () {
    'use strict';

    var REGISTRY_PATH   = 'data/registry.json';
    var FALLBACK_PATH   = 'data/fallback-cache.json';
    var CACHE_KEY       = 'mlzoo_manifest_cache_v1';
    var CACHE_TS_KEY    = 'mlzoo_manifest_ts_v1';
    var CACHE_TTL_MS    = 30 * 60 * 1000; // 30 minutes

    /* ---------- Session cache helpers ---------- */

    function getSessionCache() {
        try {
            var ts = sessionStorage.getItem(CACHE_TS_KEY);
            if (!ts || Date.now() - Number(ts) > CACHE_TTL_MS) return null;
            var data = sessionStorage.getItem(CACHE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (e) { return null; }
    }

    function setSessionCache(models) {
        try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(models));
            sessionStorage.setItem(CACHE_TS_KEY, String(Date.now()));
        } catch (e) { /* quota exceeded — ignore */ }
    }

    /* ---------- Load fallback cache ---------- */

    function loadFallback() {
        return fetch(FALLBACK_PATH)
            .then(function (r) { return r.json(); })
            .catch(function () { return []; });
    }

    /* ---------- Load registry + spoke manifests ---------- */

    function loadRegistry() {
        var cached = getSessionCache();
        if (cached && cached.length > 0) {
            return Promise.resolve(cached);
        }

        return fetch(REGISTRY_PATH)
            .then(function (r) { return r.json(); })
            .then(function (registry) {
                var baseUrl = registry.base_url_pattern
                    .replace('{github_user}', registry.github_user);
                var enabled = registry.spokes.filter(function (s) { return s.enabled; });

                var promises = enabled.map(function (spoke) {
                    var repoUrl = baseUrl.replace('{repo_name}', spoke.repo_name);
                    return fetch(repoUrl + '/manifest.json')
                        .then(function (r) {
                            if (!r.ok) throw new Error('HTTP ' + r.status);
                            return r.json();
                        })
                        .then(function (manifest) {
                            var models = manifest.models || [];
                            return models.map(function (m) {
                                m._repo_url = repoUrl;
                                m._repo_name = spoke.repo_name;
                                m._spoke_id = spoke.id;
                                m._model_page_url = repoUrl + '/models/' + m.id + '/';
                                return m;
                            });
                        })
                        .catch(function () { return []; });
                });

                return Promise.all(promises).then(function (results) {
                    var allModels = [];
                    results.forEach(function (arr) {
                        allModels = allModels.concat(arr);
                    });
                    return allModels;
                });
            })
            .then(function (liveModels) {
                if (liveModels.length > 0) {
                    setSessionCache(liveModels);
                }
                // Fill gaps from fallback
                return loadFallback().then(function (fallback) {
                    var loadedIds = {};
                    liveModels.forEach(function (m) { loadedIds[m.id] = true; });

                    fallback.forEach(function (fb) {
                        if (!loadedIds[fb.id]) {
                            fb._coming_soon = liveModels.length > 0;
                            liveModels.push(fb);
                        }
                    });

                    if (liveModels.length === 0) {
                        // No live data at all — use full fallback
                        return fallback;
                    }
                    return liveModels;
                });
            })
            .catch(function () {
                // Complete failure — fallback only
                return loadFallback();
            });
    }

    /* ---------- Fetch thumbnail SVG for a model ---------- */

    function fetchThumbnail(repoUrl, modelId) {
        var url = repoUrl + '/models/' + modelId + '/thumbnail.svg';
        return fetch(url)
            .then(function (r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.text();
            })
            .catch(function () { return null; });
    }

    /* ---------- Public API ---------- */

    window.MLZoo = window.MLZoo || {};
    window.MLZoo.registry = {
        loadRegistry: loadRegistry,
        fetchThumbnail: fetchThumbnail
    };
})();
