import React, { useState, useEffect } from 'react';
import { linksApi } from '../utils/api.js';
import './Links.css';

const SOURCE_OPTIONS = [
  'Website', 'LinkedIn', 'Instagram', 'YouTube', 'Facebook',
  'X (Twitter)', 'GitHub', 'GitLab', 'TikTok', 'Discord',
  'Telegram', 'WhatsApp', 'Medium', 'Behance', 'Dribbble',
  'Pinterest', 'Reddit', 'Email', 'Other'
];

const SOURCE_META = {
  Website:       { emoji: '🌐', color: 'var(--blue)' },
  LinkedIn:      { emoji: '💼', color: '#0a66c2' },
  Instagram:     { emoji: '📸', color: '#e1306c' },
  YouTube:       { emoji: '🎥', color: '#ff0000' },
  Facebook:      { emoji: '👥', color: '#1877f2' },
  'X (Twitter)': { emoji: '𝕏',  color: '#ffffff' },
  GitHub:        { emoji: '💻', color: 'var(--text-1)' },
  GitLab:        { emoji: '🦊', color: '#fc6d26' },
  TikTok:        { emoji: '🎵', color: '#010101' },
  Discord:       { emoji: '💬', color: '#5865f2' },
  Telegram:      { emoji: '✈️', color: '#24a1de' },
  WhatsApp:      { emoji: '🟢', color: '#25d366' },
  Medium:        { emoji: '✍️', color: '#ffffff' },
  Behance:       { emoji: '🎨', color: '#1769ff' },
  Dribbble:      { emoji: '🏀', color: '#ea4c89' },
  Pinterest:     { emoji: '📌', color: '#bd081c' },
  Reddit:        { emoji: '🤖', color: '#ff4500' },
  Email:         { emoji: '✉️', color: '#ea4335' },
  Other:         { emoji: '🔗', color: 'var(--violet)' },
};

function getDomain(urlStr) {
  try {
    let cleanUrl = urlStr.trim();
    if (cleanUrl.toLowerCase().startsWith('email:')) return null;
    if (cleanUrl.includes('@') && !cleanUrl.startsWith('http')) return null;
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = 'https://' + cleanUrl;
    }
    const urlObj = new URL(cleanUrl);
    // Remove www.
    return urlObj.hostname.replace(/^www\./i, '');
  } catch (e) {
    return null;
  }
}

