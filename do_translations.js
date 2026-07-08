const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend', 'src');

function fixAppTour() {
  const file = path.join(srcDir, 'components', 'AppTour.tsx');
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace("import { useState } from 'react';", "import { useState } from 'react';\nimport { useTranslation } from 'react-i18next';");
  content = content.replace("export function AppTour({ run, onFinish }: Props) {", "export function AppTour({ run, onFinish }: Props) {\n  const { t } = useTranslation();");
  content = content.replace("'Добро пожаловать!'", "t('tour_welcome')");
  content = content.replace("'Сейчас я покажу, что здесь есть.'", "t('tour_welcome_desc')");
  content = content.replace("'Твоя Территория'", "t('tour_map')");
  content = content.replace("'Сверху ты можешь переключать видимость: смотреть свою территорию или территорию своей Орды.'", "t('tour_map_desc')");
  content = content.replace("'Профиль'", "t('tour_profile')");
  content = content.replace("'В профиле (справа внизу) ты можешь вступить в Орду или создать свою, а также поменять цвет своей территории.'", "t('tour_profile_desc')");
  content = content.replace("'Задания'", "t('quests')");
  content = content.replace("'Выполняй задания (в центре внизу) каждый день, чтобы зарабатывать бонусные очки (XP) и быстрее расти в таблице лидеров!'", "t('tour_quests_desc')");
  content = content.replace("'Начать пробежку'", "t('tour_record')");
  content = content.replace("'А здесь начинается самое главное — запись пробежки. Нажми старт (вторая кнопка слева) и захватывай улицы!'", "t('tour_record_desc')");
  content = content.replace("'Понятно'", "t('got_it')");
  content = content.replace("'Далее'", "t('tour_next')");
  fs.writeFileSync(file, content);
}

function fixLandingPage() {
  const file = path.join(srcDir, 'components', 'LandingPage.tsx');
  let content = fs.readFileSync(file, 'utf8');
  content = "import { useTranslation } from 'react-i18next';\n" + content;
  content = content.replace("export function LandingPage() {", "export function LandingPage() {\n  const { t } = useTranslation();");
  content = content.replace("ИГРАЙ В ДВИЖЕНИИ", "{t('landing_title')}");
  content = content.replace("Первая в мире игра, где твои пробежки захватывают реальные территории. \n          Создай свою Орду, соревнуйся с соседями и стань легендой города!", "{t('landing_desc')}");
  content = content.replace("ОТКРЫТЬ В TELEGRAM", "{t('landing_open_tg')}");
  content = content.replace("Что вас ждет:", "{t('landing_features')}");
  content = content.replace("Захват территорий", "{t('landing_f1')}");
  content = content.replace("Каждая ваша пробежка обводит новую территорию на реальной карте.", "{t('landing_f1_desc')}");
  content = content.replace("Орды", "{t('landing_f2')}");
  content = content.replace("Создавайте кланы с друзьями, чтобы вместе закрашивать районы в ваши цвета.", "{t('landing_f2_desc')}");
  content = content.replace("Интеграция со Strava", "{t('landing_f3')}");
  content = content.replace("Подключите свой аккаунт, и ваши пробежки будут автоматически переноситься в игру.", "{t('landing_f3_desc')}");
  content = content.replace("© 2026 Orda Run. Все права защищены.", "{t('landing_footer')}");
  content = content.replace("Политика конфиденциальности", "{t('landing_privacy')}");
  content = content.replace("Условия использования", "{t('landing_terms')}");
  fs.writeFileSync(file, content);
}

function fixActivityFeed() {
  const file = path.join(srcDir, 'components', 'ActivityFeed.tsx');
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace("import { useEffect, useState, useRef } from 'react';", "import { useEffect, useState, useRef } from 'react';\nimport { useTranslation } from 'react-i18next';");
  content = content.replace("export function ActivityFeed({ onUserClick }: Props) {", "export function ActivityFeed({ onUserClick }: Props) {\n  const { t } = useTranslation();");
  content = content.replace("'Игрок'", "t('player')");
  fs.writeFileSync(file, content);
}

function fixLeaderboardTab() {
  const file = path.join(srcDir, 'components', 'LeaderboardTab.tsx');
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace("import { useEffect, useState } from 'react';", "import { useEffect, useState } from 'react';\nimport { useTranslation } from 'react-i18next';");
  content = content.replace("export function LeaderboardTab({ currentUser, onUserClick }: Props) {", "export function LeaderboardTab({ currentUser, onUserClick }: Props) {\n  const { t } = useTranslation();");
  content = content.replace(">Лидерборд<", ">{t('leaderboard')}<");
  content = content.replace(">РЕЙТИНГ ПО ПЛОЩАДИ<", ">{t('rank_by_area')}<");
  content = content.replace(">Вы пока не захватили территорию<", ">{t('no_territory_yet')}<");
  fs.writeFileSync(file, content);
}

