const fs = require('fs');

const cssToAdd = `
/* --- Browser Provider Pill Toggle --- */
.browser-provider-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 24px 16px;
}

.browser-provider-label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 1px;
}

.provider-pill-group {
  display: flex;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 4px;
  gap: 4px;
}

.provider-pill {
  background: transparent;
  color: var(--text-muted);
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.provider-pill:hover {
  color: white;
  background: rgba(255, 255, 255, 0.05);
}

.provider-pill.active {
  background: var(--accent-green);
  color: white;
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
}

.provider-pill svg {
  flex-shrink: 0;
}

/* --- Trending Modpacks Grid --- */
.trending-modpacks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.trending-mp-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
}

.trending-mp-card:hover {
  transform: translateY(-4px);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
  background: rgba(255, 255, 255, 0.04);
}

.trending-mp-thumb {
  width: 100%;
  height: 140px;
  background-size: cover;
  background-position: center;
  background-color: rgba(0, 0, 0, 0.5);
  border-bottom: 1px solid var(--border-color);
}

.trending-mp-info {
  padding: 16px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.trending-mp-info strong {
  font-family: var(--font-title);
  font-size: 16px;
  margin-bottom: 6px;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.trending-mp-info p {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 12px;
  flex: 1;
}

.trending-mp-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 600;
  flex-wrap: wrap;
}

.trending-mp-tag {
  background: rgba(255, 255, 255, 0.08);
  padding: 2px 8px;
  border-radius: 6px;
  color: white;
  font-size: 11px;
}
`;

fs.appendFileSync('src/style.css', cssToAdd, 'utf8');
console.log('CSS appended');
