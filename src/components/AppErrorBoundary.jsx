import { Component } from 'react';

/* Never a blank page (client final review: "the page is not loading in Chrome").
   A part of the site that cannot load — usually a tab still holding the previous
   deploy's files — or any crash shows this card with a Reload button instead. */
export default class AppErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('Nivorva could not show this page:', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <PageMessage title="This page didn’t load" body="Your connection dropped or the site was just updated. Reload to get the latest version." action />;
  }
}

/* Shared with the loading screen so both look like index.html's first paint. */
export function PageMessage({ title, body, action = false }) {
  return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#efeae1', fontFamily: 'Manrope, system-ui, sans-serif', padding: 16 }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <img src="/brand/nivorva-logo.png" alt="Nivorva" width="150" style={{ display: 'block', height: 'auto', margin: '0 auto' }} />
        <p style={{ margin: '18px 0 0', color: '#255849', fontSize: 14, fontWeight: 600 }}>{title}</p>
        {body && <p style={{ margin: '6px 0 0', color: '#5f716b', fontSize: 13, lineHeight: 1.5 }}>{body}</p>}
        {action && (
          <button type="button" onClick={() => window.location.reload()}
            style={{ marginTop: 16, height: 44, padding: '0 22px', border: 0, borderRadius: 12, background: '#1f5c4a', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Reload
          </button>
        )}
      </div>
    </div>
  );
}
