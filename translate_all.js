const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend', 'src');

const replaceInFile = (filename, replacements) => {
  const filePath = path.join(srcDir, filename);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  for (const [search, replace] of replacements) {
    if (content.includes(search)) {
      content = content.replaceAll(search, replace);
      changed = true;
    }
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${filename}`);
  }
};

// 1. App.tsx
replaceInFile('App.tsx', [
  ["import { useEffect, useState, useCallback } from 'react';", "import { useEffect, useState, useCallback } from 'react';\nimport { useTranslation } from 'react-i18next';"],
  ["function App() {", "function App() {\n  const { t } = useTranslation();"],
  ["'ЗАКРЫТЬ МАРШРУТ'", "t('close_route')"],
  ["'Без имени'", "t('no_name')"],
  ["'Орда'", "t('orda')"],
  ["'Личный'", "t('personal')"],
  ["'Площадь плана'", "t('plan_area')"],
  ["'Нет орды'", "t('no_orda')"],
  ["'Твоя площадь'", "t('your_area')"],
  ["'Отмена'", "t('cancel')"],
  ["'План'", "t('plan')"],
  ["ЗАКРЫТЬ МАРШРУТ", "{t('close_route')}"]
]);

// 2. ActivityFeed.tsx
replaceInFile('components/ActivityFeed.tsx', [
  ["import { useEffect, useState } from 'react';", "import { useEffect, useState } from 'react';\nimport { useTranslation } from 'react-i18next';"],
  ["export function ActivityFeed({ onUserClick }: Props) {", "export function ActivityFeed({ onUserClick }: Props) {\n  const { t } = useTranslation();"],
  [">Активность<", ">{t('activity')}<"],
  [">Пока нет активности<", ">{t('no_activity')}<"]
]);

// 3. AppTour.tsx
replaceInFile('components/AppTour.tsx', [
  ["import { useState } from 'react';", "import { useState } from 'react';\nimport { useTranslation } from 'react-i18next';"],
  ["export function AppTour({ run, onFinish }: Props) {", "export function AppTour({ run, onFinish }: Props) {\n  const { t } = useTranslation();"],
  ["'Добро пожаловать!'", "t('tour_welcome')"],
  ["'Сейчас я покажу, что здесь есть.'", "t('tour_welcome_desc')"],
  ["'Твоя Территория'", "t('tour_map')"],
  ["'Сверху ты можешь переключать видимость: смотреть свою территорию или территорию своей Орды.'", "t('tour_map_desc')"],
  ["'Профиль'", "t('tour_profile')"],
  ["'В профиле (справа внизу) ты можешь вступить в Орду или создать свою, а также поменять цвет своей территории.'", "t('tour_profile_desc')"],
  ["'Задания'", "t('quests')"],
  ["'Выполняй задания (в центре внизу) каждый день, чтобы зарабатывать бонусные очки (XP) и быстрее расти в таблице лидеров!'", "t('tour_quests_desc')"],
  ["'Начать пробежку'", "t('tour_record')"],
  ["'А здесь начинается самое главное — запись пробежки. Нажми старт (вторая кнопка слева) и захватывай улицы!'", "t('tour_record_desc')"],
  ["'Понятно'", "t('got_it')"],
  ["'Далее'", "t('tour_next')"]
]);

// 4. HistoryModal.tsx
replaceInFile('components/HistoryModal.tsx', [
  ["import { useEffect, useState } from 'react';", "import { useEffect, useState } from 'react';\nimport { useTranslation } from 'react-i18next';"],
  ["export function HistoryModal({ currentUser, onClose, onShowRouteOnMap }: Props) {", "export function HistoryModal({ currentUser, onClose, onShowRouteOnMap }: Props) {\n  const { t } = useTranslation();"],
  [">История пробежек<", ">{t('your_runs')}<"],
  [">Вы еще не совершили ни одной пробежки.<", ">{t('no_runs')}<"],
  [">На карте<", ">{t('show')}<"]
]);

// 5. LandingPage.tsx
replaceInFile('components/LandingPage.tsx', [
  ["export function LandingPage() {", "import { useTranslation } from 'react-i18next';\n\nexport function LandingPage() {\n  const { t } = useTranslation();"],
  [">ИГРАЙ В ДВИЖЕНИИ<", ">{t('landing_title')}<"],
  [">Orda Run — это фитнес-игра, где ваши реальные пробежки захватывают территории на карте. Объединяйтесь в Орды, соревнуйтесь с другими и станьте властелином города.<", ">{t('landing_desc')}<"],
  [">ОТКРЫТЬ В TELEGRAM<", ">{t('landing_open_tg')}<"],
  [">Что вас ждет:<", ">{t('landing_features')}<"],
  [">Захват территорий<", ">{t('landing_f1')}<"],
  [">Каждая ваша пробежка обводит новую территорию на реальной карте.<", ">{t('landing_f1_desc')}<"],
  [">Орды<", ">{t('landing_f2')}<"],
  [">Создавайте кланы с друзьями, чтобы вместе закрашивать районы в ваши цвета.<", ">{t('landing_f2_desc')}<"],
  [">Интеграция со Strava<", ">{t('landing_f3')}<"],
  [">Подключите свой аккаунт, и ваши пробежки будут автоматически переноситься в игру.<", ">{t('landing_f3_desc')}<"],
  [">© 2026 Orda Run. Все права защищены.<", ">{t('landing_footer')}<"],
  [">Политика конфиденциальности<", ">{t('landing_privacy')}<"],
  [">Условия использования<", ">{t('landing_terms')}<"]
]);

// 6. LeaderboardTab.tsx
replaceInFile('components/LeaderboardTab.tsx', [
  ["import { useState, useEffect } from 'react';", "import { useState, useEffect } from 'react';\nimport { useTranslation } from 'react-i18next';"],
  ["export function LeaderboardTab({ currentUser, onUserClick }: Props) {", "export function LeaderboardTab({ currentUser, onUserClick }: Props) {\n  const { t } = useTranslation();"],
  [">Лидерборд<", ">{t('leaderboard')}<"],
  [">РЕЙТИНГ ПО ПЛОЩАДИ<", ">{t('rank_by_area')}<"],
  [">Вы пока не захватили территорию<", ">{t('no_territory_yet')}<"]
]);

// 7. Onboarding.tsx
replaceInFile('components/Onboarding.tsx', [
  ["export function Onboarding({ onComplete }: Props) {", "import { useTranslation } from 'react-i18next';\n\nexport function Onboarding({ onComplete }: Props) {\n  const { t } = useTranslation();"],
  [">Добро пожаловать в<", ">{t('onboarding_welcome')}<"],
  [">Захватывай территории в реальном мире, просто выходя на пробежку. Твой маршрут очерчивает твои новые владения.<", ">{t('onboarding_p1')}<"],
  [">Соревнуйся с другими игроками, перехватывай их территории и повышай свой ранг.<", ">{t('onboarding_p2')}<"],
  [">Вступай в Орду — объединяйся с друзьями для совместного доминирования на карте.<", ">{t('onboarding_p3')}<"],
  [">ПОНЯТНО, ПОГНАЛИ!<", ">{t('onboarding_btn')}<"]
]);

// 8. PublicProfileModal.tsx
replaceInFile('components/PublicProfileModal.tsx', [
  ["import { useEffect, useState } from 'react';", "import { useEffect, useState } from 'react';\nimport { useTranslation } from 'react-i18next';"],
  ["export function PublicProfileModal({ userId, onClose }: Props) {", "export function PublicProfileModal({ userId, onClose }: Props) {\n  const { t } = useTranslation();"],
  [">Загрузка...<", ">{t('loading')}<"],
  [">Профиль<", ">{t('profile')}<"],
  [">завоевал<", ">{t('conquered')}<"],
  ["{' '}км²", " {t('sq_km')}"]
]);

// 9. QuestsTab.tsx
replaceInFile('components/QuestsTab.tsx', [
  ["import { useEffect, useState } from 'react';", "import { useEffect, useState } from 'react';\nimport { useTranslation } from 'react-i18next';"],
  ["export function QuestsTab({ currentUser, reloadMapData }: Props) {", "export function QuestsTab({ currentUser, reloadMapData }: Props) {\n  const { t } = useTranslation();"],
  [">Задания<", ">{t('quests')}<"],
  [">ЕЖЕДНЕВНЫЕ ЗАДАНИЯ<", ">{t('daily_quests')}<"],
  [">ЗАВЕРШЕННЫЕ<", ">{t('completed_quests')}<"],
  [">ПРОГРЕСС<", ">{t('progress')}<"],
  [">ВЫПОЛНЕНО<", ">{t('completed')}<"]
]);

console.log("Translation components updated.");
