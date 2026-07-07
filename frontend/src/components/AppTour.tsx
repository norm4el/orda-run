import { useEffect, useState } from 'react';
import { Joyride, STATUS } from 'react-joyride';
import type { Step } from 'react-joyride';
import type { TabType } from './BottomNav';

type Props = {
  run: boolean;
  onFinish: () => void;
  setActiveTab: (tab: TabType) => void;
};

export function AppTour({ run, onFinish }: Props) {
  const [steps, setSteps] = useState<Step[]>([]);

  useEffect(() => {
    setSteps([
      {
        target: 'body',
        content: 'Добро пожаловать на карту! Сейчас я покажу, что здесь есть.',
        placement: 'center'
      },
      {
        target: '.top-user-info',
        content: 'Здесь ты можешь переключать видимость: смотреть свою территорию или территорию своей Орды.',
        placement: 'bottom'
      },
      {
        target: '.bottom-nav-btn:nth-child(5)', // Profile tab
        content: 'В профиле ты можешь вступить в Орду или создать свою, а также поменять цвет своей территории.',
        placement: 'top'
      },
      {
        target: '.bottom-nav-btn:nth-child(3)', // Quests tab
        content: 'Выполняй задания здесь каждый день, чтобы зарабатывать бонусные очки (XP) и быстрее расти в таблице лидеров!',
        placement: 'top'
      },
      {
        target: '.bottom-nav-btn:nth-child(2)', // Record tab
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
          showProgress: true,
          showSkipButton: true,
          spotlightClicks: true,
          disableOverlayClose: true,
          callback: handleJoyrideCallback,
          styles: {
            options: {
              primaryColor: '#d8a760',
              textColor: '#333',
              zIndex: 100000,
            },
            tooltipContainer: {
              textAlign: 'left',
            },
            buttonNext: {
              backgroundColor: '#d8a760',
            },
            buttonBack: {
              color: '#d8a760',
            }
          },
          locale: {
            back: 'Назад',
            close: 'Закрыть',
            last: 'Понятно',
            next: 'Далее',
            skip: 'Пропустить',
          }
        } as any}
      />
    </>
  );
}
