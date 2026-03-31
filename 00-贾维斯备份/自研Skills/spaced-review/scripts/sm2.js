#!/usr/bin/env node
/**
 * SM-2 间隔复习算法
 * 用法:
 *   node sm2.js review <flashcards.json>          -- 列出今日待复习卡片
 *   node sm2.js update <flashcards.json> <id> <quality>  -- 更新卡片复习结果
 *   node sm2.js stats <flashcards.json>           -- 统计报告
 */

const fs = require('fs');
const path = require('path');

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const daysBetween = (a, b) => {
  const da = new Date(a);
  const db = new Date(b);
  return Math.floor((db - da) / (1000 * 60 * 60 * 24));
};

function loadCards(filePath) {
  if (!fs.existsSync(filePath)) {
    return { cards: [] };
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function saveCards(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function getDueCards(data) {
  const t = today();
  return data.cards
    .filter(c => c.nextReview <= t)
    .sort((a, b) => {
      // 逾期天数多的优先
      const overA = daysBetween(a.nextReview, t);
      const overB = daysBetween(b.nextReview, t);
      if (overA !== overB) return overB - overA;
      // difficulty 低的优先（更难的卡片）
      return a.difficulty - b.difficulty;
    });
}

function updateCard(card, quality) {
  quality = Math.max(0, Math.min(5, quality));

  if (quality >= 3) {
    if (card.repetitions === 0) card.interval = 1;
    else if (card.repetitions === 1) card.interval = 6;
    else card.interval = Math.round(card.interval * card.difficulty);
    card.repetitions += 1;
  } else {
    card.repetitions = 0;
    card.interval = 1;
  }

  card.difficulty = Math.max(
    1.3,
    card.difficulty + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  );

  const next = new Date();
  next.setDate(next.getDate() + card.interval);
  card.nextReview = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;

  return card;
}

function getStats(data) {
  const t = today();
  const total = data.cards.length;
  const mastered = data.cards.filter(c => c.interval > 21).length;
  const learning = data.cards.filter(c => c.interval > 1 && c.interval <= 21).length;
  const newCards = data.cards.filter(c => c.repetitions === 0).length;
  const dueToday = data.cards.filter(c => c.nextReview <= t).length;

  const byCategory = {};
  data.cards.forEach(c => {
    if (!byCategory[c.category]) byCategory[c.category] = { total: 0, mastered: 0 };
    byCategory[c.category].total++;
    if (c.interval > 21) byCategory[c.category].mastered++;
  });

  const weakest = [...data.cards]
    .sort((a, b) => a.difficulty - b.difficulty)
    .slice(0, 5);

  return { total, mastered, learning, newCards, dueToday, byCategory, weakest };
}

// CLI
const [,, cmd, filePath, ...args] = process.argv;

if (!cmd || !filePath) {
  console.log('用法: node sm2.js <review|update|stats> <flashcards.json> [args]');
  process.exit(1);
}

const data = loadCards(filePath);

switch (cmd) {
  case 'review': {
    const due = getDueCards(data);
    console.log(JSON.stringify({ dueCount: due.length, cards: due }, null, 2));
    break;
  }
  case 'update': {
    const [id, quality] = args;
    const card = data.cards.find(c => c.id === id);
    if (!card) {
      console.error(`卡片不存在: ${id}`);
      process.exit(1);
    }
    updateCard(card, parseInt(quality));
    saveCards(filePath, data);
    console.log(JSON.stringify(card, null, 2));
    break;
  }
  case 'stats': {
    const stats = getStats(data);
    console.log(JSON.stringify(stats, null, 2));
    break;
  }
  default:
    console.error(`未知命令: ${cmd}`);
    process.exit(1);
}
