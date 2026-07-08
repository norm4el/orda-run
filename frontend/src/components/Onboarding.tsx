import { useState } from 'react';
import { useTranslation } from 'react-i18next';

type Props = {
  onComplete: () => void;
};

export function Onboarding({ onComplete }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);

  const slides = [
    {
      title: t('onb_w'),
      description: t('onb_d1'),
      color: '#d8a760'
    },
    {
      title: t('onb_t2'),
      description: t('onb_d2'),
      color: '#22c55e'
    },
    {
      title: t('onb_t3'),
      description: t('onb_d3'),
      color: '#ef4444'
    }
  ];

  const currentSlide = slides[step];

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(10px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'rgba(30, 41, 59, 0.9)',
        border: `1px solid ${currentSlide.color}`,
        borderRadius: '24px',
        padding: '30px 20px',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center',
        boxShadow: `0 0 40px ${currentSlide.color}40`,
        transition: 'all 0.3s ease'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '30px',
          background: `${currentSlide.color}20`,
          color: currentSlide.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          margin: '0 auto 20px',
          border: `2px solid ${currentSlide.color}`
        }}>
          {step + 1}
        </div>
        
        <h2 style={{ color: '#fff', fontSize: '24px', marginBottom: '16px', fontWeight: 'bold' }}>
          {currentSlide.title}
        </h2>
        
        <p style={{ color: '#a0aec0', fontSize: '16px', lineHeight: '1.6', marginBottom: '30px' }}>
          {currentSlide.description}
        </p>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '30px' }}>
          {slides.map((_, i) => (
            <div key={i} style={{
              width: i === step ? '24px' : '8px',
              height: '8px',
              borderRadius: '4px',
              background: i === step ? currentSlide.color : 'rgba(255,255,255,0.2)',
              transition: 'all 0.3s'
            }} />
          ))}
        </div>

        <button
          onClick={() => {
            if (step < slides.length - 1) {
              setStep(s => s + 1);
            } else {
              onComplete();
            }
          }}
          style={{
            background: currentSlide.color,
            color: '#000',
            border: 'none',
            padding: '16px 32px',
            borderRadius: '30px',
            fontSize: '18px',
            fontWeight: 'bold',
            width: '100%',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}
        >
          {step < slides.length - 1 ? 'Далее' : t('onb_start')}
        </button>
      </div>
    </div>
  );
}
