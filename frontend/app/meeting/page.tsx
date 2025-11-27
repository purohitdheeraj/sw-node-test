'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function MeetingPage() {
  const [timeOpened, setTimeOpened] = useState('');

  useEffect(() => {
    setTimeOpened(new Date().toLocaleTimeString());
  }, []);

  return (
    <main className="container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
      <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🎉</div>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--success)' }}>
          You Made It!
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
          This page was opened from clicking the push notification.
          <br />
          The notification worked even with the tab closed!
        </p>
        
        <div style={{ 
          background: 'var(--bg-primary)', 
          padding: '1rem', 
          borderRadius: '8px',
          marginBottom: '1.5rem'
        }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Page opened at</div>
          <div style={{ 
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '1.5rem',
            color: 'var(--accent)',
            marginTop: '0.5rem'
          }}>
            {timeOpened || '...'}
          </div>
        </div>

        <div style={{ 
          padding: '1rem',
          background: 'rgba(99, 102, 241, 0.1)',
          borderRadius: '8px',
          borderLeft: '3px solid var(--accent)',
          textAlign: 'left',
          marginBottom: '1.5rem'
        }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
            ✨ In a real app, this would be your meeting room or video call page.
            The push notification brought you here!
          </p>
        </div>

        <Link href="/" className="btn btn-primary" style={{ textDecoration: 'none' }}>
          ← Back to Home
        </Link>
      </div>
    </main>
  );
}

