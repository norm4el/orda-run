const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend', 'src');
const i18nPath = path.join(srcDir, 'i18n.ts');

const newRu = {
  "onb_w": "Добро пожаловать в Орду! 🐎",
  "onb_d1": "Это игра, где реальные пробежки превращаются в захват территорий на карте твоего города.",
  "onb_t2": "Беги и Захватывай 🏃‍♂️",
  "onb_d2": "Записывай маршрут во вкладке ЗАПИСЬ. Чем больше ты бегаешь по замкнутому кругу, тем большую площадь захватываешь!",
  "onb_t3": "Объединяйся в Орды 🛡️",
  "onb_d3": "Создай свою Орду или вступи в существующую. Захватывай территории вместе с друзьями и станьте Ханством!",
  "onb_start": "Начать игру",
  "lp_desc": "Первая в мире игра, где твои пробежки захватывают реальные территории. \n          Создай свою Орду, соревнуйся с соседями и стань легендой города!",
  "lp_btn": "Играть в Telegram",
  "q_title": "ЕЖЕДНЕВНЫЕ ЗАДАНИЯ",
  "q_desc": "Каждый день вы получаете новые задания. Выполняйте их, чтобы зарабатывать бонусные XP и расти в рейтинге.",
  "q_prog": "Прогресс",
  "q_done": "Выполнено ✓",
  "q_claim": "Забрать награду",
  "q_load": "Загрузка..."
};

const newEn = {
  "onb_w": "Welcome to Orda! 🐎",
  "onb_d1": "This is a game where your real runs turn into territory captures on your city map.",
  "onb_t2": "Run & Capture 🏃‍♂️",
  "onb_d2": "Record your route in the RECORD tab. The more you run in a closed loop, the larger the area you capture!",
  "onb_t3": "Unite in Ordas 🛡️",
  "onb_d3": "Create your Orda or join an existing one. Capture territories with friends and become a Khanate!",
  "onb_start": "Start playing",
  "lp_desc": "The first game in the world where your runs capture real territories. \n          Create your Orda, compete with neighbors and become a city legend!",
  "lp_btn": "Play in Telegram",
  "q_title": "DAILY QUESTS",
  "q_desc": "Every day you receive new quests. Complete them to earn bonus XP and climb the leaderboard.",
  "q_prog": "Progress",
  "q_done": "Completed ✓",
  "q_claim": "Claim reward",
  "q_load": "Loading..."
};

let i18nContent = fs.readFileSync(i18nPath, 'utf8');
const addTranslations = (content, lang, map) => {
  const searchRegex = new RegExp(`${lang}:\\s*\\{\\s*translation:\\s*\\{`, 'g');
  const stringsToAdd = Object.entries(map).map(([key, val]) => `\n      "${key}": ${JSON.stringify(val)},`).join('');
  return content.replace(searchRegex, (match) => match + stringsToAdd);
};
i18nContent = addTranslations(i18nContent, 'ru', newRu);
i18nContent = addTranslations(i18nContent, 'en', newEn);
fs.writeFileSync(i18nPath, i18nContent);

function replaceInFile(filename, replacements) {
  const file = path.join(srcDir, filename);
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes("useTranslation")) {
    content = "import { useTranslation } from 'react-i18next';\n" + content;
  }
  for (const [s, r] of replacements) {
    content = content.replace(s, r);
  }
  fs.writeFileSync(file, content);
}

replaceInFile('components/Onboarding.tsx', [
  ["'Добро пожаловать в Орду! 🐎'", "t('onb_w')"],
  ["'Это игра, где реальные пробежки превращаются в захват территорий на карте твоего города.'", "t('onb_d1')"],
  ["'Беги и Захватывай 🏃‍♂️'", "t('onb_t2')"],
  ["'Записывай маршрут во вкладке ЗАПИСЬ. Чем больше ты бегаешь по замкнутому кругу, тем большую площадь захватываешь!'", "t('onb_d2')"],
  ["'Объединяйся в Орды 🛡️'", "t('onb_t3')"],
  ["'Создай свою Орду или вступи в существующую. Захватывай территории вместе с друзьями и станьте Ханством!'", "t('onb_d3')"],
  ["'Начать игру'", "t('onb_start')"]
]);

replaceInFile('components/LandingPage.tsx', [
  ["Первая в мире игра, где твои пробежки захватывают реальные территории. \n          Создай свою Орду, соревнуйся с соседями и стань легендой города!", "{t('lp_desc')}"],
  ["Играть в Telegram", "{t('lp_btn')}"]
]);

replaceInFile('components/QuestsTab.tsx', [
  [">ЕЖЕДНЕВНЫЕ ЗАДАНИЯ<", ">{t('q_title')}<"],
  [">Каждый день вы получаете новые задания. Выполняйте их, чтобы зарабатывать бонусные XP и расти в рейтинге.<", ">{t('q_desc')}<"],
  [">Прогресс<", ">{t('q_prog')}<"],
  [">Выполнено ✓<", ">{t('q_done')}<"],
  [">Забрать награду<", ">{t('q_claim')}<"],
  [">Загрузка...<", ">{t('q_load')}<"]
]);

console.log('done');
