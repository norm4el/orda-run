const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend', 'src');

const translations = {
  ru: {
    "close_route": "ЗАКРЫТЬ МАРШРУТ",
    "no_name": "Без имени",
    "orda": "Орда",
    "personal": "Личный",
    "plan_area": "Площадь плана",
    "no_orda": "Нет орды",
    "your_area": "Твоя площадь",
    "cancel": "Отмена",
    "plan": "План",
    
    "activity": "Активность",
    "no_activity": "Пока нет активности",
    
    "tour_welcome": "Добро пожаловать в Orda Run!",
    "tour_welcome_desc": "Захватывай территории бегом и соревнуйся с другими игроками.",
    "tour_map": "Это Карта",
    "tour_map_desc": "Здесь ты видишь свои и чужие территории. Карта показывает мир вокруг тебя.",
    "tour_record": "Запись пробежки",
    "tour_record_desc": "Нажми сюда, чтобы начать бежать. Твой маршрут превратится в новую территорию!",
    "tour_profile": "Твой Профиль",
    "tour_profile_desc": "Настраивай цвет, подключай Strava и смотри свою статистику.",
    "tour_activity": "Лента активности",
    "tour_activity_desc": "Следи за тем, кто и где захватывает новые территории в реальном времени.",
    "tour_orda": "Режим Орды",
    "tour_orda_desc": "Создавай альянсы или вступай в существующие, чтобы захватывать мир вместе!",
    "tour_ready": "Готов к забегу?",
    "tour_ready_desc": "Чем больше бегаешь, тем больше твое влияние. Погнали!",
    "tour_next": "ДАЛЕЕ",
    "tour_start": "НАЧАТЬ ИГРУ",

    "your_runs": "Ваши пробежки",
    "no_runs": "У вас пока нет сохраненных пробежек",
    "show": "ПОКАЗАТЬ",
    "delete": "УДАЛИТЬ",
    "close": "Закрыть",
    
    "landing_title": "ИГРАЙ В ДВИЖЕНИИ",
    "landing_desc": "Orda Run — это фитнес-игра, где ваши реальные пробежки захватывают территории на карте. Объединяйтесь в Орды, соревнуйтесь с другими и станьте властелином города.",
    "landing_open_tg": "ОТКРЫТЬ В TELEGRAM",
    "landing_features": "Что вас ждет:",
    "landing_f1": "Захват территорий",
    "landing_f1_desc": "Каждая ваша пробежка обводит новую территорию на реальной карте.",
    "landing_f2": "Орды",
    "landing_f2_desc": "Создавайте кланы с друзьями, чтобы вместе закрашивать районы в ваши цвета.",
    "landing_f3": "Интеграция со Strava",
    "landing_f3_desc": "Подключите свой аккаунт, и ваши пробежки будут автоматически переноситься в игру.",
    "landing_footer": "© 2026 Orda Run. Все права защищены.",
    "landing_privacy": "Политика конфиденциальности",
    "landing_terms": "Условия использования",
    
    "leaderboard": "Лидерборд",
    "rank_by_area": "РЕЙТИНГ ПО ПЛОЩАДИ",
    "no_territory_yet": "Вы пока не захватили территорию",

    "onboarding_welcome": "Добро пожаловать в",
    "onboarding_p1": "Захватывай территории в реальном мире, просто выходя на пробежку. Твой маршрут очерчивает твои новые владения.",
    "onboarding_p2": "Соревнуйся с другими игроками, перехватывай их территории и повышай свой ранг.",
    "onboarding_p3": "Вступай в Орду — объединяйся с друзьями для совместного доминирования на карте.",
    "onboarding_btn": "ПОНЯТНО, ПОГНАЛИ!",

    "loading": "Загрузка...",
    "conquered": "завоевал",
    
    "quests": "Задания",
    "daily_quests": "ЕЖЕДНЕВНЫЕ ЗАДАНИЯ",
    "completed_quests": "ЗАВЕРШЕННЫЕ",
    "progress": "ПРОГРЕСС",
    "completed": "ВЫПОЛНЕНО"
  },
  en: {
    "close_route": "CLOSE ROUTE",
    "no_name": "No name",
    "orda": "Orda",
    "personal": "Personal",
    "plan_area": "Plan area",
    "no_orda": "No orda",
    "your_area": "Your area",
    "cancel": "Cancel",
    "plan": "Plan",
    
    "activity": "Activity",
    "no_activity": "No activity yet",
    
    "tour_welcome": "Welcome to Orda Run!",
    "tour_welcome_desc": "Conquer territories by running and compete with other players.",
    "tour_map": "This is the Map",
    "tour_map_desc": "Here you see your territories and others. The map shows the world around you.",
    "tour_record": "Record a Run",
    "tour_record_desc": "Tap here to start running. Your route will become a new territory!",
    "tour_profile": "Your Profile",
    "tour_profile_desc": "Customize color, connect Strava and view your stats.",
    "tour_activity": "Activity Feed",
    "tour_activity_desc": "Track who is conquering new territories in real-time.",
    "tour_orda": "Orda Mode",
    "tour_orda_desc": "Create alliances or join existing ones to conquer the world together!",
    "tour_ready": "Ready to run?",
    "tour_ready_desc": "The more you run, the more influence you have. Let's go!",
    "tour_next": "NEXT",
    "tour_start": "START GAME",

    "your_runs": "Your runs",
    "no_runs": "You have no saved runs yet",
    "show": "SHOW",
    "delete": "DELETE",
    "close": "Close",
    
    "landing_title": "PLAY IN MOTION",
    "landing_desc": "Orda Run is a fitness game where your real-world runs capture territories on a map. Join Ordas, compete with others, and rule the city.",
    "landing_open_tg": "OPEN IN TELEGRAM",
    "landing_features": "What awaits you:",
    "landing_f1": "Territory Capture",
    "landing_f1_desc": "Every run draws a new territory on the real map.",
    "landing_f2": "Ordas",
    "landing_f2_desc": "Create clans with friends to paint neighborhoods in your colors.",
    "landing_f3": "Strava Integration",
    "landing_f3_desc": "Connect your account and your runs will sync automatically.",
    "landing_footer": "© 2026 Orda Run. All rights reserved.",
    "landing_privacy": "Privacy Policy",
    "landing_terms": "Terms of Service",
    
    "leaderboard": "Leaderboard",
    "rank_by_area": "RANK BY AREA",
    "no_territory_yet": "You haven't captured any territory yet",

    "onboarding_welcome": "Welcome to",
    "onboarding_p1": "Capture territories in the real world just by going for a run. Your route outlines your new domain.",
    "onboarding_p2": "Compete with other players, take over their territories and increase your rank.",
    "onboarding_p3": "Join an Orda — team up with friends for joint domination on the map.",
    "onboarding_btn": "GOT IT, LET'S GO!",

    "loading": "Loading...",
    "conquered": "conquered",
    
    "quests": "Quests",
    "daily_quests": "DAILY QUESTS",
    "completed_quests": "COMPLETED",
    "progress": "PROGRESS",
    "completed": "COMPLETED"
  }
};