// ── Link Modal Form ────────────────────────────────────────────────────────
function LinkModal({ link, onSave, onCancel }) {
  const [name, setName] = useState(link?.name || '');
  const [source, setSource] = useState(link?.source || 'Website');
  const [customSource, setCustomSource] = useState(link?.customSource || '');
  const [url, setUrl] = useState(link?.url || '');
  const [about, setAbout] = useState(link?.about || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Link Name is required');
      return;
    }
    if (!url.trim()) {
      setError('URL is required');
      return;
    }
    if (source === 'Other' && !customSource.trim()) {
      setError('Custom Source Name is required when "Other" is selected');
      return;
    }

    setSaving(true);
    const body = {
      name: name.trim(),
      source,
      customSource: source === 'Other' ? customSource.trim() : '',
      url: url.trim(),
      about: about.trim(),
    };

    try {
      if (link?._id) {
        await linksApi.update(link._id, body);
      } else {
        await linksApi.create(body);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save link');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="link-modal-overlay">
      <div className="link-modal-card">
        <h2>{link ? '📝 Edit Link' : '🔗 Add New Link'}</h2>
        {error && <div className="link-modal-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Link Name *</label>
            <input
              type="text"
              placeholder="e.g. My GitHub Profile, Personal Blog"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group flex-1">
              <label>Source *</label>
              <select value={source} onChange={(e) => setSource(e.target.value)}>
                {SOURCE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {SOURCE_META[opt]?.emoji || '🔗'} {opt}
                  </option>
                ))}
              </select>
            </div>

            {source === 'Other' && (
              <div className="form-group flex-1">
                <label>Custom Source Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Threads, Slack"
                  value={customSource}
                  onChange={(e) => setCustomSource(e.target.value)}
                  required
                />
              </div>
            )}
          </div>

          <div className="form-group">
            <label>URL *</label>
            <input
              type="text"
              placeholder="e.g. github.com/user, user@example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>About Link (Optional)</label>
            <textarea
              placeholder="Brief notes about this bookmark..."
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              rows={3}
            />
          </div>

          <div className="link-modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : link ? '✓ Update Link' : '✓ Save Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page Component ───────────────────────────────────────────────────
export default function Links() {
  const [links, setLinks] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(null);

  const loadLinks = async () => {
    try {
      setLoading(true);
      const res = await linksApi.getAll({ search });
      setLinks(res.data);
    } catch (e) {
      console.error('Failed to load links:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      loadLinks();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [search]);

  const handleOpenLink = (urlStr) => {
    let cleanUrl = urlStr.trim();
    if (cleanUrl.toLowerCase().startsWith('email:') || (cleanUrl.includes('@') && !cleanUrl.startsWith('http'))) {
      if (cleanUrl.toLowerCase().startsWith('email:')) {
        window.open(`mailto:${cleanUrl.slice(6)}`, '_blank');
        return;
      }
      if (!cleanUrl.toLowerCase().startsWith('mailto:')) {
        window.open(`mailto:${cleanUrl}`, '_blank');
        return;
      }
    }
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = 'https://' + cleanUrl;
    }
    window.open(cleanUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this link?')) return;
    try {
      await linksApi.delete(id);
      loadLinks();
    } catch (e) {
      alert('Failed to delete link');
    }
  };

  return (
    <div className="links-page">
      {/* Header */}
      <div className="links-header">
        <div>
          <h1>Links</h1>
          <p>{links.length} saved link{links.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingLink(null); setModalOpen(true); }}>
          + Add Link
        </button>
      </div>

      {/* Control bar */}
      <div className="links-controls">
        <div className="links-search-wrap">
          <span className="links-search-icon">🔍</span>
          <input
            className="links-search"
            placeholder="Search by name, source, URL, or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && <button className="links-search-clear" onClick={() => setSearch('')}>✕</button>}
        </div>
      </div>

      {/* Grid Content */}
      {loading ? (
        <div className="links-loading"><div className="spinner" /></div>
      ) : links.length === 0 ? (
        <div className="links-empty">
          <div className="links-empty-icon">🔗</div>
          <h3>{search ? 'No matching links found' : 'No links saved yet'}</h3>
          <p>{search ? 'Try adjusting your search criteria.' : 'Organize your digital universe. Add your first link now!'}</p>
          {!search && (
            <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => { setEditingLink(null); setModalOpen(true); }}>
              + Add First Link
            </button>
          )}
        </div>
      ) : (
        <div className="links-grid">
          {links.map((item) => {
            const meta = SOURCE_META[item.source] || SOURCE_META.Other;
            const displaySource = item.source === 'Other' ? (item.customSource || 'Other') : item.source;
            const domain = getDomain(item.url);
            const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null;

            return (
              <div
                key={item._id}
                className="link-card"
                style={{ '--accent-color': meta.color }}
                onClick={() => handleOpenLink(item.url)}
              >
                <div className="link-card-glow" />
                
                <div className="link-card-header">
                  <div className="link-source-icon-wrap" style={{ borderColor: meta.color + '33' }}>
                    {faviconUrl ? (
                      <img
                        src={faviconUrl}
                        alt=""
                        className="link-favicon"
                        onError={(e) => {
                          // Hide image and show fallback emoji
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : null}
                    <span className="link-fallback-emoji">{meta.emoji}</span>
                  </div>

                  <span className="link-source-badge" style={{ color: meta.color, backgroundColor: meta.color + '12' }}>
                    {displaySource}
                  </span>
                </div>

                <div className="link-card-body">
                  <h3 className="link-name" title={item.name}>{item.name}</h3>
                  <div className="link-url-text" title={item.url}>{item.url}</div>
                  {item.about && <p className="link-about">{item.about}</p>}
                </div>

                <div className="link-card-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="link-action-btn edit"
                    onClick={() => { setEditingLink(item); setModalOpen(true); }}
                    title="Edit Link"
                  >
                    ✏️
                  </button>
                  <button
                    className="link-action-btn delete"
                    onClick={() => handleDelete(item._id)}
                    title="Delete Link"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Render */}
      {modalOpen && (
        <LinkModal
          link={editingLink}
          onSave={() => { setModalOpen(false); setEditingLink(null); loadLinks(); }}
          onCancel={() => { setModalOpen(false); setEditingLink(null); }}
        />
      )}
    </div>
  );
}
