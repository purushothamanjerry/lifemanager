// ─── Central link helpers ───────────────────────────────────────────────
// All cross-app navigation goes through here so links stay consistent.

export const link = {
  person:       (id)       => `/relationships/${id}`,
  relationships:(filter)   => filter ? `/relationships?type=${filter}` : `/relationships`,
  memories:     (params={})=> {
    const q = new URLSearchParams(params).toString();
    return `/memories${q ? `?${q}` : ''}`;
  },
  notes:        (params={})=> {
    const q = new URLSearchParams(params).toString();
    return `/notes${q ? `?${q}` : ''}`;
  },
  memoryTag:    (tag)      => `/memories?tag=${encodeURIComponent(tag)}`,
  noteTag:      (tag)      => `/notes?tag=${encodeURIComponent(tag)}`,
  personMemories:(id)      => `/memories?person=${id}`,
  personNotes:  (id)       => `/notes?person=${id}`,
  plans:        (date)     => date ? `/plans?date=${date}` : `/plans`,
  plansToday:   ()         => `/plans`,
};