const i18nPath = path.join(srcDir, 'i18n.ts');
let i18nContent = fs.readFileSync(i18nPath, 'utf8');

// Insert new translations into i18n.ts
const insertTranslations = (content, lang) => {
  const marker = `${lang}: {\n    translation: {`;
  const insertIndex = content.indexOf(marker) + marker.length;
  
  const stringsToAdd = Object.entries(translations[lang]).map(([key, val]) => `\n      "${key}": ${JSON.stringify(val)},`).join('');
  
  return content.slice(0, insertIndex) + stringsToAdd + content.slice(insertIndex);
};

i18nContent = insertTranslations(i18nContent, 'ru');
i18nContent = insertTranslations(i18nContent, 'en');

fs.writeFileSync(i18nPath, i18nContent);
console.log('Updated i18n.ts');

const replaceInFile = (filename, replacements, useTranslationImport = true) => {
  const filePath = path.join(srcDir, filename);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (useTranslationImport && !content.includes('useTranslation')) {
    content = "import { useTranslation } from 'react-i18next';\n" + content;
  }
  
  // Inject const { t } = useTranslation(); into components
  if (useTranslationImport) {
    const componentMatches = [...content.matchAll(/export function ([A-Za-z0-9_]+)\s*\([^)]*\)\s*{/g)];
    const defaultExportMatches = [...content.matchAll(/function ([A-Za-z0-9_]+)\s*\([^)]*\)\s*{/g)];
    
    for (const match of [...componentMatches, ...defaultExportMatches]) {
       const funcStart = match.index + match[0].length;
       if (!content.slice(funcStart, funcStart + 100).includes('useTranslation')) {
         content = content.slice(0, funcStart) + "\n  const { t } = useTranslation();" + content.slice(funcStart);
       }
    }
  }

  for (const [search, replace] of replacements) {
    content = content.replaceAll(search, replace);
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${filename}`);
};

replaceInFile('App.tsx', [
  ["'ЗАКРЫТЬ МАРШРУТ'", "t('close_route')"],
  ["'Без имени'", "t('no_name')"],
  ["'Орда'", "t('orda')"],
  ["'Личный'", "t('personal')"],
  ["'Площадь плана'", "t('plan_area')"],
  ["'Нет орды'", "t('no_orda')"],
  ["'Твоя площадь'", "t('your_area')"],
  ["'Отмена'", "t('cancel')"],
  ["'План'", "t('plan')"],
  ["ЗАКРЫТЬ МАРШРУТ", "{t('close_route')}"] // For raw text in tags
]);

replaceInFile('components/ActivityFeed.tsx', [
  [">Активность<", ">{t('activity')}<"],
  [">Пока нет активности<", ">{t('no_activity')}<"]
]);

replaceInFile('components/AppTour.tsx', [
  [">Добро пожаловать в Orda Run!<", ">{t('tour_welcome')}<"],
  [">Захватывай территории бегом и соревнуйся с другими игроками.<", ">{t('tour_welcome_desc')}<"],
  [">Это Карта<", ">{t('tour_map')}<"],
  [">Здесь ты видишь свои и чужие территории. Карта показывает мир вокруг тебя.<", ">{t('tour_map_desc')}<"],
  [">Запись пробежки<", ">{t('tour_record')}<"],
  [">Нажми сюда, чтобы начать бежать. Твой маршрут превратится в новую территорию!<", ">{t('tour_record_desc')}<"],
  [">Твой Профиль<", ">{t('tour_profile')}<"],
  [">Настраивай цвет, подключай Strava и смотри свою статистику.<", ">{t('tour_profile_desc')}<"],
  [">Лента активности<", ">{t('tour_activity')}<"],
  [">Следи за тем, кто и где захватывает новые территории в реальном времени.<", ">{t('tour_activity_desc')}<"],
  [">Режим Орды<", ">{t('tour_orda')}<"],
  [">Создавай альянсы или вступай в существующие, чтобы захватывать мир вместе!<", ">{t('tour_orda_desc')}<"],
  [">Готов к забегу?<", ">{t('tour_ready')}<"],
  [">Чем больше бегаешь, тем больше твое влияние. Погнали!<", ">{t('tour_ready_desc')}<"],
  [">ДАЛЕЕ<", ">{t('tour_next')}<"],
  [">НАЧАТЬ ИГРУ<", ">{t('tour_start')}<"]
]);

replaceInFile('components/HistoryModal.tsx', [
  [">Ваши пробежки<", ">{t('your_runs')}<"],
  [">У вас пока нет сохраненных пробежек<", ">{t('no_runs')}<"],
  [">ПОКАЗАТЬ<", ">{t('show')}<"],
  [">УДАЛИТЬ<", ">{t('delete')}<"],
  [">Закрыть<", ">{t('close')}<"]
]);

replaceInFile('components/LandingPage.tsx', [
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

replaceInFile('components/LeaderboardTab.tsx', [
  [">Лидерборд<", ">{t('leaderboard')}<"],
  [">РЕЙТИНГ ПО ПЛОЩАДИ<", ">{t('rank_by_area')}<"],
  [">Вы пока не захватили территорию<", ">{t('no_territory_yet')}<"]
]);

replaceInFile('components/Onboarding.tsx', [
  [">Добро пожаловать в<", ">{t('onboarding_welcome')}<"],
  [">Захватывай территории в реальном мире, просто выходя на пробежку. Твой маршрут очерчивает твои новые владения.<", ">{t('onboarding_p1')}<"],
  [">Соревнуйся с другими игроками, перехватывай их территории и повышай свой ранг.<", ">{t('onboarding_p2')}<"],
  [">Вступай в Орду — объединяйся с друзьями для совместного доминирования на карте.<", ">{t('onboarding_p3')}<"],
  [">ПОНЯТНО, ПОГНАЛИ!<", ">{t('onboarding_btn')}<"]
]);

replaceInFile('components/PublicProfileModal.tsx', [
  [">Загрузка...<", ">{t('loading')}<"],
  [">Профиль<", ">{t('profile')}<"],
  [">завоевал<", ">{t('conquered')}<"],
  ["{' '}км²", " {t('sq_km')}"]
]);

replaceInFile('components/QuestsTab.tsx', [
  [">Задания<", ">{t('quests')}<"],
  [">ЕЖЕДНЕВНЫЕ ЗАДАНИЯ<", ">{t('daily_quests')}<"],
  [">ЗАВЕРШЕННЫЕ<", ">{t('completed_quests')}<"],
  [">ПРОГРЕСС<", ">{t('progress')}<"],
  [">ВЫПОЛНЕНО<", ">{t('completed')}<"]
]);
