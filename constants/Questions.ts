/**
 * Question of the Day Pool
 * 3 levels of questions with 5-day cycle system
 */

export type QuestionLevel = 1 | 2 | 3;

export interface QuestionLevelInfo {
  level: QuestionLevel;
  badge: string;
  title: string;
  vibe: string;
  effort: string;
  reward: number; // Coins
}

export const QUESTION_LEVELS: Record<QuestionLevel, QuestionLevelInfo> = {
  1: {
    level: 1,
    badge: '🌱',
    title: 'See how well you know your partner',
    vibe: 'Fun, Trivia, Preferences',
    effort: 'Instant answer. No thinking required.',
    reward: 1,
  },
  2: {
    level: 2,
    badge: '🌹',
    title: "Let's see how well you match",
    vibe: 'Shared History, Appreciation, Current Dynamic',
    effort: 'Requires 1-2 minutes of thought.',
    reward: 2,
  },
  3: {
    level: 3,
    badge: '🧠',
    title: "Let's go deeper.",
    vibe: 'Core Beliefs, Vulnerability, Future Goals',
    effort: 'Requires emotional investment/honesty.',
    reward: 3,
  },
};

// Level 1: Casual questions (Pool 1)
export const POOL_1_CASUAL: string[] = [
  "What's your partner's favorite way to spend a lazy Sunday?",
  "What's your partner's favorite childhood memory?",
  "What's something your partner is really good at?",
  "What's a song that reminds you of your partner?",
  "What's your partner's favorite way to relax?",
  "What's your partner's dream vacation?",
  "What's your partner's ideal date night?",
  "What's something that always makes your partner laugh?",
  "What's your partner's favorite food?",
  "What's your partner's favorite movie or TV show?",
  "What's your partner's favorite season and why?",
  "What's your partner's favorite hobby?",
  "What's your partner's favorite way to celebrate?",
  "What's your partner's favorite place they've visited?",
  "What's your partner's favorite thing to do on weekends?",
  // Add more casual questions...
];

// Level 2: Personal/Spice questions (Pool 2)
export const POOL_2_PERSONAL: string[] = [
  "What's one thing your partner does that always makes you smile?",
  "What's a memory with your partner that you'll never forget?",
  "What's something new you'd like to try together?",
  "What's your partner's love language, and how do you show them love?",
  "What's a goal your partner has that you want to support?",
  "What's your partner's favorite thing about you?",
  "What's something your partner taught you?",
  "What's a place you'd love to visit together?",
  "What's something you admire about your partner?",
  "What's a habit of your partner's that you find endearing?",
  "What's your partner's favorite way to be comforted?",
  "What's something you want to learn about your partner?",
  "What's a small gesture that means a lot to your partner?",
  "What's something your partner does that shows they care?",
  "What's your partner's favorite thing to do together?",
  // Add more personal questions...
];

// Level 3: Deep/Heavy questions (Pool 3)
export const POOL_3_DEEP: string[] = [
  "What's your partner's biggest fear, and how can you help them with it?",
  "What's a challenge you've overcome together?",
  "What's your partner's favorite quality in a person?",
  "What's something your partner wants to improve about themselves?",
  "What's a tradition you'd like to start together?",
  "What's your partner's favorite thing about your relationship?",
  "What's a moment when you felt most connected to your partner?",
  "What's something your partner needs to hear from you?",
  "What's a dream you both share for the future?",
  "What's something vulnerable you want to share with your partner?",
  "What's a boundary your partner has that you respect?",
  "What's a way you've grown since being with your partner?",
  "What's something you're grateful for about your partner?",
  "What's a difficult conversation you need to have together?",
  "What's a way you want to deepen your connection?",
  // Add more deep questions...
];

/**
 * Get question from pool by index
 */
function getQuestionFromPool(pool: string[], index: number): string {
  if (pool.length === 0) return 'No questions available.';
  return pool[index % pool.length];
}

/**
 * Get question for a specific cycle day
 * Day 1: Pool 1 (Casual)
 * Day 2: Pool 2 (Personal)
 * Day 3: Pool 1 (Casual)
 * Day 4: Pool 2 (Personal)
 * Day 5: Pool 3 (Deep)
 * Repeat...
 */
export function getQuestionForCycleDay(
  cycleDay: number,
  pool1Index: number,
  pool2Index: number,
  pool3Index: number
): { text: string; level: QuestionLevel; levelInfo: QuestionLevelInfo } {
  const dayInCycle = ((cycleDay - 1) % 5) + 1; // 1-5 cycle

  if (dayInCycle === 1 || dayInCycle === 3) {
    // Pool 1 (Casual) - Days 1 and 3
    const text = getQuestionFromPool(POOL_1_CASUAL, pool1Index);
    return { text, level: 1, levelInfo: QUESTION_LEVELS[1] };
  } else if (dayInCycle === 2 || dayInCycle === 4) {
    // Pool 2 (Personal) - Days 2 and 4
    const text = getQuestionFromPool(POOL_2_PERSONAL, pool2Index);
    return { text, level: 2, levelInfo: QUESTION_LEVELS[2] };
  } else {
    // Pool 3 (Deep) - Day 5
    const text = getQuestionFromPool(POOL_3_DEEP, pool3Index);
    return { text, level: 3, levelInfo: QUESTION_LEVELS[3] };
  }
}

/**
 * Get pool size for a level
 */
export function getPoolSize(level: QuestionLevel): number {
  switch (level) {
    case 1:
      return POOL_1_CASUAL.length;
    case 2:
      return POOL_2_PERSONAL.length;
    case 3:
      return POOL_3_DEEP.length;
  }
}
