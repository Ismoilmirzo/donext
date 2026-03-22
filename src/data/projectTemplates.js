/**
 * Built-in project templates for common project types.
 * Used as offline fallback when AI is not available.
 */

export const PROJECT_TEMPLATES = [
  {
    id: 'learning',
    keywords: ['learn', 'study', 'course', 'tutorial', 'training', 'certification', 'exam', 'language', 'skill'],
    label: 'Learning / Study',
    labelUz: "O'rganish / O'qish",
    tasks: [
      { title: 'Research available resources and pick the best one', titleUz: 'Mavjud manbalarni izlash va eng yaxshisini tanlash' },
      { title: 'Set up study environment and materials', titleUz: "O'qish muhiti va materiallarni tayyorlash" },
      { title: 'Complete first lesson or chapter', titleUz: "Birinchi dars yoki bobni tugatish" },
      { title: 'Practice with exercises or flashcards', titleUz: "Mashqlar yoki kartochkalar bilan mashq qilish" },
      { title: 'Review and summarize key concepts', titleUz: "Asosiy tushunchalarni ko'rib chiqish va umumlashtirish" },
      { title: 'Take a practice test or quiz', titleUz: "Amaliy test yoki viktorina topshirish" },
    ],
  },
  {
    id: 'coding',
    keywords: ['code', 'build', 'develop', 'app', 'website', 'api', 'feature', 'implement', 'software', 'program', 'deploy'],
    label: 'Coding / Development',
    labelUz: 'Kod yozish / Dasturlash',
    tasks: [
      { title: 'Define requirements and scope', titleUz: 'Talablar va doirani belgilash' },
      { title: 'Set up project structure and dependencies', titleUz: 'Loyiha tuzilmasi va bog\'liqliklarni sozlash' },
      { title: 'Implement core functionality', titleUz: 'Asosiy funksionallikni amalga oshirish' },
      { title: 'Add error handling and edge cases', titleUz: "Xatolarni qayta ishlash va chekka holatlarni qo'shish" },
      { title: 'Write tests and fix bugs', titleUz: "Testlar yozish va xatolarni tuzatish" },
      { title: 'Review, refactor, and deploy', titleUz: "Ko'rib chiqish, qayta ishlash va joylashtirish" },
    ],
  },
  {
    id: 'writing',
    keywords: ['write', 'article', 'blog', 'essay', 'book', 'document', 'report', 'content', 'copy', 'draft'],
    label: 'Writing / Content',
    labelUz: 'Yozish / Kontent',
    tasks: [
      { title: 'Outline main points and structure', titleUz: 'Asosiy fikrlar va tuzilmani belgilash' },
      { title: 'Write first draft', titleUz: 'Birinchi qoralamani yozish' },
      { title: 'Review and revise content', titleUz: "Kontentni ko'rib chiqish va qayta ishlash" },
      { title: 'Edit for clarity and flow', titleUz: 'Aniqlik va oqim uchun tahrirlash' },
      { title: 'Final proofread and publish', titleUz: "So'nggi tekshiruv va nashr qilish" },
    ],
  },
  {
    id: 'fitness',
    keywords: ['fitness', 'workout', 'exercise', 'training', 'run', 'gym', 'health', 'weight', 'marathon', 'sport'],
    label: 'Fitness / Health',
    labelUz: "Fitnes / Sog'liq",
    tasks: [
      { title: 'Set specific fitness goal with timeline', titleUz: "Aniq fitnes maqsadini muddati bilan belgilash" },
      { title: 'Create workout schedule for the week', titleUz: "Hafta uchun mashq jadvalini yaratish" },
      { title: 'Complete first training session', titleUz: "Birinchi mashg'ulotni bajarish" },
      { title: 'Track meals and nutrition for 3 days', titleUz: "3 kun davomida ovqatlanishni kuzatish" },
      { title: 'Review progress and adjust plan', titleUz: "Taraqqiyotni ko'rib chiqish va rejani tuzatish" },
    ],
  },
  {
    id: 'event',
    keywords: ['event', 'plan', 'party', 'meeting', 'conference', 'wedding', 'birthday', 'organize', 'prepare', 'presentation'],
    label: 'Event Planning',
    labelUz: 'Tadbirni rejalashtirish',
    tasks: [
      { title: 'Define event goals and guest list', titleUz: "Tadbir maqsadlari va mehmonlar ro'yxatini belgilash" },
      { title: 'Choose date, time, and venue', titleUz: 'Sana, vaqt va joyni tanlash' },
      { title: 'Plan agenda and activities', titleUz: 'Kun tartibini va faoliyatlarni rejalashtirish' },
      { title: 'Arrange logistics (food, equipment, invites)', titleUz: "Logistikani tashkil qilish (ovqat, jihozlar, taklifnomalar)" },
      { title: 'Do final walkthrough and confirm details', titleUz: "So'nggi tekshiruv va tafsilotlarni tasdiqlash" },
    ],
  },
  {
    id: 'design',
    keywords: ['design', 'ui', 'ux', 'logo', 'brand', 'visual', 'mockup', 'prototype', 'wireframe', 'graphic'],
    label: 'Design',
    labelUz: 'Dizayn',
    tasks: [
      { title: 'Research inspiration and references', titleUz: "Ilhom va ma'lumotlarni izlash" },
      { title: 'Create initial sketches or wireframes', titleUz: "Dastlabki eskizlar yoki wireframelar yaratish" },
      { title: 'Build high-fidelity mockup', titleUz: "Yuqori sifatli mockup yaratish" },
      { title: 'Get feedback and iterate', titleUz: "Fikr-mulohaza olish va takrorlash" },
      { title: 'Finalize and export assets', titleUz: "Yakunlash va assetlarni eksport qilish" },
    ],
  },
];

/**
 * Find matching template for a project title.
 * @param {string} title
 * @returns {object|null} Matching template or null
 */
export function findMatchingTemplate(title) {
  if (!title) return null;
  const lower = title.toLowerCase();
  const words = lower.split(/\s+/);

  let bestMatch = null;
  let bestScore = 0;

  for (const template of PROJECT_TEMPLATES) {
    let score = 0;
    for (const keyword of template.keywords) {
      if (lower.includes(keyword)) score += 2;
      else if (words.some((w) => w.startsWith(keyword.slice(0, 4)))) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = template;
    }
  }

  return bestScore >= 2 ? bestMatch : null;
}
