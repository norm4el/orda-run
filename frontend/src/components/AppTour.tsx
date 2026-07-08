import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import type { TabType } from './BottomNav';

type Props = {
  run: boolean;
  onFinish: () => void;
  setActiveTab: (tab: TabType) => void;
};

export function AppTour({ run, onFinish }: Props) {
  const { t } = useTranslation();
  const [stepIndex, setStepIndex] = useState(0);

  if (!run) return null;

  const steps = [
    {
      title: 'Добро пожаловать!',
      content: 'Сейчас я покажу, что здесь есть.',
      position: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    },
    {
      title: 'Твоя Территория',
      content: 'Сверху ты можешь переключать видимость: смотреть свою территорию или территорию своей Орды.',
      position: { top: '100px', left: '50%', transform: 'translateX(-50%)' }
    },
    {
      title: 'Профиль',
      content: 'В профиле (справа внизу) ты можешь вступить в Орду или создать свою, а также поменять цвет своей территории.',
      position: { bottom: '100px', right: '16px' }
    },
    {
      title: 'Задания',
      content: 'Выполняй задания (в центре внизу) каждый день, чтобы зарабатывать бонусные очки (XP) и быстрее расти в таблице лидеров!',
      position: { bottom: '100px', left: '50%', transform: 'translateX(-50%)' }
    },
    {
      title: 'Начать пробежку',
      content: 'А здесь начинается самое главное — запись пробежки. Нажми старт (вторая кнопка слева) и захватывай улицы!',
      position: { bottom: '100px', left: '16px' }
    }
  ];

  const currentStep = steps[stepIndex];
  if (!currentStep) return null;

  const handleNext = () => {
    if (stepIndex === steps.length - 1) {
      onFinish();
    } else {
      setStepIndex(s => s + 1);
    }
  };

  return (
    <>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99998,
        background: 'transparent',
        pointerEvents: 'none' // Allow clicking through if needed, but we want to force them to click Next? No, let them click it.
      }} />
      <div style={{
        position: 'fixed',
        zIndex: 99999,
        background: 'rgba(30, 41, 59, 0.95)',
        border: '1px solid #d8a760',
        borderRadius: '24px',
        padding: '30px 20px',
        width: '90%',
        maxWidth: '350px',
        textAlign: 'center',
        boxShadow: '0 0 40px rgba(216, 167, 96, 0.3)',
        boxSizing: 'border-box',
        transition: 'all 0.3s ease-in-out',
        ...currentStep.position
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          borderRadius: '25px',
          background: 'rgba(216, 167, 96, 0.1)',
          color: '#d8a760',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          margin: '0 auto 16px',
          border: '2px solid #d8a760'
        }}>
          {stepIndex + 1}
        </div>
        
        {currentStep.title && (
          <h2 style={{ color: '#fff', fontSize: '20px', marginBottom: '12px', fontWeight: 'bold' }}>
            {currentStep.title}
          </h2>
        )}
        
        <p style={{ color: '#a0aec0', fontSize: '15px', lineHeight: '1.5', marginBottom: '24px' }}>
          {currentStep.content}
        </p>

        <button
          onClick={handleNext}
          style={{
            background: '#d8a760',
            color: '#000',
            border: 'none',
            padding: '14px 28px',
            borderRadius: '30px',
            fontSize: '16px',
            fontWeight: 'bold',
            width: '100%',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}
        >
          {stepIndex === steps.length - 1 ? 'Понятно' : 'Далее'}
        </button>
      </div>
    </>
  );
}
