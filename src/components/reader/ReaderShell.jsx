export function ReaderShell({ children }) {
  return <div className="reader-shell">{children}</div>;
}

export function ReaderStatusBar({ children }) {
  return <div className="status-bar">{children}</div>;
}


export function ReaderMainLayout({ children }) {
  return <div className="main-layout">{children}</div>;
}

export function ReaderSidebar({ open, children }) {
  return <aside className={`sidebar ${open ? '' : 'collapsed'}`}>{children}</aside>;
}

export function ReaderViewport({ children }) {
  return <div className="reader-area">{children}</div>;
}