function fixOnboarding() {
  const file = path.join(srcDir, 'components', 'Onboarding.tsx');
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace("import { useState } from 'react';", "import { useState } from 'react';\nimport { useTranslation } from 'react-i18next';");
  content = content.replace("export function Onboarding({ onComplete }: Props) {", "export function Onboarding({ onComplete }: Props) {\n  const { t } = useTranslation();");
  content = content.replace("'Добро пожаловать в Orda Run! 🏃‍♂️'", "t('onboarding_welcome')");
  content = content.replace("'Захватывай территории в реальном мире, просто выходя на пробежку. Твой маршрут очерчивает твои новые владения.'", "t('onboarding_p1')");
  content = content.replace("'Соревнуйся с другими игроками, перехватывай их территории и повышай свой ранг.'", "t('onboarding_p2')");
  content = content.replace("'Вступай в Орду — объединяйся с друзьями для совместного доминирования на карте.'", "t('onboarding_p3')");
  content = content.replace("'ПОНЯТНО, ПОГНАЛИ!'", "t('onboarding_btn')");
  fs.writeFileSync(file, content);
}

function fixQuestsTab() {
  const file = path.join(srcDir, 'components', 'QuestsTab.tsx');
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace("import { useState, useEffect } from 'react';", "import { useState, useEffect } from 'react';\nimport { useTranslation } from 'react-i18next';");
  content = content.replace("export function QuestsTab({ currentUser, reloadMapData }: Props) {", "export function QuestsTab({ currentUser, reloadMapData }: Props) {\n  const { t } = useTranslation();");
  content = content.replace(">ЕЖЕДНЕВНЫЕ ЗАДАНИЯ<", ">{t('daily_quests')}<");
  content = content.replace(">Каждый день вы получаете новые задания. Выполняйте их, чтобы зарабатывать бонусные XP и расти в рейтинге.<", ">{t('quests_desc')}<");
  content = content.replace(">ЗАВЕРШЕННЫЕ<", ">{t('completed_quests')}<");
  content = content.replace(">ПРОГРЕСС<", ">{t('progress')}<");
  content = content.replace(">ВЫПОЛНЕНО<", ">{t('completed')}<");
  content = content.replace(">ЗАБРАТЬ НАГРАДУ<", ">{t('claim_reward')}<");
  content = content.replace(">Загрузка...<", ">{t('loading')}<");
  fs.writeFileSync(file, content);
}

function fixPublicProfileModal() {
  const file = path.join(srcDir, 'components', 'PublicProfileModal.tsx');
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace("import { useEffect, useState } from 'react';", "import { useEffect, useState } from 'react';\nimport { useTranslation } from 'react-i18next';");
  content = content.replace("export function PublicProfileModal({ userId, onClose }: Props) {", "export function PublicProfileModal({ userId, onClose }: Props) {\n  const { t } = useTranslation();");
  content = content.replace(">Загрузка...<", ">{t('loading')}<");
  content = content.replace(">Профиль<", ">{t('profile')}<");
  content = content.replace(">завоевал<", ">{t('conquered')}<");
  content = content.replace(" км²", " {t('sq_km')}");
  fs.writeFileSync(file, content);
}

function fixHistoryModal() {
  const file = path.join(srcDir, 'components', 'HistoryModal.tsx');
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace("import { useEffect, useState } from 'react';", "import { useEffect, useState } from 'react';\nimport { useTranslation } from 'react-i18next';");
  content = content.replace("export function HistoryModal({ currentUser, onClose, onShowRouteOnMap }: Props) {", "export function HistoryModal({ currentUser, onClose, onShowRouteOnMap }: Props) {\n  const { t } = useTranslation();");
  content = content.replace(">История пробежек<", ">{t('your_runs')}<");
  content = content.replace(">Вы еще не совершили ни одной пробежки.<", ">{t('no_runs')}<");
  content = content.replace(">На карте<", ">{t('show')}<");
  fs.writeFileSync(file, content);
}

function fixApp() {
  const file = path.join(srcDir, 'App.tsx');
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace("import { useEffect, useState, useCallback } from 'react';", "import { useEffect, useState, useCallback } from 'react';\nimport { useTranslation } from 'react-i18next';");
  content = content.replace("function App() {", "function App() {\n  const { t } = useTranslation();");
  content = content.replace(">ЗАКРЫТЬ МАРШРУТ<", ">{t('close_route')}<");
  content = content.replace("'ЗАКРЫТЬ МАРШРУТ'", "t('close_route')");
  content = content.replace(">Орда<", ">{t('orda')}<");
  content = content.replace(">Личный<", ">{t('personal')}<");
  content = content.replace(">Площадь плана<", ">{t('plan_area')}<");
  content = content.replace(">Нет орды<", ">{t('no_orda')}<");
  content = content.replace(">Твоя площадь<", ">{t('your_area')}<");
  content = content.replace(">План<", ">{t('plan')}<");
  content = content.replace(">Отмена<", ">{t('cancel')}<");
  fs.writeFileSync(file, content);
}

try { fixAppTour(); } catch(e) { console.error('AppTour', e); }
try { fixLandingPage(); } catch(e) { console.error('LandingPage', e); }
try { fixActivityFeed(); } catch(e) { console.error('ActivityFeed', e); }
try { fixLeaderboardTab(); } catch(e) { console.error('LeaderboardTab', e); }
try { fixOnboarding(); } catch(e) { console.error('Onboarding', e); }
try { fixQuestsTab(); } catch(e) { console.error('QuestsTab', e); }
try { fixPublicProfileModal(); } catch(e) { console.error('PublicProfileModal', e); }
try { fixHistoryModal(); } catch(e) { console.error('HistoryModal', e); }
try { fixApp(); } catch(e) { console.error('App', e); }
console.log('done');
