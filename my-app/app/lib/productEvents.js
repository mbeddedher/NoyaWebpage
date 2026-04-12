'use client';

const SESSION_KEY = 'product_events_session_id';
const VISITOR_KEY = 'product_events_visitor_id';
const EVENT_TYPES = [
  'impression',
  'click',
  'view',
  'add_to_cart',
  'purchase',
  'gallery_interact',
  'size_select',
];

function getOrCreateSessionId() {
  if (typeof window === 'undefined') return null;
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

function getOrCreateVisitorId() {
  if (typeof window === 'undefined') return null;
  let visitorId = localStorage.getItem(VISITOR_KEY);
  if (!visitorId) {
    visitorId = `v_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem(VISITOR_KEY, visitorId);
  }
  return visitorId;
}

/**
 * Track a product display event. Fire-and-forget; does not throw.
 * @param {number} displayId - Product display ID (product_display.id)
 * @param {'impression'|'click'|'view'|'add_to_cart'|'purchase'|'gallery_interact'|'size_select'} eventType
 * @param {{ userId?: number, source?: string }} [options] - source: where user saw/acted (e.g. 'home', 'category', 'search', 'product_detail')
 */
export function trackProductEvent(displayId, eventType, options = {}) {
  if (displayId == null || !EVENT_TYPES.includes(eventType)) return;

  const sessionId = getOrCreateSessionId();
  const visitorId = getOrCreateVisitorId();
  const payload = {
    display_id: Number(displayId),
    event_type: eventType,
    session_id: sessionId,
    visitor_id: visitorId,
    user_id: options.userId ?? null,
    source: options.source ?? null,
  };

  fetch('/api/product-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  }).catch(() => {});
}
