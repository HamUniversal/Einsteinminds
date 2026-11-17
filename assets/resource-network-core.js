/* Einsteinminds Resource Network — shared, dependency-free validation core. */
(function (root) {
  'use strict';

  const LEARNING_STAGES = Object.freeze([
    { value: 'pre_k', label: 'Pre-K / Early Years' },
    { value: 'kindergarten', label: 'Kindergarten' },
    { value: 'primary', label: 'Elementary / Primary' },
    { value: 'middle', label: 'Middle School' },
    { value: 'secondary', label: 'High School / Upper Secondary' },
    { value: 'vocational', label: 'Vocational / Technical' },
    { value: 'undergraduate', label: 'Undergraduate' },
    { value: 'graduate', label: 'Graduate / Postgraduate' },
    { value: 'doctoral', label: 'Doctoral / Research' },
    { value: 'professional', label: 'Professional / Continuing' },
    { value: 'entrepreneur', label: 'Entrepreneur / Founder' },
    { value: 'lifelong', label: 'Lifelong Learning' }
  ]);

  const STAGE_VALUES = new Set(LEARNING_STAGES.map((stage) => stage.value));
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const SLUG_RE = /^[a-z0-9-]{2,64}$/;

  function isUuid(value) {
    return typeof value === 'string' && UUID_RE.test(value);
  }

  function normalizeLearningStage(value) {
    if (value === undefined || value === null || value === '' || value === 'all') return 'all';
    if (value === 'unspecified' || STAGE_VALUES.has(value)) return value;
    throw new TypeError('Unsupported learning stage.');
  }

  function normalizeCategory(value) {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'string' || !SLUG_RE.test(value)) throw new TypeError('Invalid category slug.');
    return value;
  }

  function normalizeSearchPayload(input) {
    const source = input || {};
    const page = Number.isInteger(source.page) ? Math.min(100000, Math.max(1, source.page)) : 1;
    const pageSize = Number.isInteger(source.page_size) ? Math.min(48, Math.max(1, source.page_size)) : 12;
    const sort = ['name_asc', 'name_desc', 'recently_checked'].includes(source.sort) ? source.sort : 'name_asc';
    const payload = {
      query: typeof source.query === 'string' ? source.query.trim().slice(0, 180) : '',
      category: normalizeCategory(source.category),
      learning_level: normalizeLearningStage(source.learning_level),
      page,
      page_size: pageSize,
      sort
    };
    if (source.saved_only === true) {
      if (!Array.isArray(source.resource_ids)) throw new TypeError('Saved-resource search requires resource IDs.');
      const ids = [...new Set(source.resource_ids)];
      if (ids.some((id) => !isUuid(id))) throw new TypeError('Saved-resource identifiers must be valid resource IDs.');
      payload.resource_ids = ids.slice(0, 500);
    }
    return payload;
  }

  function normalizeOutboundPayload(resourceId, categorySlug) {
    if (!isUuid(resourceId)) throw new TypeError('A valid catalogue resource ID is required.');
    return {
      resource_id: resourceId,
      category_slug: categorySlug && SLUG_RE.test(categorySlug) ? categorySlug : '',
      add_utm: true
    };
  }

  function isSafeStoredHttps(raw, expectedHost) {
    if (typeof raw !== 'string' || raw.length > 2048) return false;
    try {
      const url = new URL(raw);
      if (url.protocol !== 'https:' || url.username || url.password) return false;
      if (url.port && url.port !== '443') return false;
      if (!expectedHost || url.hostname.toLowerCase() !== String(expectedHost).toLowerCase()) return false;
      if (/^(localhost|.*\.local|.*\.internal)$/i.test(url.hostname)) return false;
      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(url.hostname) || url.hostname.startsWith('[')) return false;
      return true;
    } catch (_) {
      return false;
    }
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  function stageLabel(value) {
    if (!Array.isArray(value) || value.length === 0) return 'Learning level not yet classified';
    return value.map((code) => LEARNING_STAGES.find((stage) => stage.value === code)?.label || '').filter(Boolean).join(' · ')
      || 'Learning level not yet classified';
  }

  function editorialLabel(resource) {
    if (resource && resource.editorial_status === 'reviewed') return 'Editorially reviewed';
    if (resource && resource.editorial_status === 'rejected') return 'Not listed';
    return 'Directory listing · not independently reviewed';
  }

  root.EinsteinmindsResourceNetworkCore = Object.freeze({
    LEARNING_STAGES,
    isUuid,
    normalizeLearningStage,
    normalizeCategory,
    normalizeSearchPayload,
    normalizeOutboundPayload,
    isSafeStoredHttps,
    escapeHtml,
    stageLabel,
    editorialLabel
  });
})(typeof window !== 'undefined' ? window : globalThis);
