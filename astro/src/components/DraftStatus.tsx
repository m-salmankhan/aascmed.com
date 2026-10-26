import { useState } from 'react';

export default function DraftStatus({ initialTitle }: { initialTitle: string }) {
  const [visible, setVisible] = useState(true);
  if (!visible) return <p role="status">Draft preview hidden.</p>;
  return <aside style={{ position: 'fixed', right: 16, bottom: 16, padding: 16, maxWidth: 320, background: '#fff', border: '2px solid #006c70', borderRadius: 8 }}>
    <strong>Preview draft: {initialTitle}</strong>
    <button style={{ display: 'block', marginTop: 8 }} onClick={() => setVisible(false)}>Hide preview badge</button>
  </aside>;
}
