import { useEffect, useState } from 'react';
import { Joyride, STATUS } from 'react-joyride';
import type { Step, TooltipRenderProps } from 'react-joyride';
import type { TabType } from './BottomNav';

type Props = {
  run: boolean;
  onFinish: () => void;
  setActiveTab: (tab: TabType) => void;
};

function CustomTooltip({
  index,
  step,
  primaryProps,
  isLastStep,
}: TooltipRenderProps) {
  return (
    <div style={{
      background: 'rgba(30, 41, 59, 0.95)',
      border: '1px solid #d8a760',
      borderRadius: '24px',
      padding: '30px 20px',
      maxWidth: '350px',
      width: '100%',
      textAlign: 'center',
      boxShadow: '0 0 40px rgba(216, 167, 96, 0.3)',
      boxSizing: 'border-box'
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
        {index + 1}
      </div>
      
      {step.title && (
        <h2 style={{ color: '#fff', fontSize: '20px', marginBottom: '12px', fontWeight: 'bold' }}>
          {step.title}
        </h2>
      )}
      
      <p style={{ color: '#a0aec0', fontSize: '15px', lineHeight: '1.5', marginBottom: '24px' }}>
        {step.content}
      </p>

      <button
        {...primaryProps}
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
        {isLastStep ? 'Понятно' : 'Далее'}
      </button>
    </div>
  );
}

export function AppTour({ run, onFinish }: Props) {
  const [steps, setSteps] = useState<Step[]>([]);

  useEffect(() => {
    setSteps([
      {
        target: 'body',
        title: 'Добро пожаловать!',
        content: 'Сейчас я покажу, что здесь есть.',
        placement: 'center'
      },
      {
        target: '.top-user-info',
        title: 'Твоя Территория',
        content: 'Здесь ты можешь переключать видимость: смотреть свою территорию или территорию своей Орды.',
        placement: 'bottom'
      },
      {
        target: '.bottom-nav-btn:nth-child(5)', // Profile tab
        title: 'Профиль',
        content: 'В профиле ты можешь вступить в Орду или создать свою, а также поменять цвет своей территории.',
        placement: 'top'
      },
      {
        target: '.bottom-nav-btn:nth-child(3)', // Quests tab
        title: 'Задания',
        content: 'Выполняй задания здесь каждый день, чтобы зарабатывать бонусные очки (XP) и быстрее расти в таблице лидеров!',
        placement: 'top'
      },
      {
        target: '.bottom-nav-btn:nth-child(2)', // Record tab
        title: 'Начать пробежку',
        content: 'А здесь начинается самое главное — запись пробежки. Нажми старт и захватывай улицы!',
        placement: 'top'
      }
    ]);
  }, []);

  const handleJoyrideCallback = (data: any) => {
    const { status } = data;
    
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      onFinish();
    }
  };

  return (
    <>
      <style>{`
        .__floater__open, .__floater {
          z-index: 100000 !important;
        }
        .react-joyride__overlay {
          z-index: 99999 !important;
        }
        .react-joyride__spotlight {
          z-index: 99999 !important;
        }
        .react-joyride__tooltip {
          z-index: 100000 !important;
        }
      `}</style>
      <Joyride
        {...{
          steps,
          run,
          continuous: true,
          scrollToFirstStep: true,
          showProgress: false,
          showSkipButton: false,
          spotlightClicks: true,
          disableOverlayClose: true,
          callback: handleJoyrideCallback,
          tooltipComponent: CustomTooltip,
        } as any}
      />
    </>
  );
}
