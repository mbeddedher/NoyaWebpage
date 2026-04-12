'use client';

import { useEffect, useMemo, useState } from 'react';
import DisplayContentLayout from '../layouts/DisplayContentLayout';

export default function Analytics() {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [topSources, setTopSources] = useState([]);
  const [recalcLoading, setRecalcLoading] = useState(false);

  const [activityKind, setActivityKind] = useState('visitors'); // visitors | users
  const [activityRows, setActivityRows] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState(null);

  const [selectedActivity, setSelectedActivity] = useState(null); // { kind, visitor_id|user_id }
  const [activityEvents, setActivityEvents] = useState([]);
  const [activityEventsLoading, setActivityEventsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/admin/analytics/product-events?days=${days}`);
        if (!res.ok) throw new Error('Failed to load analytics');
        const data = await res.json();
        if (cancelled) return;
        setTopProducts(Array.isArray(data.top_products) ? data.top_products : []);
        setTopSources(Array.isArray(data.top_sources) ? data.top_sources : []);
      } catch (e) {
        if (cancelled) return;
        setError(e.message || 'Failed to load analytics');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [days]);

  const recalcPopularity = async () => {
    try {
      setRecalcLoading(true);
      const res = await fetch('/api/admin/analytics/recalculate-popularity', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to recalculate popularity');
      // refresh tables
      const refreshed = await fetch(`/api/admin/analytics/product-events?days=${days}`);
      if (refreshed.ok) {
        const data = await refreshed.json();
        setTopProducts(Array.isArray(data.top_products) ? data.top_products : []);
        setTopSources(Array.isArray(data.top_sources) ? data.top_sources : []);
      }
      alert('Popularity score recalculated.');
    } catch (e) {
      alert(e.message || 'Failed to recalculate popularity');
    } finally {
      setRecalcLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setActivityLoading(true);
        setActivityError(null);
        setSelectedActivity(null);
        setActivityEvents([]);
        const res = await fetch(`/api/admin/analytics/activity?kind=${activityKind}&days=${days}`);
        if (!res.ok) throw new Error('Failed to load activity analytics');
        const data = await res.json();
        if (cancelled) return;
        setActivityRows(Array.isArray(data.rows) ? data.rows : []);
      } catch (e) {
        if (cancelled) return;
        setActivityError(e.message || 'Failed to load activity analytics');
      } finally {
        if (!cancelled) setActivityLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [activityKind, days]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!selectedActivity) return;
      try {
        setActivityEventsLoading(true);
        const qs =
          selectedActivity.kind === 'visitors'
            ? `visitor_id=${encodeURIComponent(selectedActivity.visitor_id)}`
            : `user_id=${encodeURIComponent(String(selectedActivity.user_id))}`;
        const res = await fetch(`/api/admin/analytics/activity-events?${qs}`);
        if (!res.ok) throw new Error('Failed to load activity events');
        const data = await res.json();
        if (cancelled) return;
        setActivityEvents(Array.isArray(data.rows) ? data.rows : []);
      } catch (e) {
        if (cancelled) return;
        setActivityEvents([]);
      } finally {
        if (!cancelled) setActivityEventsLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [selectedActivity]);

  const columns = useMemo(
    () => [
      { field: 'display_id', label: 'ID' },
      { field: 'product_name', label: 'Product' },
      { field: 'popularity_score', label: 'Pop.' },
      { field: 'impressions', label: 'Impr.' },
      { field: 'clicks', label: 'Clicks' },
      { field: 'views', label: 'Views' },
      { field: 'add_to_cart', label: 'ATC' },
      { field: 'purchases', label: 'Purch.' },
    ],
    []
  );

  const activityColumns = useMemo(() => {
    if (activityKind === 'visitors') {
      return [
        { field: 'visitor_id', label: 'Visitor ID' },
        { field: 'events', label: 'Events' },
        { field: 'views', label: 'Views' },
        { field: 'clicks', label: 'Clicks' },
        { field: 'last_activity', label: 'Last activity' },
      ];
    }
    return [
      { field: 'user_id', label: 'User ID' },
      { field: 'events', label: 'Events' },
      { field: 'views', label: 'Views' },
      { field: 'clicks', label: 'Clicks' },
      { field: 'last_activity', label: 'Last activity' },
    ];
  }, [activityKind]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="display-content-layout">
        <div className="display-content-header">
          <h2>Analytics</h2>
          <div className="toolbar">
            <div className="search-box" style={{ maxWidth: 360 }}>
              <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            </div>
            <div className="bulk-actions">
              <button
                type="button"
                className="button button-primary"
                onClick={recalcPopularity}
                disabled={recalcLoading}
              >
                {recalcLoading ? 'Recalculating…' : 'Recalculate popularity'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-container">
          <p>{error}</p>
        </div>
      )}

      <DisplayContentLayout
        title="Top products by events"
        columns={columns}
        data={topProducts}
        isLoading={loading}
      />

      <div className="display-content-layout">
        <div className="display-content-header">
          <h2>Top sources</h2>
        </div>
        <div className="table-container">
          {topSources.length === 0 ? (
            <div className="no-data-message">
              <p>No data available</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {topSources.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.source}</td>
                    <td>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="display-content-layout">
        <div className="display-content-header">
          <h2>User activities</h2>
          <div className="toolbar">
            <div className="bulk-actions">
              <select value={activityKind} onChange={(e) => setActivityKind(e.target.value)}>
                <option value="visitors">Visitors (not logged)</option>
                <option value="users">Users (logged)</option>
              </select>
            </div>
          </div>
        </div>
        {activityError && (
          <div className="error-container">
            <p>{activityError}</p>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16 }}>
        <DisplayContentLayout
          title={activityKind === 'visitors' ? 'Top visitors' : 'Top users'}
          columns={activityColumns}
          data={activityRows}
          isLoading={activityLoading}
          rowActions={[
            {
              label: 'View',
              value: 'view',
              className: '',
            },
          ]}
          onRowAction={(action, item) => {
            if (action !== 'view') return;
            if (activityKind === 'visitors') {
              setSelectedActivity({ kind: 'visitors', visitor_id: item.visitor_id });
            } else {
              setSelectedActivity({ kind: 'users', user_id: item.user_id });
            }
          }}
        />

        <div className="display-content-layout">
          <div className="display-content-header">
            <h2>Recent events</h2>
          </div>
          <div className="table-container">
            {!selectedActivity ? (
              <div className="no-data-message">
                <p>Select a row to see events</p>
              </div>
            ) : activityEventsLoading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Loading events...</p>
              </div>
            ) : activityEvents.length === 0 ? (
              <div className="no-data-message">
                <p>No events found</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Event</th>
                    <th>Source</th>
                    <th>Product</th>
                  </tr>
                </thead>
                <tbody>
                  {activityEvents.map((ev, idx) => (
                    <tr key={idx}>
                      <td>{ev.created_at ? new Date(ev.created_at).toLocaleString() : ''}</td>
                      <td>{ev.event_type}</td>
                      <td>{ev.source}</td>
                      <td>{ev.product_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

