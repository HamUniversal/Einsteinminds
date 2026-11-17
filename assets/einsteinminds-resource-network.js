/* Einsteinminds Resource Network v1.0 — Supabase-backed directory UI. */
(function () {
  'use strict';

  const Core = window.EinsteinmindsResourceNetworkCore;
  if (!Core) throw new Error('Load resource-network-core.js before this file.');

  const PROJECT_URL = 'https://fxxjainrhtdezyzbqynn.supabase.co';
  // Publishable browser key only. Never put a Supabase secret/service-role key in this file.
  const PUBLISHABLE_KEY = 'sb_publishable_FHZJ_i63UsIX4Eqf0FlYkg_3YAmynUa';
  const API_ROOT = `${PROJECT_URL}/functions/v1`;
  const PAGE_SIZE = 12;
  const SAVED_KEY = 'einsteinminds.resource-directory.saved.v1';
  const STAGE_LABELS = Object.fromEntries(Core.LEARNING_STAGES.map((stage) => [stage.value, stage.label]));

  const state = {
    category: '',
    learningLevel: 'all',
    query: '',
    sort: 'name_asc',
    page: 1,
    total: 0,
    loading: false,
    requestNumber: 0,
    categories: [],
    stageCoverage: null,
    items: [],
    cache: new Map(),
    lastError: '',
    homeItems: [],
    homeContextKey: '',
    homeRequestNumber: 0,
    homeLoading: false
  };

  const $ = (selector, scope) => (scope || document).querySelector(selector);
  const $$ = (selector, scope) => [...(scope || document).querySelectorAll(selector)];
  const escapeHtml = Core.escapeHtml;

  function getSavedIds() {
    try {
      if (typeof Auth === 'undefined' || !Auth.signedIn || typeof S === 'undefined') return [];
      return Array.isArray(S.saved) ? [...new Set(S.saved.filter(Core.isUuid))] : [];
    } catch (_) {
      return [];
    }
  }

  function setSavedIds(ids) {
    if (typeof Auth === 'undefined' || !Auth.signedIn || typeof S === 'undefined') return false;
    S.saved = [...new Set(ids.filter(Core.isUuid))];
    if (typeof persist === 'function') persist();
    return true;
  }

  async function callFunction(name, body) {
    const response = await fetch(`${API_ROOT}/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: PUBLISHABLE_KEY
      },
      body: JSON.stringify(body || {})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `${name} returned HTTP ${response.status}`);
    return data;
  }

  function addEightCategories() {
    if (typeof CATS === 'undefined' || !Array.isArray(CATS)) return;
    const additions = [
      { id: 'space', ic: 'rocket', c: '#0B3D91', n: 'Space & Aerospace Engineering', d: 'Orbital mechanics, astrophysics, rocketry and space exploration technologies', subs: ['Astrophysics', 'Rocketry', 'Satellite Systems', 'Space Law'], p: [] },
      { id: 'culinary', ic: 'leaf', c: '#D32F2F', n: 'Culinary Arts & Gastronomy', d: 'Professional cooking, food science, pastry arts and global cuisines', subs: ['Pastry Arts', 'Food Science', 'Global Cuisines', 'Sommelier'], p: [] },
      { id: 'leadership', ic: 'users', c: '#1976D2', n: 'Personal Development & Leadership', d: 'Executive coaching, emotional intelligence, productivity and management', subs: ['Executive Coaching', 'Emotional Intelligence', 'Productivity', 'Public Speaking'], p: [] },
      { id: 'audio', ic: 'volume', c: '#7B1FA2', n: 'Music Production & Audio Engineering', d: 'Sound design, mixing, mastering, music theory and digital audio workstations', subs: ['Sound Design', 'Mixing & Mastering', 'Music Theory', 'Ableton & Logic'], p: [] },
      { id: 'film', ic: 'video', c: '#F57C00', n: 'Film, Photography & Visual Media', d: 'Cinematography, directing, photo editing, lighting and visual storytelling', subs: ['Cinematography', 'Photography', 'Video Editing', 'Lighting'], p: [] },
      { id: 'fitness', ic: 'heart', c: '#388E3C', n: 'Health, Fitness & Sports Science', d: 'Kinesiology, nutrition, athletic training, biomechanics and wellness', subs: ['Kinesiology', 'Sports Nutrition', 'Biomechanics', 'Yoga & Mobility'], p: [] },
      { id: 'linguistics', ic: 'lang', c: '#0097A7', n: 'Linguistics & Translation Studies', d: 'Syntax, phonetics, computational linguistics, interpretation and language acquisition', subs: ['Syntax', 'Phonetics', 'Computational Linguistics', 'Translation'], p: [] },
      { id: 'esports', ic: 'monitor', c: '#512DA8', n: 'Esports, Game Design & Interactive Media', d: 'Game development, competitive gaming, 3D modeling, UI design and narrative design', subs: ['Game Development', '3D Modeling', 'Competitive Strategy', 'Narrative Design'], p: [] }
    ];
    for (const category of additions) {
      if (!CATS.some((existing) => existing.id === category.id)) CATS.push({ ...category, count: 0 });
    }
    if (typeof D !== 'undefined' && D.en) {
      Object.assign(D.en, {
        cat_space: 'Space & Aerospace Engineering',
        cat_culinary: 'Culinary Arts & Gastronomy',
        cat_leadership: 'Personal Development & Leadership',
        cat_audio: 'Music Production & Audio Engineering',
        cat_film: 'Film, Photography & Visual Media',
        cat_fitness: 'Health, Fitness & Sports Science',
        cat_linguistics: 'Linguistics & Translation Studies',
        cat_esports: 'Esports, Game Design & Interactive Media'
      });
    }
  }

  function renderStageOptions(select) {
    if (!select) return;
    const current = select.value || 'all';
    const options = [
      '<option value="all">All learning levels</option>',
      ...Core.LEARNING_STAGES.map((stage) => `<option value="${stage.value}">${escapeHtml(stage.label)}</option>`),
      '<option value="unspecified">Not yet classified</option>'
    ];
    select.innerHTML = options.join('');
    select.value = Core.normalizeLearningStage(current);
  }

  function buildToolbar() {
    const anchor = $('#libFilterBar') || $('#resGrid');
    if (!anchor || $('#rnToolbar')) return;
    const toolbar = document.createElement('section');
    toolbar.id = 'rnToolbar';
    toolbar.className = 'rn-toolbar';
    toolbar.setAttribute('aria-label', 'Resource directory filters');
    toolbar.innerHTML = `
      <div class="rn-toolbar-row">
        <label class="rn-field"><span>Knowledge domain</span><select id="rnCategory"><option value="">All 24 domains</option></select></label>
        <label class="rn-field rn-stage-field"><span>Learning level</span><select id="rnLearningLevel"></select></label>
        <label class="rn-field rn-sort-field"><span>Sort</span><select id="rnSort"><option value="name_asc">Name A–Z</option><option value="name_desc">Name Z–A</option><option value="recently_checked">Recently checked</option></select></label>
        <label class="rn-field rn-search-field"><span>Search providers</span><input id="rnSearch" type="search" maxlength="180" placeholder="Name, subject or provider…" autocomplete="off"></label>
        <button type="button" class="btn btn-o btn-sm rn-clear" id="rnClear">Reset</button>
      </div>
      <p class="rn-note" id="rnNote" aria-live="polite">Loading the live provider directory…</p>
    `;
    anchor.parentNode.insertBefore(toolbar, anchor);
    renderStageOptions($('#rnLearningLevel'));

    $('#rnCategory').addEventListener('change', (event) => {
      state.category = event.target.value;
      if (typeof Lib !== 'undefined') { Lib.state.cat = state.category || null; Lib.state.page = 1; }
      state.page = 1;
      syncLegacyFilters();
      refresh();
    });
    $('#rnLearningLevel').addEventListener('change', (event) => {
      state.learningLevel = Core.normalizeLearningStage(event.target.value);
      if (typeof Lib !== 'undefined') Lib.state.page = 1;
      state.page = 1;
      refresh();
    });
    $('#rnSort').addEventListener('change', (event) => {
      state.sort = event.target.value;
      if (typeof Lib !== 'undefined') { Lib.state.sort = state.sort === 'name_desc' ? 'za' : state.sort === 'recently_checked' ? 'provider' : 'az'; Lib.state.page = 1; }
      state.page = 1;
      refresh();
    });
    $('#rnSearch').addEventListener('input', debounce((event) => {
      state.query = event.target.value.trim().slice(0, 180);
      if (typeof Lib !== 'undefined') { Lib.state.q = state.query; Lib.state.page = 1; }
      state.page = 1;
      refresh();
    }, 300));
    $('#rnClear').addEventListener('click', resetFilters);
  }

  function addStageFilterToLegacyModal() {
    const body = $('#mFilters .mdl-b');
    if (!body || $('#fLearningStage')) return;
    const field = document.createElement('div');
    field.className = 'fld';
    field.innerHTML = '<label for="fLearningStage">Learning level</label><select class="inp" id="fLearningStage"></select><p class="cap muted" style="margin-top:6px">A level is shown only when provider-specific evidence is recorded. Einsteinminds does not infer age suitability.</p>';
    const categoryField = $('#fCategory', body)?.closest('.fld');
    if (categoryField && categoryField.nextSibling) body.insertBefore(field, categoryField.nextSibling);
    else body.appendChild(field);
    renderStageOptions($('#fLearningStage'));
  }

  function syncLegacyFilters() {
    const category = $('#fCategory');
    const sort = $('#fSort');
    const stage = $('#fLearningStage');
    if (category) category.value = state.category;
    if (sort) sort.value = state.sort === 'name_desc' ? 'za' : state.sort === 'recently_checked' ? 'provider' : 'az';
    if (stage) stage.value = state.learningLevel;
    if ($('#rnCategory')) $('#rnCategory').value = state.category;
    if ($('#rnSort')) $('#rnSort').value = state.sort;
    if ($('#rnLearningLevel')) $('#rnLearningLevel').value = state.learningLevel;
    if ($('#rnSearch')) $('#rnSearch').value = state.query;
  }

  async function loadStats() {
    const data = await callFunction('resource-search', { action: 'stats' });
    state.categories = Array.isArray(data.categories) ? data.categories : [];
    state.total = Number.isFinite(data.total) ? data.total : 0;
    const categorySelect = $('#rnCategory');
    if (categorySelect) {
      categorySelect.innerHTML = '<option value="">All 24 domains</option>' + state.categories.map((category) =>
        `<option value="${escapeHtml(category.slug)}">${escapeHtml(category.name)} (${Number(category.actual_listings) || 0})</option>`
      ).join('');
      categorySelect.value = state.category;
    }
    for (const category of state.categories) {
      const localCategory = typeof CATS !== 'undefined' && CATS.find((item) => item.id === category.slug);
      if (localCategory) localCategory.count = Number(category.actual_listings) || 0;
    }
    const totalEl = $('#resourceTotal');
    if (totalEl) totalEl.textContent = new Intl.NumberFormat().format(state.total);
    const badgeText = $('.hero-badge [data-i18n="h_badge"]') || $('.hero-badge span');
    if (badgeText) badgeText.textContent = 'unique directory listings · not independently reviewed';
    renderKnowledgeDomains();
    const note = $('#rnNote');
    if (note) note.textContent = `${state.total.toLocaleString()} unique directory listings across ${state.categories.length} knowledge domains. Provider inclusion is not an endorsement.`;
  }


  function renderKnowledgeDomains() {
    const grid = $('#taxGrid');
    if (!grid || typeof CATS === 'undefined') return;
    const counts = new Map(state.categories.map((category) => [category.slug, Number(category.actual_listings) || 0]));
    const countsReady = state.categories.length > 0;
    grid.innerHTML = CATS.map((category, index) => {
      const count = counts.has(category.id) ? counts.get(category.id) : 0;
      const countText = countsReady ? `${count.toLocaleString()} ${count === 1 ? 'listing' : 'listings'}` : 'Loading live count…';
      return `<div class="tax" style="--tc:${escapeHtml(category.c)};--i:${index}" role="button" tabindex="0" onclick="Lib.openCat('${escapeHtml(category.id)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();Lib.openCat('${escapeHtml(category.id)}')}">
        <div class="tax-ic">${svg(category.ic)}</div><h3>${escapeHtml(categoryLabel(category))}</h3><p>${escapeHtml(category.d)}</p>
        <div class="tax-meta"><span class="tax-n">${countText}</span><span class="tax-p">${svg('ext')}</span></div></div>`;
    }).join('');
  }

  async function detectStageCoverage() {
    try {
      const result = await callFunction('resource-search', { learning_level: 'unspecified', page: 1, page_size: 1 });
      state.stageCoverage = Math.max(0, Number(result.total) || 0);
      if (state.stageCoverage === state.total) {
        const note = $('#rnNote');
        if (note) note.textContent += ' No provider has a reviewed learning-level mapping yet; stage filters will remain empty until evidence is added.';
      }
    } catch (_) {
      state.stageCoverage = null;
    }
  }

  function sortForServer(value) {
    if (value === 'name_desc') return 'name_desc';
    if (value === 'recently_checked') return 'recently_checked';
    return 'name_asc';
  }

  function queryKey(payload) { return JSON.stringify(payload); }

  async function searchResources(append) {
    const requestNumber = ++state.requestNumber;
    const savedOnly = !!(typeof Lib !== 'undefined' && Lib.state.savedOnly);
    const savedIds = savedOnly ? getSavedIds() : null;
    let payload;
    try {
      payload = Core.normalizeSearchPayload({
        query: state.query,
        category: state.category,
        learning_level: state.learningLevel,
        page: state.page,
        page_size: PAGE_SIZE,
        sort: sortForServer(state.sort),
        saved_only: savedOnly,
        resource_ids: savedIds || undefined
      });
    } catch (error) {
      showError(error.message);
      return;
    }
    const key = queryKey(payload);
    try {
      state.loading = true;
      const cached = state.cache.get(key);
      const result = cached && Date.now() - cached.savedAt < 30000
        ? cached.data
        : await callFunction('resource-search', payload);
      if (!cached || result !== cached.data) state.cache.set(key, { data: result, savedAt: Date.now() });
      if (requestNumber !== state.requestNumber) return;
      state.items = append ? state.items.concat(result.items || []) : (result.items || []);
      state.total = Number(result.total) || 0;
      state.loading = false;
      renderResources(append);
    } catch (error) {
      if (requestNumber !== state.requestNumber) return;
      state.lastError = error.message;
      showError(`The live catalogue could not be loaded: ${error.message}. Please try again.`);
    } finally {
      if (requestNumber === state.requestNumber) state.loading = false;
    }
  }

  function renderResources(append) {
    const grid = $('#resGrid');
    if (!grid) return;
    const items = state.items;
    const html = items.map((resource) => renderCard(resource)).join('');
    if (!append) grid.innerHTML = html || emptyState();
    else {
      const empty = $('.rn-empty', grid);
      if (empty) empty.remove();
      grid.insertAdjacentHTML('beforeend', html);
    }
    const count = $('#libCount');
    if (count) count.textContent = `Showing ${items.length.toLocaleString()} of ${state.total.toLocaleString()} directory listings`;
    const moreWrap = $('#moreWrap');
    if (moreWrap) moreWrap.style.display = items.length < state.total ? 'block' : 'none';
    const moreButton = $('#moreBtn');
    if (moreButton) {
      moreButton.disabled = state.loading;
      moreButton.textContent = items.length < state.total ? `Load more (${items.length.toLocaleString()} / ${state.total.toLocaleString()})` : 'All results loaded';
      moreButton.onclick = () => loadMore();
    }
    const note = $('#rnNote');
    if (note) {
      const levelText = state.learningLevel === 'all' ? 'all levels' : state.learningLevel === 'unspecified' ? 'not yet classified' : STAGE_LABELS[state.learningLevel];
      note.textContent = `${state.total.toLocaleString()} directory listings · ${state.categories.length} domains · ${levelText}. Inclusion is not an endorsement.`;
      if (state.stageCoverage === state.total && state.learningLevel === 'all') note.textContent += ' No learning-level evidence has been reviewed yet.';
    }
    renderHomeRecommendations();
    const filterBar = $('#libFilterBar');
    if (filterBar) {
      const parts = [];
      if (state.category) parts.push(state.categories.find((item) => item.slug === state.category)?.name || state.category);
      if (state.query) parts.push(`“${state.query}”`);
      if (state.learningLevel !== 'all') parts.push(state.learningLevel === 'unspecified' ? 'Not yet classified' : STAGE_LABELS[state.learningLevel]);
      if (typeof Lib !== 'undefined' && Lib.state.savedOnly) parts.push('Saved on this device');
      filterBar.innerHTML = parts.length ? `<div class="fbar"><span>${parts.map(escapeHtml).join(' · ')}</span><button type="button" class="btn btn-o btn-xs" id="rnResetInline">Reset</button></div>` : '';
      $('#rnResetInline')?.addEventListener('click', resetFilters);
    }
  }

  function renderCard(resource) {
    const id = escapeHtml(resource.id);
    const categoryNames = (resource.categories || []).map((category) => category.name).filter(Boolean);
    const stageText = Core.stageLabel(resource.learning_stages);
    const description = resource.directory_description || 'Open the provider’s official website to read its own introduction and current offering.';
    const isSaved = getSavedIds().includes(resource.id);
    const reviewLabel = Core.editorialLabel(resource);
    const labels = [reviewLabel, ...categoryNames.slice(0, 2), stageText];
    const safeName = escapeHtml(resource.name || 'Unnamed provider');
    const domain = escapeHtml(resource.official_domain || 'Official provider website');
    return `<article class="rc rn-card" data-resource-id="${id}">
      <div class="rc-top"><div class="pav" aria-hidden="true">${safeName.slice(0, 2).toUpperCase()}</div><span class="pnm">${domain}</span>
      <button type="button" class="rc-save ${isSaved ? 'on' : ''}" data-rn-save="${id}" aria-label="${isSaved ? 'Remove saved provider' : 'Save provider'}" aria-pressed="${isSaved}">☆</button></div>
      <h3 class="rc-t">${safeName}</h3><p class="rc-d">${escapeHtml(description)}</p>
      <div class="tags">${labels.map((label) => `<span class="tag">${escapeHtml(label)}</span>`).join('')}</div>
      <div class="rc-f"><button type="button" class="btn btn-p btn-sm" data-rn-open="${id}" style="flex:1">Open official site</button>
      <button type="button" class="btn btn-o btn-sm" data-rn-details="${id}">Details</button></div>
    </article>`;
  }

  function emptyState() {
    return `<div class="empty rn-empty" style="grid-column:1/-1"><div class="empty-ic">◎</div><h3>No directory listings match these filters</h3><p>Try another domain, search term or learning level. A learning-level result appears only when supported by provider-specific evidence.</p><button class="btn btn-s" id="rnEmptyReset">Reset filters</button></div>`;
  }

  function showError(message) {
    const grid = $('#resGrid');
    if (grid) grid.innerHTML = `<div class="empty rn-empty" style="grid-column:1/-1"><h3>Resource directory temporarily unavailable</h3><p>${escapeHtml(message)}</p><button type="button" class="btn btn-p" id="rnRetry">Retry</button></div>`;
    $('#rnRetry')?.addEventListener('click', () => refresh());
    const note = $('#rnNote');
    if (note) note.textContent = 'Unable to confirm current catalogue results. Please retry.';
  }

  function createModal(id, title, content) {
    let modal = document.getElementById(id);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = id;
      modal.className = 'rn-overlay';
      modal.setAttribute('role', 'presentation');
      modal.innerHTML = '<div class="rn-dialog" role="dialog" aria-modal="true"></div>';
      document.body.appendChild(modal);
      modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(id); });
    }
    const dialog = $('.rn-dialog', modal);
    dialog.innerHTML = `<div class="rn-dialog-head"><h2>${escapeHtml(title)}</h2><button type="button" class="rn-close" aria-label="Close">×</button></div><div class="rn-dialog-body">${content}</div>`;
    $('.rn-close', dialog).addEventListener('click', () => closeModal(id));
    modal.classList.add('open');
    document.body.classList.add('rn-modal-open');
    $('.rn-close', dialog).focus();
    return modal;
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('open');
    if (!$('.rn-overlay.open')) document.body.classList.remove('rn-modal-open');
  }

  function findResource(id) {
    return state.items.find((resource) => resource.id === id) || state.cacheResource?.get(id) || null;
  }

  async function showDetails(id) {
    const resource = findResource(id);
    if (!resource) return;
    const categories = (resource.categories || []).map((category) => category.name).filter(Boolean).join(', ') || 'Not classified';
    const intro = resource.provider_introduction
      ? `<p class="rn-official-intro">${escapeHtml(resource.provider_introduction)}</p><p class="rn-source-note">Original provider metadata · ${escapeHtml(resource.intro_status || 'official metadata')}. This text comes from the provider’s own page metadata.</p>`
      : `<p class="rn-source-note">No original provider introduction has been captured yet. You can request the provider’s current official page description; if one is available in the page metadata, its source will be shown.</p><button type="button" class="btn btn-s btn-sm" id="rnLoadIntro">Load official introduction</button>`;
    const modal = createModal('rnDetailsModal', resource.name || 'Provider details', `
      <div class="rn-meta-grid"><div><b>Official domain</b><span>${escapeHtml(resource.official_domain)}</span></div><div><b>Directory status</b><span>${escapeHtml(Core.editorialLabel(resource))}</span></div>
      <div><b>Knowledge domains</b><span>${escapeHtml(categories)}</span></div><div><b>Learning level</b><span>${escapeHtml(Core.stageLabel(resource.learning_stages))}</span></div>
      <div><b>Resource type</b><span>${escapeHtml(resource.resource_type || 'Website')}</span></div><div><b>Cost</b><span>${escapeHtml(resource.cost_model || 'Not yet classified')}</span></div></div>
      <h3 class="rn-subheading">Provider introduction</h3><div id="rnIntroContent">${intro}</div>
      <p class="rn-disclaimer">Einsteinminds lists this provider as an external resource. We do not claim endorsement, accreditation, safety evaluation or suitability unless a separate evidence review is shown.</p>
      <div class="rn-dialog-actions"><button type="button" class="btn btn-o" id="rnDetailsClose">Close</button><button type="button" class="btn btn-p" id="rnDetailsOpen">Open official site</button></div>
    `);
    $('#rnDetailsClose', modal).addEventListener('click', () => closeModal('rnDetailsModal'));
    $('#rnDetailsOpen', modal).addEventListener('click', () => openExternal(id));
    $('#rnLoadIntro', modal)?.addEventListener('click', () => loadProviderIntroduction(resource, modal));
  }

  async function loadProviderIntroduction(resource, modal) {
    const content = $('#rnIntroContent', modal);
    if (!content) return;
    content.textContent = 'Retrieving the provider’s current page metadata…';
    try {
      const result = await callFunction('provider-introduction', { resource_id: resource.id });
      resource.provider_introduction = result.introduction || null;
      resource.intro_status = result.source_kind || 'unavailable';
      resource.intro_source_url = result.source_url || resource.canonical_url;
      if (result.introduction) {
        content.innerHTML = `<p class="rn-official-intro">${escapeHtml(result.introduction)}</p><p class="rn-source-note">Original provider page metadata · ${escapeHtml(result.source_kind || 'official metadata')}. This text comes from the provider’s own page metadata.</p>`;
      } else {
        content.textContent = 'The provider did not publish a readable page description in its metadata. Open the official site to view its current introduction.';
      }
    } catch (error) {
      content.textContent = `The provider introduction could not be retrieved: ${error.message}`;
    }
  }

  function showOutboundConfirmation(resourceId) {
    const resource = findResource(resourceId);
    if (!resource) return;
    const host = resource.official_domain || new URL(resource.canonical_url).hostname;
    const modal = createModal('rnOutboundModal', 'You are leaving Einsteinminds', `
      <p class="rn-outbound-domain">${escapeHtml(host)}</p>
      <p>This resource opens the provider’s official website in a new browser tab. Its content is controlled by the provider, not Einsteinminds.</p>
      <p class="rn-disclaimer">Einsteinminds has not independently reviewed or endorsed this listing. Do not share private learner information with external providers unless you have checked their policies.</p>
      <div class="rn-dialog-actions"><button type="button" class="btn btn-o" id="rnGoBack">Go back</button><button type="button" class="btn btn-p" id="rnContinue">Continue to ${escapeHtml(host)}</button></div>
      <p id="rnOutboundStatus" class="rn-source-note" aria-live="polite"></p>
      <p id="rnPopupFallback" class="rn-popup-fallback" hidden></p>
    `);
    $('#rnGoBack', modal).addEventListener('click', () => closeModal('rnOutboundModal'));
    $('#rnContinue', modal).addEventListener('click', () => continueOutbound(resourceId, modal));
  }

  async function continueOutbound(resourceId, modal) {
    const resource = findResource(resourceId);
    if (!resource) return;
    const status = $('#rnOutboundStatus', modal);
    const button = $('#rnContinue', modal);
    const fallback = $('#rnPopupFallback', modal);
    // Open a blank tab synchronously within the real click gesture; navigate only after
    // the Supabase gateway resolves the catalogue ID to its stored, host-checked URL.
    const popup = window.open('about:blank', '_blank');
    if (popup) {
      try { popup.opener = null; } catch (_) { /* browser may expose a read-only opener */ }
      try { popup.document.title = 'Opening provider website…'; } catch (_) { /* cross-origin not yet relevant */ }
    }
    button.disabled = true;
    status.textContent = 'Checking the saved provider destination…';
    try {
      const payload = Core.normalizeOutboundPayload(resource.id, state.category || resource.categories?.[0]?.slug || '');
      const result = await callFunction('resource-outbound', payload);
      const destination = result.destination_url;
      if (!Core.isSafeStoredHttps(destination, result.provider_host)) throw new Error('The gateway returned a destination that did not match the saved provider host.');
      if (popup && !popup.closed) {
        popup.location.replace(destination);
        closeModal('rnOutboundModal');
      } else {
        status.textContent = 'Your browser blocked the new tab. Use the secure link below to continue.';
        fallback.hidden = false;
        fallback.innerHTML = `<a class="btn btn-p" href="${escapeHtml(destination)}" target="_blank" rel="noopener noreferrer">Open ${escapeHtml(result.provider_host)} in a new tab</a>`;
        button.disabled = false;
      }
    } catch (error) {
      if (popup && !popup.closed) popup.close();
      status.textContent = `The secure outbound check failed: ${error.message}. No external page was opened.`;
      button.disabled = false;
    }
  }

  function openExternal(resourceId) {
    showOutboundConfirmation(resourceId);
  }

  function toggleSave(resourceId) {
    if (typeof Gate === 'undefined' || !Gate.require()) return;
    const saved = getSavedIds();
    const index = saved.indexOf(resourceId);
    if (index >= 0) saved.splice(index, 1); else saved.push(resourceId);
    if (!setSavedIds(saved)) return;
    const button = $(`[data-rn-save="${resourceId}"]`);
    if (button) {
      const on = saved.includes(resourceId);
      button.classList.toggle('on', on);
      button.setAttribute('aria-pressed', String(on));
      button.setAttribute('aria-label', on ? 'Remove saved provider' : 'Save provider');
      button.textContent = on ? '★' : '☆';
    }
  }

  async function loadMore() {
    if (state.loading || state.items.length >= state.total) return;
    state.page += 1;
    if (typeof Lib !== 'undefined') Lib.state.page = state.page;
    await searchResources(true);
  }

  function resetFilters() {
    state.category = '';
    state.learningLevel = 'all';
    state.query = '';
    state.sort = 'name_asc';
    state.page = 1;
    if (typeof Lib !== 'undefined') {
      Lib.state.cat = null;
      Lib.state.q = '';
      Lib.state.savedOnly = false;
      Lib.state.page = 1;
      Lib.state.sort = 'az';
    }
    syncLegacyFilters();
    refresh();
  }

  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function refresh() {
    if (!$('#resGrid')) return;
    state.page = Math.max(1, state.page);
    const grid = $('#resGrid');
    grid.innerHTML = '<div class="rn-loading" style="grid-column:1/-1">Loading current provider listings…</div>';
    return searchResources(false);
  }

  function bindDelegatedEvents() {
    for (const container of [$('#resGrid'), $('#homeRec')]) {
      if (!container || container.dataset.rnBound === '1') continue;
      container.dataset.rnBound = '1';
      container.addEventListener('click', (event) => {
        const open = event.target.closest('[data-rn-open]');
        const details = event.target.closest('[data-rn-details]');
        const save = event.target.closest('[data-rn-save]');
        if (open) { event.preventDefault(); openExternal(open.dataset.rnOpen); }
        else if (details) { event.preventDefault(); showDetails(details.dataset.rnDetails); }
        else if (save) { event.preventDefault(); toggleSave(save.dataset.rnSave); }
      });
    }
  }

  function recommendationPayload() {
    const payload = { action: 'recommendations', exclude_ids: getSavedIds().slice(0, 100) };
    try {
      if (typeof S !== 'undefined' && Array.isArray(S.goals) && S.goals.length && typeof CATS !== 'undefined') {
        const subject = S.goals[0]?.s;
        const category = CATS.find((item) => item.id === subject || (Array.isArray(item.subs) && item.subs.includes(subject)));
        if (category && /^[a-z0-9-]{2,64}$/.test(category.id)) payload.category = category.id;
      }
    } catch (_) {
      // A missing local goal is a normal first-visit state; use fresh catalogue suggestions.
    }
    return payload;
  }

  function renderHomeRecommendations() {
    const home = $('#homeRec');
    if (!home) return;
    if (!state.homeItems.length) {
      home.innerHTML = '<p class="bs muted" style="grid-column:1/-1">Recommendations are being prepared from the live provider directory…</p>';
      return;
    }
    home.innerHTML = state.homeItems.map((resource) => renderCard(resource)).join('');
    bindDelegatedEvents();
  }

  async function refreshHomeRecommendations(force = false) {
    const home = $('#homeRec');
    if (!home) return false;
    const payload = recommendationPayload();
    const contextKey = JSON.stringify({ category: payload.category || '', exclude_ids: payload.exclude_ids });
    if (!force && state.homeItems.length && state.homeContextKey === contextKey) {
      renderHomeRecommendations();
      return true;
    }
    const requestNumber = ++state.homeRequestNumber;
    state.homeLoading = true;
    home.setAttribute('aria-busy', 'true');
    home.innerHTML = '<p class="bs muted" style="grid-column:1/-1">Finding suggestions based on your learning goal and saved resources…</p>';
    try {
      const result = await callFunction('resource-search', payload);
      if (requestNumber !== state.homeRequestNumber) return false;
      state.homeItems = Array.isArray(result.items) ? result.items.slice(0, 6) : [];
      state.homeContextKey = contextKey;
      if (!state.homeItems.length) {
        home.innerHTML = '<p class="bs muted" style="grid-column:1/-1">No provider suggestions are available right now. Please try again.</p>';
        return false;
      }
      home.innerHTML = state.homeItems.map((resource) => renderCard(resource)).join('');
      bindDelegatedEvents();
      return true;
    } catch (error) {
      if (requestNumber !== state.homeRequestNumber) return false;
      home.innerHTML = '<div class="empty rn-empty" style="grid-column:1/-1"><h3>Recommendations could not be refreshed</h3><p class="bs muted">The live directory did not return fresh suggestions. Your saved resources and directory data are unchanged.</p><button type="button" class="btn btn-p" id="rnHomeRetry">Try again</button></div>';
      $('#rnHomeRetry')?.addEventListener('click', () => refreshHomeRecommendations(true));
      return false;
    } finally {
      if (requestNumber === state.homeRequestNumber) {
        state.homeLoading = false;
        home.removeAttribute('aria-busy');
      }
    }
  }

  function overrideLegacyDirectory() {
    if (typeof Lib === 'undefined') return;
    const originalRender = Lib.render.bind(Lib);
    Lib.filtered = function () {
      const source = typeof RESOURCE_INDEX !== 'undefined' ? RESOURCE_INDEX.slice() : [];
      return source.filter((resource) => {
        if (this.state.cat && !resource.categories.includes(this.state.cat)) return false;
        if (this.state.q) {
          const q = this.state.q.toLowerCase();
          const text = `${resource.title} ${resource.plat} ${resource.desc} ${resource.categories.join(' ')}`.toLowerCase();
          if (!text.includes(q)) return false;
        }
        return true;
      });
    };
    Lib.more = loadMore;
    Lib.toggleSaved = function () {
      this.state.savedOnly = !this.state.savedOnly;
      state.page = 1;
      state.cache.clear();
      refresh();
    };
    Lib.clearAll = resetFilters;
    Lib.render = function () {
      originalRender();
      if (document.readyState !== 'loading' && $('#resGrid')) {
        state.category = this.state.cat || '';
        state.query = String(this.state.q || '').trim().slice(0, 180);
        state.page = Math.max(1, Number(this.state.page) || state.page);
        if (this.state.sort === 'za') state.sort = 'name_desc';
        else if (this.state.sort === 'provider') state.sort = 'recently_checked';
        else if (this.state.sort === 'az' || !this.state.sort) state.sort = 'name_asc';
        buildToolbar();
        addStageFilterToLegacyModal();
        bindDelegatedEvents();
        syncLegacyFilters();
        refresh();
      }
    };
    const originalOpenCat = Lib.openCat.bind(Lib);
    Lib.openCat = function (id) {
      state.category = id;
      state.page = 1;
      state.cache.clear();
      originalOpenCat(id);
      syncLegacyFilters();
      refresh();
    };
    const originalApplyFilters = Lib.applyFilters.bind(Lib);
    Lib.applyFilters = function () {
      state.category = $('#fCategory')?.value || '';
      state.learningLevel = Core.normalizeLearningStage($('#fLearningStage')?.value || state.learningLevel);
      const sort = $('#fSort')?.value || 'az';
      state.sort = sort === 'za' ? 'name_desc' : sort === 'provider' ? 'recently_checked' : 'name_asc';
      state.page = 1;
      state.cache.clear();
      try { originalApplyFilters(); } catch (_) { /* the cloud directory remains authoritative */ }
      refresh();
    };
    Lib.detail = function (id) {
      if (Core.isUuid(id)) showDetails(id);
      else {
        const resource = typeof RESOURCE_INDEX !== 'undefined' ? RESOURCE_INDEX.find((item) => item.id === id) : null;
        if (resource) {
          // Legacy local seed rows remain available in fallback mode, with an explicit warning.
          window.alert('This legacy seed item has no live catalogue ID. Use the live provider directory for tracked outbound links.');
        }
      }
    };
  }

  function removeLegacyFakeBrowser() {
    $('#inAppBrowser')?.remove();
    $$('.in-app-browser, #iabFrame').forEach((node) => node.remove());
    window.openInApp = function () {
      if (typeof Toast !== 'undefined' && typeof Toast.show === 'function') Toast.show('Open a provider from the live Resource Library to use the secure outbound gateway.', 'info');
      return false;
    };
  }

  async function boot() {
    addEightCategories();
    const totalBadge = $('#resourceTotal');
    if (totalBadge) totalBadge.textContent = '—';
    const badgeText = $('.hero-badge [data-i18n="h_badge"]') || $('.hero-badge span');
    if (badgeText) badgeText.textContent = 'loading the live provider directory…';
    renderKnowledgeDomains();
    buildToolbar();
    addStageFilterToLegacyModal();
    bindDelegatedEvents();
    removeLegacyFakeBrowser();
    overrideLegacyDirectory();
    try {
      await loadStats();
      await detectStageCoverage();
      syncLegacyFilters();
      refresh();
    } catch (error) {
      showError(`Unable to connect to the Einsteinminds catalogue: ${error.message}`);
    }
  }

  // Expose a small supported interface for navigation and diagnostics.
  window.EinsteinmindsResourceNetwork = Object.freeze({
    refresh,
    resetFilters,
    loadMore,
    openExternal,
    state,
    getSavedIds,
    renderHomeRecommendations,
    refreshHomeRecommendations
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
