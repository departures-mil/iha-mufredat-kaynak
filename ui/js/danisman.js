/* v3.2: Yapay zeka danışmanı — sorulara müfredat, öğrenci ve yardım bilgisine dayanarak danışman gibi cevap verir.
   - İnternet varken: kullanıcının KENDİ anahtarıyla Gemini / OpenAI / Claude / Groq / OpenRouter, ya da bilgisayardaki Ollama.
     Anahtar yalnız bu cihazda (localStorage) durur; istekler doğrudan bu cihazdan sağlayıcıya gider; kullanım Ayarlar › Kullanım Limitleri'nde sayılır.
   - İnternet ya da anahtar yoksa: yerleşik çevrimdışı danışman (müfredat + yardım + öğrenci kayıtları + terim sözlüğü üzerinden arama ve rapor).
   - Her cevaba müfredatın ilgili bölümleri, yardım metni ve (sorulduysa) öğrencinin durumu bağlam olarak verilir (RAG). */
(function () {
  'use strict';
  const LANGS = ['tr', 'en', 'ar'];
  const AYAR_KEY = 'iha_danisman_ayar_v1';
  const GECMIS_KEY = 'iha_danisman_gecmis_v1';

  /* ---------- metinler ---------- */
  const TR = {
    nav_danisman: 'Danışman', dnTitle: 'Yapay zeka danışmanı', dnSub: 'Müfredat, ders planlama, öğrenci gelişimi ve İHA teknolojileri hakkında soru sorun. Cevaplar kurumunuzun müfredatına ve kayıtlarına dayanır.',
    dnCardTitle: 'Yapay zeka danışmanı', dnCardHelp: 'Danışman sayfası kendi yapay zeka hesabınızla çalışır. Anahtar yalnız bu cihazda saklanır; istekler doğrudan bu cihazdan sağlayıcıya gider ve sizin ücretsiz kotanızdan düşer (Kullanım Limitleri kartında görünür). Anahtar yoksa ya da internet kesikse yerleşik çevrimdışı danışman devreye girer.',
    dnProvider: 'Sağlayıcı', dnKey: 'API anahtarı', dnKeyPh: 'Anahtarı buraya yapıştırın', dnGetKey: 'Ücretsiz anahtar al', dnModel: 'Model', dnFetchModels: 'Modelleri getir', dnModelsOk: '{n} model listelendi.', dnModelsFail: 'Model listesi alınamadı', dnOllamaUrl: 'Ollama adresi',
    dnAnswerLang: 'Cevap dili', dnAuto: 'Otomatik (arayüz dili)', dnTest: 'Bağlantıyı sına', dnTestOk: 'Bağlantı başarılı: {m}', dnTestFail: 'Bağlantı kurulamadı', dnOfflineFallback: 'İnternet ya da anahtar yoksa yerleşik çevrimdışı danışmanı kullan', dnShow: 'Göster', dnHide: 'Gizle',
    dnNew: 'Yeni sohbet', dnHistory: 'Geçmiş', dnSend: 'Gönder', dnPlaceholder: 'Sorunuzu yazın… (Enter: gönder, Shift+Enter: yeni satır)', dnStudentCtx: 'Öğrenci bağlamı', dnNoStudent: '— yok —', dnOnline: 'Çevrimiçi', dnOffline: 'Çevrimdışı', dnOfflineNote: 'Yerleşik çevrimdışı danışman: cevaplar müfredat, yardım metni ve öğrenci kayıtlarından derlenir. Daha kapsamlı cevaplar için Ayarlar › Yapay zeka danışmanı bölümünden kendi anahtarınızı girin.',
    dnThinking: 'Danışman yazıyor…', dnStop: 'Durdur', dnCopy: 'Kopyala', dnCopied: 'Kopyalandı', dnDelete: 'Sil', dnClear: 'Sohbeti temizle', dnErr: 'Yapay zeka cevabı alınamadı', dnQuota: 'Yapay zeka hesabınızın günlük sınırı doldu; çevrimdışı danışmanla devam edildi.', dnSettings: 'Ayarlar', dnEmpty: 'Henüz sohbet yok.',
    dnSug1: 'Seviye 3 (güç ve itki) için 4 haftalık ders planı öner', dnSug2: 'LiPo batarya güvenliği için öğrenciye verilecek kontrol listesi hazırla', dnSug3: 'Bir öğrencinin seviye sonu değerlendirmesini nasıl yapmalıyım?', dnSug4: 'PID kontrol konusunu yeni başlayanlara nasıl anlatırım?',
    dnOfflineHead: 'Çevrimdışı danışman', dnRelTopics: 'Müfredattaki ilgili konular', dnRelHelp: 'Yardım metninden', dnStudentReport: 'Öğrenci durumu', dnNextSteps: 'Önerilen sonraki adımlar', dnTerms: 'İlgili terimler', dnNothing: 'Bu soruyla doğrudan eşleşen bir müfredat konusu bulunamadı. Soruyu bir seviye, modül ya da öğrenci adıyla sorarsanız daha isabetli olur.', dnStats: 'Genel durum',
    dnStLevel: 'Seviye', dnStOverall: 'Genel puan', dnStRank: 'Unvan', dnStStart: 'Başlangıç', dnStPath: 'Uzmanlık yolu', dnStFlight: 'Uçuş süresi', dnStAchieved: 'kazanıldı', dnStInProg: 'devam ediyor', dnStNot: 'başlanmadı', dnStCompleted: 'tamamlandı (değerlendirme bekliyor)', dnStExamFail: 'Seviye sonu değerlendirmesi «Tekrar»', dnStMissing: 'eksik madde', dnStFocus: 'Önce şu modüllere odaklanın', dnStReady: 'Seviye sonu değerlendirmesine hazır', dnStAll: 'Bütün seviyeler kazanılmış — bitirme projesi ve portfolyo sunumuna geçilebilir.',
    dnDisclaimer: 'Danışman cevapları öneri niteliğindedir; uçuş ve atölye güvenliğinde her zaman kontrol listelerini ve mevzuatı esas alın.', dnKeyLocal: 'Anahtar yalnız bu cihazda saklanır.', dnFreeTag: 'ücretsiz katman', dnLocalTag: 'bilgisayarda, internetsiz', dnMin: 'dk', dnHours: 'ders saati', dnOfflineBecause: 'İnternet yok ya da yapay zeka hesabı tanımlı değil.',
  };
  const EN = {
    nav_danisman: 'Advisor', dnTitle: 'AI advisor', dnSub: 'Ask about the curriculum, lesson planning, student progress and UAV technology. Answers are grounded in your institution\'s curriculum and records.',
    dnCardTitle: 'AI advisor', dnCardHelp: 'The Advisor page runs on your own AI account. The key is stored only on this device; requests go straight from this device to the provider and count against your free quota (shown in the Usage limits card). Without a key or internet the built-in offline advisor takes over.',
    dnProvider: 'Provider', dnKey: 'API key', dnKeyPh: 'Paste the key here', dnGetKey: 'Get a free key', dnModel: 'Model', dnFetchModels: 'Fetch models', dnModelsOk: '{n} models listed.', dnModelsFail: 'Could not fetch the model list', dnOllamaUrl: 'Ollama address',
    dnAnswerLang: 'Answer language', dnAuto: 'Automatic (interface language)', dnTest: 'Test connection', dnTestOk: 'Connected: {m}', dnTestFail: 'Connection failed', dnOfflineFallback: 'Use the built-in offline advisor when there is no internet or key', dnShow: 'Show', dnHide: 'Hide',
    dnNew: 'New chat', dnHistory: 'History', dnSend: 'Send', dnPlaceholder: 'Type your question… (Enter: send, Shift+Enter: new line)', dnStudentCtx: 'Student context', dnNoStudent: '— none —', dnOnline: 'Online', dnOffline: 'Offline', dnOfflineNote: 'Built-in offline advisor: answers are compiled from the curriculum, the help text and student records. For richer answers enter your own key under Settings › AI advisor.',
    dnThinking: 'The advisor is writing…', dnStop: 'Stop', dnCopy: 'Copy', dnCopied: 'Copied', dnDelete: 'Delete', dnClear: 'Clear chat', dnErr: 'No answer from the AI', dnQuota: 'Your AI account\'s daily limit is used up; continued with the offline advisor.', dnSettings: 'Settings', dnEmpty: 'No chats yet.',
    dnSug1: 'Suggest a 4-week lesson plan for Level 3 (power and propulsion)', dnSug2: 'Prepare a LiPo battery safety checklist for students', dnSug3: 'How should I run a student\'s end-of-level assessment?', dnSug4: 'How do I explain PID control to beginners?',
    dnOfflineHead: 'Offline advisor', dnRelTopics: 'Related curriculum topics', dnRelHelp: 'From the help text', dnStudentReport: 'Student status', dnNextSteps: 'Suggested next steps', dnTerms: 'Related terms', dnNothing: 'No curriculum topic matches this question directly. Asking with a level, module or student name gives better results.', dnStats: 'Overview',
    dnStLevel: 'Level', dnStOverall: 'Overall score', dnStRank: 'Rank', dnStStart: 'Start', dnStPath: 'Specialisation path', dnStFlight: 'Flight time', dnStAchieved: 'achieved', dnStInProg: 'in progress', dnStNot: 'not started', dnStCompleted: 'completed (awaiting assessment)', dnStExamFail: 'End-of-level assessment «Repeat»', dnStMissing: 'missing items', dnStFocus: 'Focus on these modules first', dnStReady: 'Ready for the end-of-level assessment', dnStAll: 'All levels achieved — move on to the final project and portfolio presentation.',
    dnDisclaimer: 'Advisor answers are suggestions; for flight and workshop safety always follow the checklists and regulations.', dnKeyLocal: 'The key is stored only on this device.', dnFreeTag: 'free tier', dnLocalTag: 'on this computer, offline', dnMin: 'min', dnHours: 'lesson hours', dnOfflineBecause: 'No internet or no AI account configured.',
  };
  const AR = {
    nav_danisman: 'المستشار', dnTitle: 'المستشار الذكي', dnSub: 'اسأل عن المنهج وتخطيط الدروس وتقدّم الطلاب وتقنيات الطائرات المسيّرة. تستند الإجابات إلى منهج مؤسستك وسجلاتها.',
    dnCardTitle: 'المستشار الذكي', dnCardHelp: 'تعمل صفحة المستشار بحساب الذكاء الاصطناعي الخاص بك. يُحفظ المفتاح على هذا الجهاز فقط؛ تذهب الطلبات مباشرة من هذا الجهاز إلى المزوّد وتُحسب من حصتك المجانية (تظهر في بطاقة حدود الاستخدام). دون مفتاح أو إنترنت يعمل المستشار المدمج دون اتصال.',
    dnProvider: 'المزوّد', dnKey: 'مفتاح API', dnKeyPh: 'الصق المفتاح هنا', dnGetKey: 'احصل على مفتاح مجاني', dnModel: 'النموذج', dnFetchModels: 'جلب النماذج', dnModelsOk: 'تم عرض {n} نموذجًا.', dnModelsFail: 'تعذّر جلب قائمة النماذج', dnOllamaUrl: 'عنوان Ollama',
    dnAnswerLang: 'لغة الإجابة', dnAuto: 'تلقائي (لغة الواجهة)', dnTest: 'اختبار الاتصال', dnTestOk: 'تم الاتصال: {m}', dnTestFail: 'فشل الاتصال', dnOfflineFallback: 'استخدام المستشار المدمج عند عدم وجود إنترنت أو مفتاح', dnShow: 'إظهار', dnHide: 'إخفاء',
    dnNew: 'محادثة جديدة', dnHistory: 'السجل', dnSend: 'إرسال', dnPlaceholder: 'اكتب سؤالك… (Enter: إرسال، Shift+Enter: سطر جديد)', dnStudentCtx: 'سياق الطالب', dnNoStudent: '— لا يوجد —', dnOnline: 'متصل', dnOffline: 'دون اتصال', dnOfflineNote: 'المستشار المدمج دون اتصال: تُجمع الإجابات من المنهج ونص المساعدة وسجلات الطلاب. للحصول على إجابات أغنى أدخل مفتاحك في الإعدادات › المستشار الذكي.',
    dnThinking: 'المستشار يكتب…', dnStop: 'إيقاف', dnCopy: 'نسخ', dnCopied: 'تم النسخ', dnDelete: 'حذف', dnClear: 'مسح المحادثة', dnErr: 'تعذّر الحصول على إجابة', dnQuota: 'نفدت الحصة اليومية لحساب الذكاء الاصطناعي؛ تمت المتابعة بالمستشار دون اتصال.', dnSettings: 'الإعدادات', dnEmpty: 'لا توجد محادثات بعد.',
    dnSug1: 'اقترح خطة دروس لأربعة أسابيع للمستوى 3 (الطاقة والدفع)', dnSug2: 'أعدّ قائمة تحقق لسلامة بطاريات LiPo للطلاب', dnSug3: 'كيف أُجري تقييم نهاية المستوى لطالب؟', dnSug4: 'كيف أشرح التحكم PID للمبتدئين؟',
    dnOfflineHead: 'المستشار دون اتصال', dnRelTopics: 'مواضيع المنهج ذات الصلة', dnRelHelp: 'من نص المساعدة', dnStudentReport: 'حالة الطالب', dnNextSteps: 'الخطوات التالية المقترحة', dnTerms: 'مصطلحات ذات صلة', dnNothing: 'لا يوجد موضوع في المنهج يطابق هذا السؤال مباشرة. اذكر مستوى أو وحدة أو اسم طالب لنتائج أدق.', dnStats: 'نظرة عامة',
    dnStLevel: 'المستوى', dnStOverall: 'الدرجة العامة', dnStRank: 'الرتبة', dnStStart: 'البداية', dnStPath: 'مسار التخصص', dnStFlight: 'زمن الطيران', dnStAchieved: 'مُنجز', dnStInProg: 'قيد التقدم', dnStNot: 'لم يبدأ', dnStCompleted: 'مكتمل (بانتظار التقييم)', dnStExamFail: 'تقييم نهاية المستوى «إعادة»', dnStMissing: 'بنود ناقصة', dnStFocus: 'ركّز على هذه الوحدات أولًا', dnStReady: 'جاهز لتقييم نهاية المستوى', dnStAll: 'أُنجزت كل المستويات — يمكن الانتقال إلى مشروع التخرج وعرض ملف الإنجاز.',
    dnDisclaimer: 'إجابات المستشار اقتراحات؛ في سلامة الطيران والورشة التزم دائمًا بقوائم التحقق والتشريعات.', dnKeyLocal: 'يُحفظ المفتاح على هذا الجهاز فقط.', dnFreeTag: 'فئة مجانية', dnLocalTag: 'على هذا الحاسوب، دون إنترنت', dnMin: 'د', dnHours: 'ساعة دراسية', dnOfflineBecause: 'لا يوجد إنترنت أو لم يُضبط حساب ذكاء اصطناعي.',
  };
  Object.assign(I18N.tr, TR); Object.assign(I18N.en, EN); Object.assign(I18N.ar, AR);

  /* ---------- sağlayıcılar ---------- */
  const SAGLAYICI = {
    gemini: { ad: 'Google Gemini', tag: 'free', anahtar: 'https://aistudio.google.com/apikey', varsayilan: 'gemini-2.5-flash', ornek: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'] },
    openai: { ad: 'OpenAI', tag: '', anahtar: 'https://platform.openai.com/api-keys', varsayilan: 'gpt-4o-mini', ornek: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'] },
    anthropic: { ad: 'Anthropic Claude', tag: '', anahtar: 'https://console.anthropic.com/settings/keys', varsayilan: 'claude-sonnet-4-5', ornek: ['claude-sonnet-4-5', 'claude-haiku-4-5'] },
    groq: { ad: 'Groq', tag: 'free', anahtar: 'https://console.groq.com/keys', varsayilan: 'llama-3.3-70b-versatile', ornek: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'] },
    openrouter: { ad: 'OpenRouter', tag: 'free', anahtar: 'https://openrouter.ai/keys', varsayilan: 'google/gemini-2.0-flash-exp:free', ornek: ['google/gemini-2.0-flash-exp:free', 'meta-llama/llama-3.3-70b-instruct:free'] },
    ollama: { ad: 'Ollama', tag: 'local', anahtar: 'https://ollama.com/download', varsayilan: 'llama3.2', ornek: ['llama3.2', 'qwen2.5', 'gemma3'] },
  };
  const ayarVars = () => ({ saglayici: 'gemini', anahtar: '', model: '', ollama: 'http://localhost:11434', dil: 'auto', cevrimdisi: true, modeller: {} });
  let AY = null;
  function ayar() { if (!AY) { try { AY = Object.assign(ayarVars(), JSON.parse(localStorage.getItem(AYAR_KEY) || '{}')); } catch (e) { AY = ayarVars(); } } return AY; }
  function ayarKaydet() { try { localStorage.setItem(AYAR_KEY, JSON.stringify(AY)); } catch (e) {} }
  const modelAdi = () => { const a = ayar(); return a.model || SAGLAYICI[a.saglayici].varsayilan; };
  const hazir = () => { const a = ayar(); return a.saglayici === 'ollama' ? true : !!(a.anahtar && a.anahtar.trim()); };
  const cevrimici = () => navigator.onLine !== false;

  /* ---------- yardımcılar ---------- */
  const U = () => window.UI;
  const L = () => U().lang();
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const px = (o, l) => (o == null ? '' : typeof o === 'object' ? String(o[l] || o.tr || o.en || o.ar || '') : String(o));
  const plain = (s) => (window.plainText ? plainText(String(s || '')) : String(s || ''));
  const tt = (k, p) => plain(t(k, p));
  const cevapDili = (soru) => { const a = ayar(); if (a.dil && a.dil !== 'auto') return a.dil; if (soru && window.OfflineTR) { try { const d = OfflineTR.detect(soru); if (LANGS.includes(d)) return d; } catch (e) {} } return L(); };
  const DIL_AD = { tr: 'Türkçe', en: 'English', ar: 'العربية' };
  const strip = (h) => String(h || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|li|h\d|tr|div)>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\n{3,}/g, '\n\n').trim();

  /* arama: sözcük kökleri (ilk 5 harf) ile kaba eşleşme — üç dil için yeterli */
  const low = (s) => String(s || '').toLocaleLowerCase('tr').replace(/[İ]/g, 'i');
  const tok = (s) => low(s).replace(/[^\p{L}\p{N}]+/gu, ' ').split(' ').filter((w) => w.length >= 3);
  const kok = (w) => (w.length > 5 ? w.slice(0, 5) : w);
  const DUR = new Set(['için', 'nasıl', 'nedir', 'hangi', 'olan', 'ile', 'bir', 'the', 'and', 'for', 'how', 'what', 'which', 'with', 'this', 'that', 'should', 'about', 'من', 'على', 'إلى', 'كيف', 'ماذا', 'هذا', 'التي', 'الذي', 'ما', 'في', 'عن', 'bana', 'öner', 'anlat', 'ver', 'yap', 'misin', 'mısın', 'lütfen', 'please', 'tell', 'give', 'explain']);
  function sorguKok(soru) { const s = new Set(); tok(soru).forEach((w) => { if (!DUR.has(w)) s.add(kok(w)); }); return [...s]; }
  function puan(metin, kokler) { if (!kokler.length) return 0; const ws = tok(metin).map(kok); let p = 0; for (const k of kokler) if (ws.includes(k)) p++; return p; }
  const triHepsi = (o) => (o && typeof o === 'object' ? LANGS.map((l) => o[l] || '').join(' ') : String(o || ''));

  /* ---------- bağlam (RAG) ---------- */
  function modulKodu(l, m) { try { return Store.moduleCode(l, m); } catch (e) { return ''; } }
  function anahat(l) {
    const c = Store.cur(); const out = [];
    out.push(px(c.title, l) + ' — ' + tt('program') + ': ' + plain(t('prog_' + Store.prog)));
    (c.levels || []).forEach((lv, i) => {
      if (lv.off) return;
      out.push(`${tt('level')} ${i}: ${px(lv.title, l)} (${lv.hours || 0} ${tt('hoursShort')}; ${tt('prereq')}: ${px(lv.prereq, l)}; ${tt('goal')}: ${px(lv.goal, l)})`);
      (lv.modules || []).forEach((m) => { if (!m.off) out.push(`  ${modulKodu(lv, m)} ${px(m.title, l)}${m.added ? ' (' + tt('added') + ')' : ''} [${(m.items || []).filter((x) => !x.off).length} ${tt('items').toLowerCase()}]`); });
    });
    return out.join('\n');
  }
  function ilgiliModuller(soru, l, n) {
    const kokler = sorguKok(soru); const c = Store.cur(); const liste = [];
    (c.levels || []).forEach((lv, i) => (lv.modules || []).forEach((m) => {
      if (lv.off || m.off) return;
      let p = puan(triHepsi(m.title), kokler) * 3 + puan(triHepsi(lv.title), kokler);
      (m.items || []).forEach((it) => { p += puan(triHepsi(it.text), kokler); });
      const sayi = soru.match(/\b(\d{1,2})\b/g); if (sayi && sayi.map(Number).includes(i) && /seviye|level|مستوى/i.test(soru)) p += 4;
      if (p > 0) liste.push({ p, lv, i, m });
    }));
    liste.sort((a, b) => b.p - a.p);
    return liste.slice(0, n || 6).map((x) => ({ ...x, metin: `${tt('level')} ${x.i} › ${modulKodu(x.lv, x.m)} ${px(x.m.title, l)}\n` + (x.m.items || []).filter((it) => !it.off).map((it) => '  - ' + px(it.text, l)).join('\n') }));
  }
  function yardimBolumleri(soru, l, n) {
    const h = window.HELP && (HELP[l] || HELP.tr); if (!h) return [];
    const kokler = sorguKok(soru);
    const parcalar = String(h).split(/(?=<h3)/i).map((s) => strip(s)).filter((s) => s.length > 40);
    return parcalar.map((s) => ({ p: puan(s, kokler), s })).filter((x) => x.p > 0).sort((a, b) => b.p - a.p).slice(0, n || 3).map((x) => x.s.length > 1600 ? x.s.slice(0, 1600) + '…' : x.s);
  }
  function terimler(soru, l) {
    const G = window.GLOSSARY || []; const kokler = sorguKok(soru); const out = [];
    for (const g of G) { if (!Array.isArray(g) || g[0].length < 3) continue; if (kokler.some((k) => kok(low(g[0])) === k || kok(low(g[1])) === k || (g[2] && kok(low(g[2])) === k))) out.push(g); if (out.length >= 12) break; }
    return out;
  }
  function ogrenciBul(soru) {
    const q = low(soru); const st = Store.students(true, 'all');
    const hit = st.filter((s) => { const ad = low(s.name || '').trim(); if (ad.length < 3) return false; if (q.includes(ad)) return true; const parcalar = ad.split(/\s+/).filter((x) => x.length >= 3); return parcalar.length > 1 && parcalar.every((p) => q.includes(p)); });
    return hit.slice(0, 3);
  }
  function ogrenciRapor(s, l) {
    return Store.inProg(Store.progOf(s), () => {
      const r = Store.rankOf(s); const LV = Store.levels(); const yol = Store.pathLevels(s); const path = Store.paths().find((p) => p.id === s.path);
      const o = [];
      o.push(`${s.name}${s.no ? ' (#' + s.no + ')' : ''} — ${tt('program')}: ${plain(t('prog_' + Store.progOf(s)))}; ${tt('dnStOverall')}: %${Store.overall(s)}; ${tt('dnStRank')}: ${px(r.rank.name, l)}; ${tt('dnStStart')}: ${s.start || '—'}; ${tt('dnStPath')}: ${path ? px(path.name, l) : '—'}; ${tt('dnStFlight')}: ${Store.flightMinutes(s)} ${tt('dnMin')}${s.archived ? ' (archived)' : ''}`);
      if (s.background) o.push('  ' + plain(s.background).slice(0, 300));
      const odak = []; let hazirLv = null; let siradaki = null;
      for (const i of yol) {
        const lv = LV[i]; if (!lv || Store.lvOff(s, lv)) continue;
        const st = Store.levelStatus(s, lv); const ls = Store.levelStats(s, lv); const ev = s.evals[lv.id] || {};
        const durum = st === 'achieved' ? tt('dnStAchieved') : st === 'completed' ? tt('dnStCompleted') : st === 'inProgress' ? tt('dnStInProg') : tt('dnStNot');
        o.push(`  ${tt('dnStLevel')} ${i} ${px(lv.title, l)}: %${ls.pct} (${ls.done}/${ls.total}) — ${durum}${ev.result === 'fail' ? '; ' + tt('dnStExamFail') : ''}${ev.result === 'pass' ? '; ' + (ev.score != null ? ev.score + '/100 ' : '') + (ev.date || '') : ''}`);
        if (!siradaki && st !== 'achieved') {
          siradaki = { i, lv, ls, st };
          if (st === 'completed') hazirLv = i;
          Store.actMods(lv, s).forEach((m) => { const ms = Store.moduleStats(s, m); if (ms.total && ms.done < ms.total) odak.push({ kod: modulKodu(lv, m), ad: px(m.title, l), eksik: ms.total - ms.done, items: Store.actItems(m, s).filter((it) => !Store.isDone(s, it.id)).map((it) => px(it.text, l)) }); });
        }
      }
      odak.sort((a, b) => b.eksik - a.eksik);
      const son = (s.journal || []).slice(-3).map((j) => `  ${j.date || ''}: ${plain(j.text || j.note || '').slice(0, 200)}`).filter((x) => x.trim().length > 3);
      return { metin: o.join('\n'), odak: odak.slice(0, 5), hazirLv, siradaki, son, s };
    });
  }
  function genelDurum(l) {
    const st = Store.students(false, 'all'); const c = Store.counts(); const C = Store.db.config;
    const ort = st.length ? Math.round(st.reduce((a, s) => a + Store.overall(s), 0) / st.length) : 0;
    const dag = {}; st.forEach((s) => { const n = px(Store.rankOf(s).rank.name, l); dag[n] = (dag[n] || 0) + 1; });
    const planlar = (Store.plans ? Store.plans() : []).slice(0, 10).map((p) => `  - ${p.name || p.id} (${(p.students || []).length})`).join('\n');
    return `${tt('institution')}: ${C.institution.name || '—'}; ${tt('defaultInstructor')}: ${C.institution.instructor || '—'}\n${tt('statStudents')}: ${st.length}; ${tt('statLevels')}: ${c.levels}; ${tt('statModules')}: ${c.modules}; ${tt('statItems')}: ${c.items}; ${tt('statAvg')}: %${ort}\n${tt('rankDist')}: ${Object.entries(dag).map(([k, v]) => k + ' ' + v).join(', ') || '—'}\n${tt('scoring')}: ${tt('passPct')} %${C.scoring.passPct}, ${tt('passScore')} ${C.scoring.passScore}, ${tt('requireExam')}: ${C.scoring.requireExam ? '✓' : '✗'}\n${tt('ranks')}: ${Store.ranks().map((r) => px(r.name, l) + ' [' + (r.req || '') + (r.minScore ? ' ≥' + r.minScore : '') + ']').join(' → ')}${planlar ? '\n' + tt('nav_plans') + ':\n' + planlar : ''}`;
  }
  function ogrenciListesi(l) { return Store.students(false, 'all').slice(0, 80).map((s) => `  - ${s.name}: %${Store.overall(s)}, ${px(Store.rankOf(s).rank.name, l)}, ${plain(t('prog_' + Store.progOf(s)))}`).join('\n'); }

  function baglam(soru, l, secili) {
    const B = []; const ogr = []; if (secili) ogr.push(secili);
    ogrenciBul(soru).forEach((s) => { if (!ogr.some((x) => x.id === s.id)) ogr.push(s); });
    B.push('### ' + tt('appName') + ' v' + Platform.version + ' (' + Platform.kind + ')\n' + genelDurum(l));
    B.push('### ' + tt('nav_curriculum') + ' (' + tt('levels') + ' / ' + tt('modules') + ')\n' + anahat(l));
    const mods = ilgiliModuller(soru, l, 6); if (mods.length) B.push('### ' + tt('dnRelTopics') + '\n' + mods.map((m) => m.metin).join('\n\n'));
    const hb = yardimBolumleri(soru, l, 3); if (hb.length) B.push('### ' + tt('dnRelHelp') + '\n' + hb.join('\n\n'));
    if (ogr.length) B.push('### ' + tt('dnStudentReport') + '\n' + ogr.map((s) => { const r = ogrenciRapor(s, l); return r.metin + (r.odak.length ? '\n  ' + tt('dnStFocus') + ': ' + r.odak.map((o) => `${o.kod} ${o.ad} (${o.eksik} ${tt('dnStMissing')}: ${o.items.slice(0, 6).join('; ')})`).join(' | ') : '') + (r.son.length ? '\n  ' + tt('nav_students') + ' notes:\n' + r.son.join('\n') : ''); }).join('\n\n'));
    else if (/öğrenci|ogrenci|student|طالب|طلاب|sınıf|class|kurs/i.test(soru)) B.push('### ' + tt('nav_students') + '\n' + ogrenciListesi(l));
    const tr = terimler(soru, l); if (tr.length) B.push('### ' + tt('dnTerms') + '\n' + tr.map((g) => `${g[0]} = ${g[1]} = ${g[2] || ''}`).join('\n'));
    return B.join('\n\n');
  }
  function sistemMetni(l) {
    const K = Store.db.config.institution;
    const S = {
      tr: `Sen "${tt('appName')}" programının içinde çalışan, İHA (drone) teknolojileri eğitimi konusunda uzman bir eğitim danışmanısın. Kurum: ${K.name || '—'}. Kullanıcı bir eğitmen/yöneticidir.
Görevin: müfredat planlama, ders anlatım yöntemleri, öğrenci değerlendirme ve gelişim takibi, atölye/uçuş güvenliği, İHA elektroniği-aerodinamiği-yazılımı ve program kullanımı konularında danışman gibi, yüksek kalitede, uygulanabilir cevaplar vermek.
Kurallar: (1) Aşağıdaki BAĞLAM verisini (müfredat, yardım metni, öğrenci kayıtları) esas al; kayıtlardaki sayıları uydurma, bağlamda yoksa "kayıtlarda yok" de. (2) Önce kısa ve net sonuç, sonra gerekçe ve adımlar. (3) Ders planı istenirse hafta/oturum, süre, hedef, uygulama ve ölçme başlıklarıyla ver; müfredattaki seviye/modül kodlarına atıf yap. (4) Güvenlik konularında kontrol listesi ver, riskleri belirt. (5) Markdown kullan: başlık, madde, gerekirse tablo; gereksiz uzatma. (6) Cevap dili: ${DIL_AD[l]}.`,
      en: `You are an expert training advisor for UAV (drone) technology education, running inside the "${tt('appName')}" program. Institution: ${K.name || '—'}. The user is an instructor/administrator.
Your job: give high-quality, actionable advice like a consultant on curriculum planning, teaching methods, student assessment and progress tracking, workshop/flight safety, UAV electronics-aerodynamics-software and using the program.
Rules: (1) Ground answers in the CONTEXT below (curriculum, help text, student records); never invent numbers from records — if it is not in the context say "not in the records". (2) Lead with a short, clear conclusion, then reasoning and steps. (3) For lesson plans give week/session, duration, objective, practice and assessment, referring to level/module codes from the curriculum. (4) For safety topics give a checklist and name the risks. (5) Use Markdown: headings, bullets, tables when useful; no padding. (6) Answer language: ${DIL_AD[l]}.`,
      ar: `أنت مستشار تدريب خبير في تعليم تقنيات الطائرات المسيّرة، تعمل داخل برنامج "${tt('appName')}". المؤسسة: ${K.name || '—'}. المستخدم مدرّب/مسؤول.
مهمتك: تقديم نصائح عالية الجودة وقابلة للتطبيق كمستشار في تخطيط المنهج وطرق التدريس وتقييم الطلاب ومتابعة تقدمهم وسلامة الورشة والطيران وإلكترونيات/ديناميكا/برمجيات الطائرات المسيّرة واستخدام البرنامج.
القواعد: (1) استند إلى السياق أدناه (المنهج، نص المساعدة، سجلات الطلاب)؛ لا تخترع أرقامًا من السجلات، وإن لم تكن في السياق فقل "غير موجود في السجلات". (2) ابدأ بخلاصة قصيرة وواضحة ثم التعليل والخطوات. (3) لخطط الدروس اذكر الأسبوع/الجلسة والمدة والهدف والتطبيق والتقييم مع الإشارة إلى رموز المستوى/الوحدة في المنهج. (4) في مواضيع السلامة قدّم قائمة تحقق واذكر المخاطر. (5) استخدم Markdown: عناوين ونقاط وجداول عند الحاجة؛ دون حشو. (6) لغة الإجابة: ${DIL_AD[l]}.`,
    };
    return S[l] || S.tr;
  }

  /* ---------- sağlayıcı istekleri (akışlı) ---------- */
  let durdur = null;
  async function* sse(resp) {
    const rd = resp.body.getReader(); const dec = new TextDecoder(); let buf = '';
    while (true) {
      const { value, done } = await rd.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      let i; while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i).replace(/\r$/, ''); buf = buf.slice(i + 1); if (line.startsWith('data:')) yield line.slice(5).trim(); }
    }
    if (buf.startsWith('data:')) yield buf.slice(5).trim();
  }
  async function hataMetni(r) { let s = ''; try { s = await r.text(); } catch (e) {} let m = s; try { const j = JSON.parse(s); m = (j.error && (j.error.message || j.error.type)) || j.message || s; } catch (e) {} return 'HTTP ' + r.status + (m ? ': ' + String(m).slice(0, 300) : ''); }
  const kotaMi = (e) => /HTTP 429|RESOURCE_EXHAUSTED|quota|rate_limit|insufficient_quota/i.test(String(e && e.message || e));

  async function sor(mesajlar, sistem, onParca, sinyal) {
    const a = ayar(); const sg = a.saglayici; const model = modelAdi(); let token = 0;
    const say = (n) => { if (n && window.Kullanim && sg !== 'ollama') Kullanim.ekle({ aiToken: n }); };
    if (sg === 'gemini') {
      const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':streamGenerateContent?alt=sse&key=' + encodeURIComponent(a.anahtar.trim());
      const body = { system_instruction: { parts: [{ text: sistem }] }, contents: mesajlar.map((m) => ({ role: m.r === 'u' ? 'user' : 'model', parts: [{ text: m.t }] })), generationConfig: { temperature: 0.4, maxOutputTokens: 4096 } };
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: sinyal });
      if (!r.ok) throw new Error(await hataMetni(r));
      let out = '';
      for await (const d of sse(r)) { if (!d || d === '[DONE]') continue; let j; try { j = JSON.parse(d); } catch (e) { continue; } const p = j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts; if (p) for (const x of p) if (x.text) { out += x.text; onParca(out); } if (j.usageMetadata) token = +j.usageMetadata.totalTokenCount || token; }
      say(token); return out;
    }
    if (sg === 'anthropic') {
      const body = { model, max_tokens: 4096, system: sistem, temperature: 0.4, stream: true, messages: mesajlar.map((m) => ({ role: m.r === 'u' ? 'user' : 'assistant', content: m.t })) };
      const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': a.anahtar.trim(), 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify(body), signal: sinyal });
      if (!r.ok) throw new Error(await hataMetni(r));
      let out = '';
      for await (const d of sse(r)) { if (!d) continue; let j; try { j = JSON.parse(d); } catch (e) { continue; } if (j.type === 'content_block_delta' && j.delta && j.delta.text) { out += j.delta.text; onParca(out); } if (j.type === 'message_start' && j.message && j.message.usage) token += +j.message.usage.input_tokens || 0; if (j.type === 'message_delta' && j.usage) token += +j.usage.output_tokens || 0; }
      say(token); return out;
    }
    // OpenAI uyumlu: openai, groq, openrouter, ollama
    const taban = sg === 'openai' ? 'https://api.openai.com/v1' : sg === 'groq' ? 'https://api.groq.com/openai/v1' : sg === 'openrouter' ? 'https://openrouter.ai/api/v1' : (a.ollama || 'http://localhost:11434').replace(/\/+$/, '') + '/v1';
    const body = { model, temperature: 0.4, stream: true, messages: [{ role: 'system', content: sistem }].concat(mesajlar.map((m) => ({ role: m.r === 'u' ? 'user' : 'assistant', content: m.t }))) };
    if (sg !== 'ollama') body.stream_options = { include_usage: true };
    if (sg === 'openrouter') body.usage = { include: true };
    const h = { 'Content-Type': 'application/json' }; if (sg !== 'ollama') h.Authorization = 'Bearer ' + a.anahtar.trim();
    if (sg === 'openrouter') { h['HTTP-Referer'] = 'https://github.com/departures-mil/iha-mufredat-kaynak'; h['X-Title'] = 'IHA Mufredat Sistemi'; }
    const r = await fetch(taban + '/chat/completions', { method: 'POST', headers: h, body: JSON.stringify(body), signal: sinyal });
    if (!r.ok) throw new Error(await hataMetni(r));
    let out = '';
    for await (const d of sse(r)) { if (!d || d === '[DONE]') continue; let j; try { j = JSON.parse(d); } catch (e) { continue; } const c = j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content; if (c) { out += c; onParca(out); } if (j.usage) token = +j.usage.total_tokens || token; }
    say(token); return out;
  }
  async function modelleriGetir() {
    const a = ayar(); const sg = a.saglayici; let liste = [];
    if (sg === 'gemini') { const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=' + encodeURIComponent(a.anahtar.trim())); if (!r.ok) throw new Error(await hataMetni(r)); const j = await r.json(); liste = (j.models || []).filter((m) => (m.supportedGenerationMethods || []).includes('generateContent')).map((m) => String(m.name).replace(/^models\//, '')); }
    else if (sg === 'anthropic') { const r = await fetch('https://api.anthropic.com/v1/models?limit=100', { headers: { 'x-api-key': a.anahtar.trim(), 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' } }); if (!r.ok) throw new Error(await hataMetni(r)); const j = await r.json(); liste = (j.data || []).map((m) => m.id); }
    else { const taban = sg === 'openai' ? 'https://api.openai.com/v1' : sg === 'groq' ? 'https://api.groq.com/openai/v1' : sg === 'openrouter' ? 'https://openrouter.ai/api/v1' : (a.ollama || 'http://localhost:11434').replace(/\/+$/, '') + '/v1'; const h = {}; if (sg !== 'ollama') h.Authorization = 'Bearer ' + a.anahtar.trim(); const r = await fetch(taban + '/models', { headers: h }); if (!r.ok) throw new Error(await hataMetni(r)); const j = await r.json(); liste = (j.data || []).map((m) => m.id); if (sg === 'openai') liste = liste.filter((x) => /^(gpt|o\d|chatgpt)/.test(x) && !/audio|realtime|tts|transcribe|search|image|embedding|moderation/.test(x)); if (sg === 'openrouter') liste = liste.filter((x) => /:free$/.test(x)).concat(liste.filter((x) => !/:free$/.test(x))); }
    liste = liste.filter(Boolean).sort((x, y) => x.localeCompare(y));
    a.modeller[sg] = liste.slice(0, 300); ayarKaydet(); return liste;
  }

  /* ---------- çevrimdışı danışman ---------- */
  function cevrimdisiCevap(soru, l, secili) {
    const B = []; const ogr = []; if (secili) ogr.push(secili);
    ogrenciBul(soru).forEach((s) => { if (!ogr.some((x) => x.id === s.id)) ogr.push(s); });
    B.push(`> **${tt('dnOfflineHead')}** — ${tt('dnOfflineBecause')} ${tt('dnOfflineNote')}`);
    const istat = /kaç|how many|كم|istatistik|statistic|إحصا|ortalama|average|متوسط|genel durum|overview|نظرة/i.test(soru);
    if (istat && !ogr.length) B.push(`## ${tt('dnStats')}\n` + genelDurum(l).split('\n').map((x) => '- ' + x).join('\n') + (/öğrenci|student|طالب|طلاب/i.test(soru) ? '\n\n' + ogrenciListesi(l) : ''));
    for (const s of ogr) {
      const r = ogrenciRapor(s, l);
      B.push(`## ${tt('dnStudentReport')}: ${s.name}\n` + r.metin.split('\n').map((x, i) => (i ? '- ' + x.trim() : '**' + x + '**')).join('\n'));
      const n = [];
      if (!r.siradaki) n.push(tt('dnStAll'));
      else {
        if (r.hazirLv != null) n.push(`${tt('dnStReady')}: ${tt('dnStLevel')} ${r.hazirLv}.`);
        if (r.siradaki.st === 'inProgress' || r.siradaki.st === 'notStarted') n.push(`${tt('dnStLevel')} ${r.siradaki.i} — ${px(r.siradaki.lv.title, l)}: %${r.siradaki.ls.pct} (${r.siradaki.ls.done}/${r.siradaki.ls.total}).`);
        if (r.odak.length) n.push(`${tt('dnStFocus')}:\n` + r.odak.map((o) => `  - **${o.kod} ${o.ad}** — ${o.eksik} ${tt('dnStMissing')}: ${o.items.slice(0, 5).join('; ')}${o.items.length > 5 ? '…' : ''}`).join('\n'));
        const ev = s.evals[r.siradaki.lv.id]; if (ev && ev.result === 'fail') n.push(tt('dnStExamFail') + ' → ' + px(r.siradaki.lv.goal, l));
      }
      if (r.son.length) n.push(tt('recent') + ':\n' + r.son.map((x) => '  - ' + x.trim()).join('\n'));
      B.push(`### ${tt('dnNextSteps')}\n` + n.map((x) => '- ' + x).join('\n'));
    }
    const mods = ilgiliModuller(soru, l, 5);
    if (mods.length) B.push(`## ${tt('dnRelTopics')}\n` + mods.map((m) => `### ${tt('level')} ${m.i} › ${modulKodu(m.lv, m.m)} ${px(m.m.title, l)}\n*${px(m.lv.title, l)} — ${m.lv.hours || 0} ${tt('dnHours')}; ${tt('prereq')}: ${px(m.lv.prereq, l)}; ${tt('goal')}: ${px(m.lv.goal, l)}*\n` + (m.m.items || []).filter((it) => !it.off).map((it) => '- ' + px(it.text, l)).join('\n')).join('\n\n'));
    const hb = yardimBolumleri(soru, l, 2);
    if (hb.length) B.push(`## ${tt('dnRelHelp')}\n` + hb.map((s) => s.split('\n').map((x) => x.trim()).filter(Boolean).map((x, i) => (i === 0 ? '**' + x + '**' : x)).join('\n\n')).join('\n\n---\n\n'));
    const tr = terimler(soru, l);
    if (tr.length) B.push(`## ${tt('dnTerms')}\n| TR | EN | AR |\n|---|---|---|\n` + tr.map((g) => `| ${g[0]} | ${g[1]} | ${g[2] || ''} |`).join('\n'));
    if (!mods.length && !hb.length && !ogr.length && !istat) B.push(tt('dnNothing'));
    return B.join('\n\n');
  }

  /* ---------- markdown ---------- */
  function satirIci(s) {
    s = esc(s);
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, '$1<i>$2</i>');
    s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" data-ext>$1</a>');
    return s;
  }
  function md(src) {
    const lines = String(src || '').replace(/\r/g, '').split('\n'); const out = []; let i = 0;
    const para = [];
    const flush = () => { if (para.length) { out.push('<p>' + satirIci(para.join(' ')) + '</p>'); para.length = 0; } };
    while (i < lines.length) {
      const ln = lines[i];
      if (/^```/.test(ln)) { flush(); const code = []; i++; while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]); i++; out.push('<pre><code>' + esc(code.join('\n')) + '</code></pre>'); continue; }
      const h = ln.match(/^(#{1,4})\s+(.*)$/); if (h) { flush(); const n = Math.min(4, h[1].length + 1); out.push(`<h${n}>${satirIci(h[2])}</h${n}>`); i++; continue; }
      if (/^\s*>/.test(ln)) { flush(); const q = []; while (i < lines.length && /^\s*>/.test(lines[i])) q.push(lines[i++].replace(/^\s*>\s?/, '')); out.push('<blockquote>' + md(q.join('\n')) + '</blockquote>'); continue; }
      if (/^\s*[-*_]{3,}\s*$/.test(ln)) { flush(); out.push('<hr>'); i++; continue; }
      if (/^\s*\|.*\|\s*$/.test(ln) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
        flush(); const cells = (x) => x.trim().replace(/^\||\|$/g, '').split('|').map((c) => satirIci(c.trim()));
        const head = cells(ln); i += 2; const rows = [];
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(cells(lines[i++]));
        out.push('<table><thead><tr>' + head.map((c) => '<th>' + c + '</th>').join('') + '</tr></thead><tbody>' + rows.map((r) => '<tr>' + r.map((c) => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody></table>'); continue;
      }
      const li = ln.match(/^(\s*)([-*•]|\d+[.)])\s+(.*)$/);
      if (li) {
        flush(); const ol = /\d/.test(li[2]); const items = []; const ind = li[1].length;
        while (i < lines.length) {
          const m = lines[i].match(/^(\s*)([-*•]|\d+[.)])\s+(.*)$/);
          if (m && m[1].length === ind && (/\d/.test(m[2]) === ol)) { items.push([m[3]]); i++; }
          else if (m && m[1].length > ind && items.length) { const sub = []; while (i < lines.length && (lines[i].match(/^(\s*)/)[1].length > ind) && lines[i].trim()) sub.push(lines[i++].slice(ind + 2)); items[items.length - 1].push(md(sub.join('\n'))); }
          else if (!m && lines[i].trim() && /^\s{2,}/.test(lines[i]) && items.length) { items[items.length - 1][0] += ' ' + lines[i].trim(); i++; }
          else break;
        }
        out.push((ol ? '<ol>' : '<ul>') + items.map((it) => '<li>' + satirIci(it[0]) + (it[1] || '') + '</li>').join('') + (ol ? '</ol>' : '</ul>')); continue;
      }
      if (!ln.trim()) { flush(); i++; continue; }
      para.push(ln.trim()); i++;
    }
    flush(); return out.join('');
  }

  /* ---------- geçmiş ---------- */
  let G = null;
  function gecmis() { if (!G) { try { G = JSON.parse(localStorage.getItem(GECMIS_KEY) || '{}'); } catch (e) { G = {}; } if (!Array.isArray(G.list)) G.list = []; } return G; }
  function gecmisKaydet() { try { const g = gecmis(); g.list = g.list.slice(0, 40); g.list.forEach((c) => { c.msgs = c.msgs.slice(-60); }); localStorage.setItem(GECMIS_KEY, JSON.stringify(g)); } catch (e) {} }
  function yeniSohbet() { const c = { id: 'c' + Date.now().toString(36), ts: Date.now(), title: '', msgs: [] }; gecmis().list.unshift(c); gecmis().cur = c.id; gecmisKaydet(); return c; }
  function sohbet() { const g = gecmis(); let c = g.list.find((x) => x.id === g.cur); if (!c) { c = g.list[0] || null; if (c) g.cur = c.id; } return c || yeniSohbet(); }

  /* ---------- sayfa ---------- */
  let mesgul = false; let seciliOgr = '';
  function durumChip() {
    const a = ayar(); const on = hazir() && (cevrimici() || a.saglayici === 'ollama');
    let dolu = false; try { dolu = !!(window.Kullanim && Kullanim.ozet().bugun.aiDoldu); } catch (e) {}
    return `<span class="dn-chip ${on ? 'on' : 'off'}" title="${esc(on ? SAGLAYICI[a.saglayici].ad + ' · ' + modelAdi() + (dolu ? ' — ' + tt('dnQuota') : '') : tt('dnOfflineBecause'))}">${on ? '● ' + tt('dnOnline') + ' · ' + esc(SAGLAYICI[a.saglayici].ad) + (dolu ? ' ⚠' : '') : '○ ' + tt('dnOffline')}</span>`;
  }
  function mesajHtml(m) {
    const dir = m.l === 'ar' ? 'rtl' : 'ltr';
    return `<div class="dn-msg ${m.r === 'u' ? 'u' : 'a'} ${m.mode === 'offline' ? 'off' : ''}" data-mid="${m.id}" dir="${dir}" lang="${m.l || ''}"><div class="dn-av">${m.r === 'u' ? U().icon('users') : U().icon('spark')}</div><div class="dn-bub"><div class="dn-md">${m.r === 'u' ? '<p>' + esc(m.t).replace(/\n/g, '<br>') + '</p>' : md(m.t)}</div><div class="dn-meta"><span>${new Date(m.ts || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${m.r === 'a' ? ' · ' + (m.mode === 'offline' ? tt('dnOffline') : esc(m.model || '')) : ''}</span>${m.r === 'a' ? `<button class="ib sm dn-copy" title="${tt('dnCopy')}">${U().icon('copy')}</button>` : ''}</div></div></div>`;
  }
  function sayfa(m) {
    const { $, $$, icon, go, t } = U(); const c = sohbet(); const st = Store.students(false, 'all');
    m.innerHTML = `<div class="dn-wrap">
      <div class="dn-head"><h2 class="ph">${icon('spark')} ${t('dnTitle')}</h2><div class="dn-tools">${durumChip()}<button class="btn sm" id="dnNew">${icon('plus')} ${t('dnNew')}</button><button class="btn sm ghost" id="dnHist">${icon('archive')} ${t('dnHistory')}</button><button class="btn sm ghost" id="dnSet">${icon('gear')} ${t('dnSettings')}</button></div></div>
      <div class="dn-list" id="dnList">${c.msgs.length ? c.msgs.map(mesajHtml).join('') : `<div class="dn-empty"><div class="dn-big">${icon('spark', 'big')}</div><p class="muted">${t('dnSub')}</p><div class="dn-sug">${[1, 2, 3, 4].map((i) => `<button class="chip" data-sug="${i}">${t('dnSug' + i)}</button>`).join('')}</div>${!hazir() ? `<p class="muted sm">${t('dnOfflineNote')}</p>` : ''}</div>`}</div>
      <div class="dn-in"><div class="dn-ctx"><label class="fl in"><span>${t('dnStudentCtx')}</span><select id="dnStu"><option value="">${t('dnNoStudent')}</option>${st.map((s) => `<option value="${s.id}" ${s.id === seciliOgr ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label></div>
        <div class="dn-row"><textarea id="dnQ" rows="2" placeholder="${esc(plain(t('dnPlaceholder')))}"></textarea><button class="btn pri" id="dnSend">${icon('chev')} ${t('dnSend')}</button></div>
        <p class="muted sm dn-disc">${t('dnDisclaimer')}</p></div></div>`;
    const list = $('#dnList', m); const q = $('#dnQ', m);
    const gonder = () => { const v = q.value.trim(); if (!v || mesgul) return; q.value = ''; gonderMesaj(v, m); };
    $('#dnSend', m).onclick = gonder;
    q.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); gonder(); } };
    $('#dnStu', m).onchange = (e) => { seciliOgr = e.target.value; };
    $('#dnNew', m).onclick = () => { if (mesgul) return; yeniSohbet(); sayfa(m); };
    $('#dnSet', m).onclick = () => go('settings', { anchor: 'danisman' });
    $('#dnHist', m).onclick = () => gecmisPenceresi(m);
    $$('[data-sug]', m).forEach((b) => (b.onclick = () => { q.value = plain(t('dnSug' + b.dataset.sug)); gonder(); }));
    list.onclick = (e) => { const cp = e.target.closest('.dn-copy'); if (cp) { const mid = cp.closest('.dn-msg').dataset.mid; const mm = sohbet().msgs.find((x) => x.id === mid); if (mm) { navigator.clipboard && navigator.clipboard.writeText(mm.t); toast(tt('dnCopied')); } } const a = e.target.closest('a[data-ext]'); if (a) { e.preventDefault(); try { Platform.openUrl(a.href); } catch (er) { window.open(a.href, '_blank'); } } };
    try { U().biScan(m); } catch (e) {}
    list.scrollTop = list.scrollHeight; setTimeout(() => q.focus(), 50);
  }
  function gecmisPenceresi(m) {
    const { modal, esc: E, icon, $$ } = U(); const g = gecmis();
    const body = g.list.length ? `<div class="dn-hist">${g.list.map((c) => `<div class="dn-hi ${c.id === g.cur ? 'on' : ''}" data-cid="${c.id}"><div><b>${E(c.title || (c.msgs[0] && c.msgs[0].t.slice(0, 60)) || '…')}</b><div class="muted sm">${new Date(c.ts).toLocaleString()} · ${c.msgs.length}</div></div><button class="ib danger" data-del="${c.id}" title="${tt('dnDelete')}">${icon('trash')}</button></div>`).join('')}</div>` : `<p class="muted">${tt('dnEmpty')}</p>`;
    const w = modal(tt('dnHistory'), body, { foot: false });
    $$('[data-cid]', w.el).forEach((el) => (el.onclick = (e) => { if (e.target.closest('[data-del]')) return; g.cur = el.dataset.cid; gecmisKaydet(); w.close(); sayfa(m); }));
    $$('[data-del]', w.el).forEach((b) => (b.onclick = () => { g.list = g.list.filter((c) => c.id !== b.dataset.del); if (g.cur === b.dataset.del) g.cur = null; gecmisKaydet(); w.close(); sayfa(m); }));
  }
  async function gonderMesaj(soru, m) {
    const { $ } = U(); const c = sohbet(); const l = cevapDili(soru); const secili = seciliOgr ? Store.db.students[seciliOgr] : null;
    const um = { id: 'm' + Date.now().toString(36), r: 'u', t: soru, ts: Date.now(), l: (window.OfflineTR ? OfflineTR.detect(soru) : l) };
    c.msgs.push(um); if (!c.title) c.title = soru.slice(0, 60); gecmisKaydet();
    const list = $('#dnList', m); if (!list) return;
    if (list.querySelector('.dn-empty')) list.innerHTML = '';
    list.insertAdjacentHTML('beforeend', mesajHtml(um));
    const am = { id: 'm' + (Date.now() + 1).toString(36), r: 'a', t: '', ts: Date.now(), l, mode: 'online', model: modelAdi() };
    list.insertAdjacentHTML('beforeend', mesajHtml(am));
    const el = list.lastElementChild; const mdEl = el.querySelector('.dn-md'); mdEl.innerHTML = `<p class="muted dn-think">${tt('dnThinking')}</p>`;
    list.scrollTop = list.scrollHeight;
    mesgul = true; const send = $('#dnSend', m); if (send) { send.disabled = true; }
    const a = ayar(); let online = hazir() && (cevrimici() || a.saglayici === 'ollama');
    const ctrl = new AbortController(); durdur = () => ctrl.abort();
    let son = 0; const ciz = (txt, bitti) => { const now = Date.now(); if (!bitti && now - son < 90) return; son = now; mdEl.innerHTML = md(txt) + (bitti ? '' : '<span class="dn-cur">▍</span>'); const yakin = list.scrollHeight - list.scrollTop - list.clientHeight < 160; if (yakin) list.scrollTop = list.scrollHeight; };
    let metin = '';
    if (online) {
      try {
        const gecmisMsj = c.msgs.slice(-9, -1).filter((x) => x.t).map((x) => ({ r: x.r, t: x.t }));
        const sistem = sistemMetni(l) + '\n\n===== ' + (l === 'tr' ? 'BAĞLAM' : l === 'ar' ? 'السياق' : 'CONTEXT') + ' =====\n' + baglam(soru, l, secili);
        metin = await sor(gecmisMsj.concat([{ r: 'u', t: soru }]), sistem, (x) => ciz(x, false), ctrl.signal);
        if (!metin.trim()) throw new Error('empty');
      } catch (e) {
        console.warn('danisman', e);
        if (e && e.name === 'AbortError') { metin = metin || '…'; }
        else {
          if (kotaMi(e)) { window.Kullanim && Kullanim.kotaDoldu('ai'); toast(tt('dnQuota'), 'err'); }
          else toast(tt('dnErr') + ' — ' + String(e.message || e).slice(0, 160), 'err');
          online = false;
        }
      }
    }
    if (!online) { am.mode = 'offline'; am.model = ''; metin = cevrimdisiCevap(soru, l, secili); el.classList.add('off'); }
    am.t = metin; am.ts = Date.now(); c.msgs.push(am); gecmisKaydet();
    ciz(metin, true); const meta = el.querySelector('.dn-meta span'); if (meta) meta.textContent = new Date(am.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + (am.mode === 'offline' ? tt('dnOffline') : am.model);
    mesgul = false; durdur = null; if (send) send.disabled = false; const q = $('#dnQ', m); if (q) q.focus();
    const chip = $('.dn-chip', m); if (chip) chip.outerHTML = durumChip();
  }

  /* ---------- ayarlar kartı ---------- */
  function cardHtml() {
    const { icon, t } = U(); const a = ayar(); const S = SAGLAYICI[a.saglayici];
    const tag = S.tag === 'free' ? `<span class="pill">${t('dnFreeTag')}</span>` : S.tag === 'local' ? `<span class="pill">${t('dnLocalTag')}</span>` : '';
    const modeller = (a.modeller[a.saglayici] || []).concat(S.ornek).filter((x, i, arr) => arr.indexOf(x) === i);
    return `<div class="card" id="danisman"><h3>${icon('spark')} ${t('dnCardTitle')}</h3><p class="muted sm">${t('dnCardHelp')}</p>
      <div class="grid2">
        <label class="fl"><span>${t('dnProvider')}</span><select id="dnProv">${Object.keys(SAGLAYICI).map((k) => `<option value="${k}" ${k === a.saglayici ? 'selected' : ''}>${SAGLAYICI[k].ad}${SAGLAYICI[k].tag === 'free' ? ' · ' + plain(t('dnFreeTag')) : SAGLAYICI[k].tag === 'local' ? ' · ' + plain(t('dnLocalTag')) : ''}</option>`).join('')}</select></label>
        <label class="fl"><span>${t('dnModel')} ${tag}</span><div class="dn-inrow"><input id="dnModel" dir="ltr" list="dnModels" value="${esc(a.model || '')}" placeholder="${esc(S.varsayilan)}"><datalist id="dnModels">${modeller.map((x) => `<option value="${esc(x)}">`).join('')}</datalist><button class="btn sm ghost" id="dnModels">${icon('sync')} ${t('dnFetchModels')}</button></div></label>
        ${a.saglayici === 'ollama' ? `<label class="fl"><span>${t('dnOllamaUrl')}</span><input id="dnOllama" dir="ltr" value="${esc(a.ollama)}"></label>` : `<label class="fl"><span>${t('dnKey')}</span><div class="dn-inrow"><input id="dnKey" type="password" dir="ltr" autocomplete="off" value="${esc(a.anahtar)}" placeholder="${esc(plain(t('dnKeyPh')))}"><button class="btn sm ghost" id="dnEye">${t('dnShow')}</button></div></label>`}
        <label class="fl"><span>${t('dnAnswerLang')}</span><select id="dnLang"><option value="auto" ${a.dil === 'auto' ? 'selected' : ''}>${t('dnAuto')}</option>${LANGS.map((l) => `<option value="${l}" ${a.dil === l ? 'selected' : ''}>${DIL_AD[l]}</option>`).join('')}</select></label>
      </div>
      <label class="chk"><input type="checkbox" id="dnOff" ${a.cevrimdisi !== false ? 'checked' : ''}> ${t('dnOfflineFallback')}</label>
      <div class="row"><button class="btn" id="dnTest">${icon('bolt')} ${t('dnTest')}</button><button class="btn ghost" id="dnGetKey">${icon('globe')} ${t('dnGetKey')} (${S.ad})</button><button class="btn ghost" id="dnOpen">${icon('spark')} ${t('nav_danisman')}</button></div>
      <p class="muted sm">${t('dnKeyLocal')}</p></div>`;
  }
  function wire(m) {
    const { $, go } = U(); const kart = $('#danisman', m); if (!kart) return; const a = ayar();
    const yenile = () => { kart.outerHTML = cardHtml(); wire(m); };
    $('#dnProv', kart).onchange = (e) => { a.saglayici = e.target.value; a.model = ''; ayarKaydet(); yenile(); };
    $('#dnModel', kart).onchange = (e) => { a.model = e.target.value.trim(); ayarKaydet(); };
    const k = $('#dnKey', kart); if (k) { k.oninput = () => { a.anahtar = k.value.trim(); ayarKaydet(); }; $('#dnEye', kart).onclick = () => { k.type = k.type === 'password' ? 'text' : 'password'; $('#dnEye', kart).textContent = plain(t(k.type === 'password' ? 'dnShow' : 'dnHide')); }; }
    const o = $('#dnOllama', kart); if (o) o.onchange = () => { a.ollama = o.value.trim() || 'http://localhost:11434'; ayarKaydet(); };
    $('#dnLang', kart).onchange = (e) => { a.dil = e.target.value; ayarKaydet(); };
    $('#dnOff', kart).onchange = (e) => { a.cevrimdisi = e.target.checked; ayarKaydet(); };
    $('#dnGetKey', kart).onclick = () => { const u = SAGLAYICI[a.saglayici].anahtar; try { Platform.openUrl(u); } catch (e) { window.open(u, '_blank'); } };
    $('#dnOpen', kart).onclick = () => go('danisman');
    $('#dnModels', kart).onclick = async (e) => { const b = e.currentTarget; b.disabled = true; try { const ls = await modelleriGetir(); toast(tt('dnModelsOk', { n: ls.length })); yenile(); } catch (er) { toast(tt('dnModelsFail') + ' — ' + String(er.message || er).slice(0, 120), 'err'); } b.disabled = false; };
    $('#dnTest', kart).onclick = async (e) => { const b = e.currentTarget; b.disabled = true; try { const r = await sor([{ r: 'u', t: 'ping' }], 'Reply with the single word OK.', () => {}); toast(tt('dnTestOk', { m: modelAdi() + ' → ' + String(r).trim().slice(0, 40) })); } catch (er) { toast(tt('dnTestFail') + ' — ' + String(er.message || er).slice(0, 160), 'err'); } b.disabled = false; };
  }

  /* ---------- dışa ---------- */
  function mount() {
    const { PAGES } = U();
    PAGES.danisman = (m) => sayfa(m);
    window.addEventListener('online', () => { const c = document.querySelector('.dn-chip'); if (c) c.outerHTML = durumChip(); });
    window.addEventListener('offline', () => { const c = document.querySelector('.dn-chip'); if (c) c.outerHTML = durumChip(); });
  }
  if (window.UI && UI.PAGES) mount();
  window.Danisman = { cardHtml, wire, mount, ayar, hazir, saglayiciAdi: () => SAGLAYICI[ayar().saglayici].ad + (hazir() ? ' · ' + modelAdi() : ''), md, baglam, cevrimdisiCevap, SAGLAYICI };
})();
