import React, { useState, useEffect } from 'react';
import { peopleApi, getImageUrl } from '../../utils/api.js';
import './ManageCirclesModal.css';

function getInitials(n) {
  return n.split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2);
}

function getCircleEmoji(name) {
  if (!name) return '📁';
  const n = name.toLowerCase();
  if (n.includes('college') || n.includes('school') || n.includes('univ')) return '🎓';
  if (n.includes('work') || n.includes('company') || n.includes('office') || n.includes('job') || n.includes('corp') || n.includes('colleague')) return '💼';
  if (n.includes('gym') || n.includes('workout') || n.includes('fitness') || n.includes('sport')) return '💪';
  if (n.includes('family') || n.includes('home') || n.includes('relative')) return '🏠';
  if (n.includes('course') || n.includes('class') || n.includes('learn') || n.includes('stud')) return '📚';
  if (n.includes('friend')) return '👫';
  return '📁';
}

export default function ManageCirclesModal({ people = [], onClose, onSaved }) {
  const [groupName, setGroupName] = useState('');
  const [selectedPeople, setSelectedPeople] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [hideAssigned, setHideAssigned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Extract unique existing groups
  const existingGroups = Array.from(new Set(people.map(p => p.group).filter(Boolean)))
    .filter(g => g.toLowerCase() !== 'general');

  // When groupName changes, if it matches an existing group, auto-check members in that group
  useEffect(() => {
    const trimmed = groupName.trim();
    if (!trimmed) {
      setSelectedPeople(new Set());
      return;
    }
    const matchingPeople = people.filter(p => (p.group || 'General').toLowerCase() === trimmed.toLowerCase());
    setSelectedPeople(new Set(matchingPeople.map(p => p._id)));
  }, [groupName, people]);

  const handleChipClick = (name) => {
    const trimmed = groupName.trim();
    if (trimmed.toLowerCase() === name.toLowerCase()) {
      setGroupName('');
    } else {
      setGroupName(name);
    }
  };

  const handleTogglePerson = (id) => {
    setSelectedPeople(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllFiltered = (filteredIds) => {
    setSelectedPeople(prev => {
      const next = new Set(prev);
      filteredIds.forEach(id => next.add(id));
      return next;
    });
  };

  const handleClearAllFiltered = (filteredIds) => {
    setSelectedPeople(prev => {
      const next = new Set(prev);
      filteredIds.forEach(id => next.delete(id));
      return next;
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const name = groupName.trim();
    if (!name) {
      setError('Please enter or select a circle name');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await peopleApi.bulkGroup({
        group: name,
        personIds: Array.from(selectedPeople)
      });
      onSaved();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to update circle');
    } finally {
      setSaving(false);
    }
  };

  const trimmedGroup = groupName.trim().toLowerCase();
  const filteredPeople = people.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (hideAssigned) {
      const pGroup = (p.group || 'General').toLowerCase();
      if (pGroup !== 'general' && pGroup !== trimmedGroup) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="mcm-overlay" onClick={onClose}>
      <div className="mcm-modal" onClick={e => e.stopPropagation()}>
        <div className="mcm-header">
          <h2>⚙️ Manage Circles</h2>
          <button className="mcm-close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSave} className="mcm-form">
          {error && <div className="mcm-error">{error}</div>}

          <div className="mcm-field">
            <label>Circle / Group Name</label>
            <input
              type="text"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder="e.g. College, Work, Gym, Family"
              list="modal-existing-groups"
              autoFocus
              className="mcm-input"
            />
            <datalist id="modal-existing-groups">
              {existingGroups.map(g => (
                <option key={g} value={g} />
              ))}
            </datalist>
            {existingGroups.length > 0 && (
              <div className="mcm-existing-chips">
                <span className="mcm-chips-label">Existing:</span>
                {existingGroups.map(g => {
                  const isActive = groupName.trim().toLowerCase() === g.toLowerCase();
                  return (
                    <button
                      type="button"
                      key={g}
                      className={`mcm-chip-btn ${isActive ? 'active' : ''}`}
                      onClick={() => handleChipClick(g)}
                    >
                      {getCircleEmoji(g)} {g}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="mcm-hint">
              Type a new circle name or select an existing one. Checking people will add them to this circle, and unchecking will return them to General.
            </p>
          </div>

          <div className="mcm-divider" />

          <div className="mcm-people-section">
            <div className="mcm-people-header">
              <label>Select Members ({selectedPeople.size} selected)</label>
              <div className="mcm-search-wrap">
                <span className="mcm-search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search people..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="mcm-search-input"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="mcm-search-clear"
                    onClick={() => setSearchQuery('')}
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="mcm-filter-options">
              <label className="mcm-checkbox-label">
                <input
                  type="checkbox"
                  checked={hideAssigned}
                  onChange={e => setHideAssigned(e.target.checked)}
                  className="mcm-filter-checkbox"
                />
                Hide members already in other groups
              </label>
            </div>

            {filteredPeople.length > 0 && (
              <div className="mcm-bulk-btns">
                <button type="button" onClick={() => handleSelectAllFiltered(filteredPeople.map(p => p._id))}>
                  Select All Matches
                </button>
                <button type="button" onClick={() => handleClearAllFiltered(filteredPeople.map(p => p._id))}>
                  Clear All Matches
                </button>
              </div>
            )}

            <div className="mcm-people-list">
              {filteredPeople.length === 0 ? (
                <div className="mcm-empty-people">No matching people found</div>
              ) : (
                filteredPeople.map(p => {
                  const isChecked = selectedPeople.has(p._id);
                  const isCurrentlyInThisGroup = p.group && p.group.toLowerCase() === groupName.trim().toLowerCase();
                  return (
                    <div 
                      key={p._id} 
                      className={`mcm-person-item ${isChecked ? 'selected' : ''}`}
                      onClick={() => handleTogglePerson(p._id)}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by row onClick
                        className="mcm-checkbox"
                      />
                      <div className="mcm-avatar">
                        {p.profilePhoto 
                          ? <img src={getImageUrl(p.profilePhoto)} alt={p.name} />
                          : <span>{getInitials(p.name)}</span>}
                      </div>
                      <div className="mcm-person-info">
                        <span className="mcm-person-name">{p.name}</span>
                        {p.group && p.group.toLowerCase() !== 'general' && (
                          <span className={`mcm-person-tag ${isCurrentlyInThisGroup ? 'current' : ''}`}>
                            {p.group}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mcm-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
