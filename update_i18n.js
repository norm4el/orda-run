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
    
    "tour_welcome": "Добро пожаловать!",
    "tour_welcome_desc": "Сейчас я покажу, что здесь есть.",
    "tour_map": "Твоя Территория",
    "tour_map_desc": "Сверху ты можешь переключать видимость: смотреть свою территорию или территорию своей Орды.",
    "tour_profile": "Профиль",
    "tour_profile_desc": "В профиле (справа внизу) ты можешь вступить в Орду или создать свою, а также поменять цвет своей территории.",
    "quests": "Задания",
    "tour_quests_desc": "Выполняй задания (в центре внизу) каждый день, чтобы зарабатывать бонусные очки (XP) и быстрее расти в таблице лидеров!",
    "tour_record": "Начать пробежку",
    "tour_record_desc": "А здесь начинается самое главное — запись пробежки. Нажми старт (вторая кнопка слева) и захватывай улицы!",
    "got_it": "Понятно",
    "tour_next": "Далее",

    "your_runs": "История пробежек",
    "no_runs": "Вы еще не совершили ни одной пробежки.",
    "show": "На карте",
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
    "sq_km": "км²",
    
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
    
    "tour_welcome": "Welcome!",
    "tour_welcome_desc": "Let me show you around.",
    "tour_map": "Your Territory",
    "tour_map_desc": "At the top you can toggle visibility: view your territory or your Orda's territory.",
    "tour_profile": "Profile",
    "tour_profile_desc": "In the profile (bottom right) you can join an Orda or create your own, and change your territory color.",
    "quests": "Quests",
    "tour_quests_desc": "Complete daily quests (bottom center) to earn bonus points (XP) and climb the leaderboard faster!",
    "tour_record": "Start a run",
    "tour_record_desc": "And here is the most important part — recording a run. Hit start (second button from the left) and capture the streets!",
    "got_it": "Got it",
    "tour_next": "Next",

    "your_runs": "Run History",
    "no_runs": "You haven't completed any runs yet.",
    "show": "On map",
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
    "sq_km": "sq km",
    
    "daily_quests": "DAILY QUESTS",
    "completed_quests": "COMPLETED",
    "progress": "PROGRESS",
    "completed": "COMPLETED"
  }
};

const i18nPath = path.join(srcDir, 'i18n.ts');
let i18nContent = fs.readFileSync(i18nPath, 'utf8');

const insertTranslations = (content, lang) => {
  const searchRegex = new RegExp(`${lang}:\\s*\\{\\s*translation:\\s*\\{`, 'g');
  const stringsToAdd = Object.entries(translations[lang]).map(([key, val]) => `\n      "${key}": ${JSON.stringify(val)},`).join('');
  
  return content.replace(searchRegex, (match) => match + stringsToAdd);
};

i18nContent = insertTranslations(i18nContent, 'ru');
i18nContent = insertTranslations(i18nContent, 'en');

fs.writeFileSync(i18nPath, i18nContent);
console.log('Updated i18n.ts');
