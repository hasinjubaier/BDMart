export default function HomePage() {
  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
        backgroundColor: '#f8f9ff',
        color: '#121c28',
        textAlign: 'center',
      }}
    >
      <header style={{ marginBottom: '2rem' }}>
        <h1
          style={{
            fontSize: '3rem',
            fontWeight: 800,
            color: '#153b5b',
            margin: '0 0 0.5rem 0',
            letterSpacing: '-0.02em',
          }}
        >
          BD Mart
        </h1>
        <p
          style={{
            fontSize: '1.25rem',
            color: '#16a36a',
            margin: 0,
            fontWeight: 600,
          }}
        >
          বাংলাদেশের বিশ্বস্ত মার্কেটপ্লেস (B2C + B2B)
        </p>
      </header>

      <section
        style={{
          maxWidth: '640px',
          backgroundColor: '#ffffff',
          padding: '2rem',
          borderRadius: '12px',
          border: '1px solid #e6e9ee',
          boxShadow: '0 1px 3px rgba(24, 34, 46, 0.05)',
        }}
      >
        <p style={{ margin: '0 0 1.5rem 0', lineHeight: 1.6, fontSize: '1.1rem' }}>
          স্বাগতম <strong>BD Mart</strong>-এ। পাইকারি (B2B) ও খুচরা (B2C) কেনাকাটার আধুনিক ই-কমার্স মার্কেটপ্লেস।
        </p>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: '#eef4ff',
            color: '#153b5b',
            padding: '0.6rem 1.25rem',
            borderRadius: '9999px',
            fontSize: '0.875rem',
            fontWeight: 600,
            border: '1px solid #cfe5ff',
          }}
        >
          <span>✓</span> Phase 0: Native Windows Setup Verified
        </div>
      </section>
    </main>
  );
}
