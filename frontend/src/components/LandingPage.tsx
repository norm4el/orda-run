import { useTranslation } from 'react-i18next';
export function LandingPage() {
  const { t } = useTranslation();
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      color: 'var(--text-main)',
      textAlign: 'center',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Decorative background elements */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '10%',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(216,167,96,0.15) 0%, rgba(0,0,0,0) 70%)', /* var(--primary) */
        filter: 'blur(40px)',
        zIndex: 0
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '10%',
        right: '10%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(44,90,90,0.2) 0%, rgba(0,0,0,0) 70%)', /* var(--secondary) */
        filter: 'blur(60px)',
        zIndex: 0
      }}></div>

      <div style={{
        zIndex: 1,
        background: 'var(--surface)',
        border: '1px solid rgba(216,167,96,0.2)', /* Subtle primary border */
        borderRadius: '30px',
        padding: '50px 30px',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
      }}>
        <div style={{
          fontSize: '70px',
          marginBottom: '20px',
          animation: 'float 3s ease-in-out infinite',
          filter: 'drop-shadow(0 10px 15px rgba(216,167,96,0.3))'
        }}>
          🏃‍♂️
        </div>
        <h1 style={{
          fontSize: '42px',
          fontWeight: '900',
          marginBottom: '16px',
          background: 'linear-gradient(90deg, #d8a760, #ffdd99)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-1px'
        }}>
          ORDA RUN
        </h1>
        <p style={{
          fontSize: '18px',
          color: 'var(--text-dim)',
          lineHeight: '1.6',
          marginBottom: '40px'
        }}>
          Первая в мире игра, где твои пробежки захватывают реальные территории. 
          Создай свою Орду, соревнуйся с соседями и стань легендой города!
        </p>

        <a 
          href="https://t.me/ordarunbot" 
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            background: 'var(--primary)',
            color: '#000',
            textDecoration: 'none',
            padding: '18px 32px',
            borderRadius: '100px',
            fontSize: '18px',
            fontWeight: 'bold',
            boxShadow: '0 10px 25px rgba(216,167,96,0.3)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            marginBottom: '30px',
            width: '100%',
            boxSizing: 'border-box'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 15px 30px rgba(216,167,96,0.5)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 25px rgba(216,167,96,0.3)';
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.07-.05-.17-.03-.25-.01-.11.02-1.81 1.15-5.11 3.38-.48.33-.92.49-1.31.48-.43-.01-1.25-.24-1.86-.44-.75-.24-1.34-.37-1.29-.79.03-.22.33-.44.92-.68 3.58-1.56 5.96-2.58 7.15-3.08 3.4-1.42 4.11-1.67 4.57-1.68.1 0 .32.02.46.12.11.08.14.2.16.28.02.1.03.3.01.44z"/>
          </svg>
          Играть в Telegram
        </a>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
          <a href="https://t.me/ordarun" target="_blank" rel="noopener noreferrer" style={socialLinkStyle}>
            📢 Новости
          </a>
          <a href="https://instagram.com/orda_run" target="_blank" rel="noopener noreferrer" style={socialLinkStyle}>
            📸 Instagram
          </a>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
          100% { transform: translateY(0px); }
        }
      `}</style>
    </div>
  );
}

const socialLinkStyle = {
  color: 'var(--text-main)',
  textDecoration: 'none',
  fontSize: '14px',
  fontWeight: '500',
  padding: '10px 20px',
  background: 'rgba(255,255,255,0.05)',
  borderRadius: '20px',
  transition: 'all 0.2s',
  border: '1px solid rgba(255,255,255,0.05)'
};
