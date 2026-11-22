/* Yardım içeriği (TR / EN / AR) */
window.HELP = {
tr: `
<h3 id="ped">0. Müfredat sistemi (pedagoji)</h3>
<p>Müfredat 13 seviye ve 93 modülden oluşur; her seviye bir öncekinin üzerine kurulur ve seviye sonu değerlendirmesi geçilmeden sonrakine geçilmez. Seviye 0–8 herkes için ortak çekirdektir; Seviye 9–11 uzmanlık, Seviye 12 bitirme aşamasıdır. “ek” işaretli modüller müfredatın bütünlüğü için eklenen konulardır.</p>
<ul><li><b>Basitten karmaşığa, somuttan soyuta:</b> önce elle tutulan parçalar (batarya, motor, lehim), sonra soyut kavramlar (PID, EKF, TECS).</li>
<li><b>Ön koşul zinciri:</b> ESC’den önce motor ve batarya; EKF’den önce IMU, barometre ve GNSS.</li>
<li><b>Sarmal tekrar:</b> kritik konular üç kez, derinleşerek döner (örn. PID: Seviye 5 arayüz, Seviye 8 uçuş, Seviye 9 log analizi).</li>
<li><b>Önce güvenlik:</b> her atölye ve saha dersi kontrol listesiyle başlar ve biter.</li>
<li><b>Yaparak öğrenme:</b> teori/uygulama oranı Seviye 0–3’te 50/50, 4–8’de 40/60, 9–12’de 30/70.</li>
<li><b>Portfolyo:</b> ölçüm, fotoğraf, log ve notlar tek portfolyoda toplanır; bitirme projesi bunun üzerine kurulur.</li>
<li><b>Bilişsel basamaklar:</b> 0–2 hatırlama/anlama · 3–5 uygulama · 6–8 analiz · 9–11 değerlendirme · 12 yaratma.</li>
<li><b>Her dersin döngüsü:</b> ön bilgi yoklaması → kısa teori (en çok 20 dk) → eğitmen gösterimi → öğrenci uygulaması → kontrol listesiyle doğrulama → çıkış sorusu ve portfolyo kaydı.</li>
<li><b>Uzmanlık yolları:</b> A FPV pilot-teknisyen (0–8, 9.1–9.2, 12, ≈520 sa) · B Sabit kanat-otopilot (0–9, 12, ≈570 sa) · C RF-haberleşme (0–8, 10, 12, ≈540 sa) · D Otonomi-yazılım (0–9, 11, 12, ≈620 sa). Tam program ≈660 ders saati (haftada 30 saatle ≈22 hafta).</li>
<li><b>Ölçme:</b> modül notu = kısa sınav %30 + uygulama %50 + portfolyo %20; geçme 70/100. Uygulama rubriği: güvenlik, doğruluk, işçilik/düzen, gerekçelendirme (her biri 1–4). Güvenlik ihlali puandan bağımsız olarak tekrar gerektirir.</li></ul>
<h3>1. Hızlı başlangıç</h3>
<ol><li><b>Öğrenciler → Öğrenci ekle</b> ile öğrenciyi kaydedin (isterseniz uzmanlık yolunu seçin).</li>
<li><b>Değerlendirme</b> sekmesinde müfredatın onay kutulu kopyası açılır. Öğrencinin bildiği maddeleri <b>Biliyor</b> (yeşil), birlikte çalıştıklarınızı <b>Çalıştık</b> (mavi) olarak işaretleyin. Modül satırındaki kutular o modülün tüm maddelerini birden işaretler.</li>
<li><b>Yoklama modu</b> maddeleri tek tek sorar: klavyede 1 = Biliyor, 2 = Çalıştık, 3 = Sonra.</li>
<li>Seviye sonu değerlendirmesini girin (Geçti / Tekrar, puan, tarih). <b>Onayla</b> düğmesi seviyeyi kilitler; yanlışlıkla değiştirilemez.</li></ol>
<h3>2. Puan ve unvan nasıl hesaplanır?</h3>
<ul><li>“Biliyor” ya da “Çalıştık” işaretli madde tamamlanmış sayılır. Seviye yüzdesi = tamamlanan / toplam madde.</li>
<li>Seviye, Ayarlar’daki orana (varsayılan %80) ulaşınca kazanılır. İsterseniz “seviye sonu değerlendirmesi Geçti olmalı” şartını açabilirsiniz.</li>
<li>Genel puan, seviyelerin ders saatine göre ağırlıklı ortalamasıdır.</li>
<li>Unvanlar: Aday → Öğrenci → Çırak → Stajyer → Teknisyen → Operatör → Uzman Operatör → Eğitmen. Ad, renk, gerekli seviye ve en az puan <b>Ayarlar → Unvanlar</b> bölümünden değiştirilebilir.</li></ul>
<h3>3. Müfredatı düzenleme</h3>
<ul><li><b>Müfredat</b> sayfasında seviye, alt kategori (modül) ve madde ekleyebilir, adını düzeltebilir, silebilir; sürükle-bırak ya da oklarla yerini değiştirebilirsiniz. Modül ve madde başka bir seviyeye/modüle taşınabilir.</li>
<li>Her metin Türkçe, İngilizce ve Arapça tutulur. “Boş dilleri otomatik çevir” işaretliyse eksik diller internet varken otomatik çevrilir; dilerseniz elle düzeltin. <b>Eksik çevirileri tamamla</b> düğmesi tüm müfredatı tarar.</li>
<li>Her seviye, modül ve maddenin yanındaki <b>aç/kapa anahtarı</b> ile istenmeyen konular <b>silinmeden</b> etkisiz hâle getirilir: soluk görünür, çıktılarda yer almaz, puana ve unvana katılmaz, değerlendirmede gizlenir. Tekrar açılınca öğrencilerin eski işaretleri aynen geri gelir.</li>
<li>📎 düğmesiyle her seviye, modül ya da maddeye <b>belge</b> (PDF, DOCX, görsel, video dosyası… en çok 25 MB) ve <b>video/web linki</b> eklenir. Linkler tek tıkla açılır, kopyalanıp öğrenciye gönderilebilir; çıktıya QR kodlu basılabilir.</li></ul>
<h3>4. Çıktılar ve antetli kâğıt</h3>
<ul><li><b>Çıktılar</b>: boş müfredat kontrol listesi (öğrenciye verilecek), öğrenci durum raporu, seviye değerlendirme formu, unvan belgesi, sınıf özeti, uçuş kayıt formu.</li>
<li>Çıktı dili arayüzden bağımsız seçilir; <b>ikinci dil</b> seçilirse her satırın altına çevirisi eklenir. Notlar da istenirse çevrilir.</li>
<li><b>Şablonları yönet</b> ile antetli kâğıdınızı (PDF, DOCX, PNG, JPG) yükleyin; ilk sayfası arka plana yerleştirilir. Yazıların antetle çakışmaması için üst/alt boşluğu (mm) ayarlayıp <b>Önizle</b> ile kontrol edin.</li>
<li>Yazdır, PDF kaydet ya da DOCX kaydet seçilebilir. Android’de PDF için yazdırma ekranında “PDF olarak kaydet”i seçin.</li></ul>
<h3 id="fb">5. Masaüstü ↔ telefon bağlantısı (Firebase)</h3>
<p>Firebase projesi (<code>mufredat-bc0ad</code>) uygulamaya gömülüdür; yapılandırma yapıştırmanız gerekmez.</p>
<ol><li>Yönetici, Firebase konsolunda <b>Authentication → Users → Add user</b> ile hesap ekler (yeni hesap açma kapalıdır).</li>
<li>Her cihazda <b>Ayarlar → Senkronizasyon</b>: aynı <b>kurum kodunu</b> (örn. <code>iha-mufredat</code>), e-posta ve şifreyi yazıp <b>Giriş yap ve bağlan</b>’a basın.</li></ol>
<p>Bundan sonra müfredat, öğrenciler, değerlendirmeler, ayarlar ve belgeler iki cihaz arasında otomatik eşitlenir. İnternet yokken çalışmaya devam edilir; bağlantı gelince eşitlenir. Aynı kayıt iki cihazda aynı anda değiştirilirse son kaydedilen geçerli olur.</p>
<h3 id="upd">6. Güncellemeler (uygulama içinden, tek tık)</h3>
<ul><li>Yeni sürüm yayınlandığında üst çubukta turuncu <b>“Güncelleme vX.Y”</b> düğmesi çıkar (ya da <b>Ayarlar → Güncellemeler → Güncellemeleri denetle</b>).</li>
<li><b>Güncelle</b>’ye basın; bittiğinde <b>Yeniden başlat</b>’a basın. Uygulama yeni sürümle, sürüm adı dahil güncellenmiş olarak açılır. Hiçbir dosya indirmeniz ya da kurmanız gerekmez.</li>
<li>Tüm ayarlar, öğrenciler, işaretler, şablonlar ve belgeler korunur. Yeni sürüm açılamazsa uygulama kendiliğinden önceki sürüme döner.</li>
<li>Güncellemeler doğrudan Firebase’e yayınlanır; sizin herhangi bir dosya indirmeniz, seçmeniz ya da kurmanız gerekmez. (Yedek yol: <b>Ayarlar → Güncellemeler → Güncellemeyi yayınla</b> ile <code>.ihu</code> dosyası da yayınlanabilir.)</li>
<li>Yine de ara sıra <b>Ayarlar → Yedekleme</b> ile yedek alın; masaüstü her gün otomatik yedek alır. Android uygulamasını kaldırmayın (kaldırırsanız telefondaki veriler silinir).</li></ul>
<h3 id="prog">7. Eğitim programları: Genel İHA, Kanatlı, FPV</h3>
<ul><li>Üst çubuktaki program seçiciden (ya da Panel ve Müfredat sayfasındaki düğmelerden) çalışılacak program seçilir. Müfredat, değerlendirme, puan, unvan, uçuş hattı ve çıktılar seçilen programa göre çalışır.</li>
<li><b>Kanatlı</b>: sıfırdan usta pilota sabit kanat eğitimi (aerodinamik, meteoroloji, montaj, kalkış-iniş, otopilot, acil durumlar). <b>FPV</b>: simülatör, kumanda, lehim, montaj, Betaflight, video, akro uçuş, PID/filtre ve blackbox analizi.</li>
<li>Her programın müfredatına konusuna özel seviye, modül ve madde eklenebilir; düzenlenebilir, sıralanabilir ve aç/kapat düğmesiyle etkisiz kılınabilir. Unvan koşulları ve uzmanlık yolları Ayarlar’da program bazında düzenlenir.</li>
<li>Her öğrenci bir programa atanır (öğrenci formu → Eğitim programı). Öğrenci açıldığında uygulama otomatik olarak o öğrencinin programına geçer.</li></ul>
<h3 id="contact">8. Yönetici iletişimi</h3>
<ul><li><b>Ayarlar → Yönetici İletişimi</b> bölümünden fikir, öneri ve taleplerinizi doğrudan yöneticiye iletebilirsiniz. Bağlantı yoksa mesaj saklanır ve bağlantı gelince otomatik gönderilir.</li></ul>`,
en: `
<h3 id="ped">0. The curriculum system (pedagogy)</h3>
<p>The curriculum has 13 levels and 93 modules; each level builds on the previous one and the next level starts only after the end-of-level evaluation is passed. Levels 0–8 are the common core for everyone; levels 9–11 are specializations and level 12 is graduation. Modules marked “added” were added for completeness.</p>
<ul><li><b>Simple to complex, concrete to abstract:</b> first tangible parts (battery, motor, soldering), then abstract concepts (PID, EKF, TECS).</li>
<li><b>Prerequisite chain:</b> motor and battery before ESC; IMU, barometer and GNSS before EKF.</li>
<li><b>Spiral repetition:</b> critical topics return three times, deeper each time (e.g. PID: level 5 interface, level 8 flight, level 9 log analysis).</li>
<li><b>Safety first:</b> every workshop and field lesson starts and ends with a checklist.</li>
<li><b>Learning by doing:</b> theory/practice ratio 50/50 in levels 0–3, 40/60 in 4–8, 30/70 in 9–12.</li>
<li><b>Portfolio:</b> measurements, photos, logs and notes are collected in one portfolio; the graduation project builds on it.</li>
<li><b>Cognitive steps:</b> 0–2 remember/understand · 3–5 apply · 6–8 analyse · 9–11 evaluate · 12 create.</li>
<li><b>Lesson cycle:</b> prior-knowledge check → short theory (max. 20 min) → instructor demonstration → student practice → checklist verification → exit question and portfolio entry.</li>
<li><b>Specialization paths:</b> A FPV pilot-technician (0–8, 9.1–9.2, 12, ≈520 h) · B Fixed wing-autopilot (0–9, 12, ≈570 h) · C RF-communication (0–8, 10, 12, ≈540 h) · D Autonomy-software (0–9, 11, 12, ≈620 h). Full programme ≈660 lesson hours (≈22 weeks at 30 h/week).</li>
<li><b>Assessment:</b> module grade = quiz 30% + practice 50% + portfolio 20%; pass 70/100. Practice rubric: safety, accuracy, workmanship/order, justification (1–4 each). A safety violation requires a retake regardless of score.</li></ul>
<h3>1. Quick start</h3>
<ol><li>Register the student via <b>Students → Add student</b> (optionally choose a specialization path).</li>
<li>The <b>Assessment</b> tab opens a copy of the curriculum with tick boxes. Mark what the student already knows as <b>Knows</b> (green) and what you studied together as <b>Studied</b> (blue). The boxes on a module row mark all its items at once.</li>
<li><b>Quick check mode</b> asks item by item: keyboard 1 = Knows, 2 = Studied, 3 = Later.</li>
<li>Enter the end-of-level evaluation (Passed / Retake, score, date). <b>Approve</b> locks the level so it cannot be changed by mistake.</li></ol>
<h3>2. How score and rank are calculated</h3>
<ul><li>An item marked “Knows” or “Studied” counts as completed. Level percentage = completed / total items.</li>
<li>A level is achieved when it reaches the rate in Settings (default 80%). Optionally you can require the end-of-level evaluation to be “Passed”.</li>
<li>The overall score is the average of levels weighted by lesson hours.</li>
<li>Ranks: Candidate → Student → Apprentice → Intern → Technician → Operator → Specialist Operator → Instructor. Names, colours, required levels and minimum scores can be changed in <b>Settings → Ranks</b>.</li></ul>
<h3>3. Editing the curriculum</h3>
<ul><li>On the <b>Curriculum</b> page you can add, rename and delete levels, sub-categories (modules) and items, and reorder them by drag and drop or with the arrows. Modules and items can be moved to another level/module.</li>
<li>Every text is kept in Turkish, English and Arabic. With “Auto-translate empty languages” missing languages are translated automatically when online; you can correct them by hand. <b>Complete missing translations</b> scans the whole curriculum.</li>
<li>The <b>on/off switch</b> next to each level, module and item disables unwanted topics <b>without deleting</b> them: they appear faded, are left out of printouts, scoring and ranks, and are hidden in the assessment. When switched on again, the students’ earlier marks come back unchanged.</li>
<li>With the 📎 button you can attach <b>documents</b> (PDF, DOCX, images, video files… up to 25 MB) and <b>video/web links</b> to any level, module or item. Links open with one click, can be copied and sent to students, and can be printed with QR codes.</li></ul>
<h3>4. Printouts and letterhead</h3>
<ul><li><b>Printouts</b>: blank curriculum checklist (to hand to the student), student status report, level evaluation form, rank certificate, class summary, flight record form.</li>
<li>The output language is chosen independently of the interface; with a <b>second language</b> each line gets its translation underneath. Notes can be translated too.</li>
<li>Upload your letterhead (PDF, DOCX, PNG, JPG) with <b>Manage templates</b>; its first page is placed in the background. Adjust the top/bottom margins (mm) so the text does not overlap and check with <b>Preview</b>.</li>
<li>Print, Save PDF or Save DOCX. On Android choose “Save as PDF” in the print screen.</li></ul>
<h3 id="fb">5. Desktop ↔ phone connection (Firebase)</h3>
<p>The Firebase project (<code>mufredat-bc0ad</code>) is built into the application; you do not need to paste any configuration.</p>
<ol><li>The administrator adds accounts in the Firebase console via <b>Authentication → Users → Add user</b> (self sign-up is disabled).</li>
<li>On each device, <b>Settings → Synchronization</b>: type the same <b>institution code</b> (e.g. <code>iha-mufredat</code>), the e-mail and password, then press <b>Sign in and connect</b>.</li></ol>
<p>From then on the curriculum, students, assessments, settings and documents are synced automatically. Work continues offline and syncs when the connection returns. If the same record is changed on both devices at once, the last save wins.</p>
<h3 id="upd">6. Updates (in-app, one click)</h3>
<ul><li>When a new version is published, an orange <b>“Update vX.Y”</b> button appears in the top bar (or use <b>Settings → Updates → Check for updates</b>).</li>
<li>Press <b>Update</b>; when it finishes press <b>Restart</b>. The application opens with the new version, version name included. Nothing needs to be downloaded or installed.</li>
<li>All settings, students, marks, templates and documents are kept. If the new version cannot start, the application returns to the previous version by itself.</li>
<li>Updates are published directly to Firebase; you never need to download, choose or install any file. (Fallback: an <code>.ihu</code> file can also be published via <b>Settings → Updates → Publish update</b>.)</li>
<li>Still, take a backup now and then via <b>Settings → Backup</b>; the desktop takes an automatic backup every day. Do not uninstall the Android app (that would delete the data on the phone).</li></ul>
<h3 id="prog">7. Training programmes: General UAV, Fixed-wing, FPV</h3>
<ul><li>Choose the programme from the selector in the top bar (or the buttons on the Dashboard and Curriculum pages). Curriculum, assessment, score, rank, flight track and printouts follow the selected programme.</li>
<li><b>Fixed-wing</b>: fixed-wing training from zero to master pilot (aerodynamics, meteorology, assembly, take-off/landing, autopilot, emergencies). <b>FPV</b>: simulator, radio, soldering, assembly, Betaflight, video, acro flight, PID/filters and blackbox analysis.</li>
<li>Each programme's curriculum can be extended with topic-specific levels, modules and items, which can be edited, reordered and disabled with the on/off switch. Rank conditions and specialisation paths are edited per programme in Settings.</li>
<li>Every student is assigned to a programme (student form → Training programme). Opening a student switches the app to that student's programme automatically.</li></ul>
<h3 id="contact">8. Contacting the administrator</h3>
<ul><li>Use <b>Settings → Contact the Administrator</b> to send ideas, suggestions and requests directly to the administrator. Without a connection the message is kept and sent automatically later.</li></ul>`,
ar: `
<h3 id="ped">0. نظام المنهج (الأسس التربوية)</h3>
<p>يتكون المنهج من 13 مستوى و93 وحدة؛ يُبنى كل مستوى على سابقه ولا يُنتقل إلى التالي قبل اجتياز تقييم نهاية المستوى. المستويات 0–8 جذع مشترك للجميع، و9–11 تخصصات، و12 مرحلة التخرج. الوحدات المعلَّمة «مضاف» أُضيفت لاستكمال المنهج.</p>
<ul><li><b>من البسيط إلى المعقد ومن المحسوس إلى المجرد:</b> أولاً القطع الملموسة (البطارية، المحرك، اللحام) ثم المفاهيم المجردة (PID، EKF، TECS).</li>
<li><b>سلسلة المتطلبات:</b> المحرك والبطارية قبل ESC؛ وIMU والبارومتر وGNSS قبل EKF.</li>
<li><b>التكرار الحلزوني:</b> تعود المواضيع الحرجة ثلاث مرات بعمق أكبر (مثلاً PID: المستوى 5 الواجهة، 8 الطيران، 9 تحليل السجلات).</li>
<li><b>السلامة أولاً:</b> يبدأ كل درس في الورشة أو الميدان وينتهي بقائمة فحص.</li>
<li><b>التعلم بالممارسة:</b> نسبة النظري/العملي 50/50 في المستويات 0–3، و40/60 في 4–8، و30/70 في 9–12.</li>
<li><b>ملف الإنجاز:</b> تُجمع القياسات والصور والسجلات والملاحظات في ملف واحد يُبنى عليه مشروع التخرج.</li>
<li><b>المراحل المعرفية:</b> 0–2 التذكر/الفهم · 3–5 التطبيق · 6–8 التحليل · 9–11 التقييم · 12 الإبداع.</li>
<li><b>دورة الدرس:</b> فحص المعرفة السابقة ← نظري قصير (20 دقيقة كحد أقصى) ← عرض المدرّب ← تطبيق المتدرب ← التحقق بقائمة الفحص ← سؤال الخروج وتسجيل ملف الإنجاز.</li>
<li><b>مسارات التخصص:</b> أ طيار FPV - فني (0–8، 9.1–9.2، 12، ≈520 ساعة) · ب جناح ثابت - طيار آلي (0–9، 12، ≈570) · ج الترددات الراديوية - الاتصالات (0–8، 10، 12، ≈540) · د الاستقلالية - البرمجيات (0–9، 11، 12، ≈620). البرنامج الكامل ≈660 ساعة (≈22 أسبوعاً بمعدل 30 ساعة أسبوعياً).</li>
<li><b>التقييم:</b> درجة الوحدة = اختبار قصير 30% + تطبيق 50% + ملف إنجاز 20%؛ النجاح 70/100. معايير التطبيق: السلامة، الدقة، الإتقان/الترتيب، التعليل (1–4 لكل منها). مخالفة السلامة تستوجب الإعادة بغض النظر عن الدرجة.</li></ul>
<h3>1. البدء السريع</h3>
<ol><li>سجّل المتدرب عبر <b>المتدربون ← إضافة متدرب</b> (ويمكنك اختيار مسار التخصص).</li>
<li>يفتح تبويب <b>التقييم</b> نسخة من المنهج مع مربعات التأشير. أشِّر ما يعرفه المتدرب بـ <b>يعرف</b> (أخضر) وما درستماه معاً بـ <b>دَرَسنا</b> (أزرق). مربعات سطر الوحدة تؤشر جميع بنودها دفعة واحدة.</li>
<li><b>وضع الفحص السريع</b> يسأل عن البنود واحداً تلو الآخر: من لوحة المفاتيح 1 = يعرف، 2 = دَرَسنا، 3 = لاحقاً.</li>
<li>أدخل تقييم نهاية المستوى (ناجح / إعادة، الدرجة، التاريخ). زر <b>اعتماد</b> يقفل المستوى حتى لا يُغيَّر خطأً.</li></ol>
<h3>2. كيف تُحسب الدرجة والرتبة؟</h3>
<ul><li>البند المؤشَّر «يعرف» أو «دَرَسنا» يُعدّ مكتملاً. نسبة المستوى = البنود المكتملة / مجموع البنود.</li>
<li>يُجتاز المستوى عند بلوغ النسبة المحددة في الإعدادات (80% افتراضياً). ويمكن اشتراط أن يكون تقييم نهاية المستوى «ناجح».</li>
<li>الدرجة العامة هي متوسط المستويات مرجّحاً بالساعات التدريسية.</li>
<li>الرتب: مرشّح ← طالب ← متدرّب مبتدئ ← متدرّب ← فنّي ← مشغّل ← مشغّل متخصص ← مدرّب. يمكن تغيير الأسماء والألوان والمستويات المطلوبة وأدنى درجة من <b>الإعدادات ← الرتب</b>.</li></ul>
<h3>3. تعديل المنهج</h3>
<ul><li>في صفحة <b>المنهج</b> يمكنك إضافة المستويات والفئات الفرعية (الوحدات) والبنود وتعديل أسمائها وحذفها وتغيير ترتيبها بالسحب والإفلات أو بالأسهم، ونقل الوحدة أو البند إلى مستوى/وحدة أخرى.</li>
<li>يُحفظ كل نص بالتركية والإنجليزية والعربية. عند تفعيل «ترجمة اللغات الفارغة تلقائياً» تُترجم اللغات الناقصة آلياً عند توفر الإنترنت، ويمكن تصحيحها يدوياً. زر <b>إكمال الترجمات الناقصة</b> يفحص المنهج كله.</li>
<li>يُعطَّل الموضوع غير المرغوب <b>دون حذفه</b> عبر <b>مفتاح التشغيل/الإيقاف</b> بجانب كل مستوى ووحدة وبند: يظهر باهتاً، ولا يدخل في المطبوعات ولا في الدرجة والرتبة، ويُخفى في التقييم. وعند إعادة تفعيله تعود علامات المتدربين السابقة كما هي.</li>
<li>بزر 📎 تُضاف إلى كل مستوى أو وحدة أو بند <b>مستندات</b> (PDF، DOCX، صور، ملفات فيديو… حتى 25 ميغابايت) و<b>روابط فيديو/ويب</b>. تُفتح الروابط بنقرة واحدة، ويمكن نسخها وإرسالها للمتدرب، وطباعتها مع رموز QR.</li></ul>
<h3>4. المطبوعات والورق الرسمي</h3>
<ul><li><b>المطبوعات</b>: قائمة المنهج الفارغة (تُسلَّم للمتدرب)، تقرير حالة المتدرب، نموذج تقييم المستوى، شهادة الرتبة، ملخص الصف، نموذج سجل الطيران.</li>
<li>تُختار لغة المطبوع بشكل مستقل عن الواجهة؛ وعند اختيار <b>لغة ثانية</b> تُضاف الترجمة تحت كل سطر. ويمكن ترجمة الملاحظات أيضاً.</li>
<li>ارفع ورقتك الرسمية (PDF، DOCX، PNG، JPG) عبر <b>إدارة القوالب</b>؛ توضع صفحتها الأولى في الخلفية. اضبط الهامشين العلوي والسفلي (مم) حتى لا يتداخل النص وتحقق عبر <b>معاينة</b>.</li>
<li>يمكن الطباعة أو حفظ PDF أو حفظ DOCX. على أندرويد اختر «حفظ بتنسيق PDF» في شاشة الطباعة.</li></ul>
<h3 id="fb">5. ربط الحاسوب بالهاتف (Firebase)</h3>
<p>مشروع Firebase ‏(<code>mufredat-bc0ad</code>) مدمج في التطبيق؛ لا حاجة للصق أي إعدادات.</p>
<ol><li>يضيف المسؤول الحسابات من لوحة Firebase عبر <b>Authentication ← Users ← Add user</b> (إنشاء الحساب الذاتي معطّل).</li>
<li>على كل جهاز: <b>الإعدادات ← المزامنة</b>: اكتب <b>رمز المؤسسة</b> نفسه (مثلاً <code>iha-mufredat</code>) والبريد وكلمة المرور ثم اضغط <b>تسجيل الدخول والاتصال</b>.</li></ol>
<p>بعدها تتم مزامنة المنهج والمتدربين والتقييمات والإعدادات والمستندات تلقائياً. يستمر العمل دون إنترنت وتتم المزامنة عند عودة الاتصال. إذا عُدِّل السجل نفسه على الجهازين في الوقت نفسه يُعتمد آخر حفظ.</p>
<h3 id="upd">6. التحديثات (من داخل التطبيق بنقرة واحدة)</h3>
<ul><li>عند نشر إصدار جديد يظهر زر برتقالي <b>«تحديث vX.Y»</b> في الشريط العلوي (أو من <b>الإعدادات ← التحديثات ← التحقق من التحديثات</b>).</li>
<li>اضغط <b>تحديث</b>، وعند الانتهاء اضغط <b>إعادة التشغيل</b>. يُفتح التطبيق بالإصدار الجديد بما في ذلك اسم الإصدار، دون تنزيل أو تثبيت أي ملف.</li>
<li>تُحفظ جميع الإعدادات والمتدربين والعلامات والقوالب والمستندات. وإن تعذّر تشغيل الإصدار الجديد يعود التطبيق تلقائياً إلى الإصدار السابق.</li>
<li>تُنشر التحديثات مباشرة إلى Firebase؛ لا حاجة لتنزيل أي ملف أو اختياره أو تثبيته. (طريق احتياطي: يمكن نشر ملف <code>.ihu</code> من <b>الإعدادات ← التحديثات ← نشر التحديث</b>.)</li>
<li>ومع ذلك خذ نسخة احتياطية بين حين وآخر من <b>الإعدادات ← النسخ الاحتياطي</b>؛ ويأخذ الحاسوب نسخة تلقائية كل يوم. لا تُلغِ تثبيت تطبيق أندرويد (فذلك يحذف بيانات الهاتف).</li></ul>
<h3 id="prog">7. البرامج التدريبية: عام، الجناح الثابت، FPV</h3>
<ul><li>يُختار البرنامج من أداة الاختيار في الشريط العلوي (أو من الأزرار في اللوحة الرئيسية وصفحة المنهج). ويعمل المنهج والتقييم والدرجة واللقب ومسار الطيران والمطبوعات وفق البرنامج المختار.</li>
<li><b>الجناح الثابت</b>: تدريب من الصفر حتى الطيار المتمرس (الديناميكا الهوائية، الأرصاد، التجميع، الإقلاع والهبوط، الطيار الآلي، الطوارئ). <b>FPV</b>: المحاكي، جهاز التحكم، اللحام، التجميع، Betaflight، الفيديو، الطيران الأكروباتي، PID والمرشحات وتحليل blackbox.</li>
<li>يمكن إضافة مستويات ووحدات وبنود خاصة بموضوع كل برنامج وتعديلها وترتيبها وإيقافها بمفتاح التشغيل. وتُعدَّل شروط الألقاب ومسارات التخصص لكل برنامج من الإعدادات.</li>
<li>يُسند كل متدرب إلى برنامج (نموذج المتدرب ← البرنامج التدريبي). وعند فتح متدرب ينتقل التطبيق تلقائياً إلى برنامجه.</li></ul>
<h3 id="contact">8. التواصل مع المسؤول</h3>
<ul><li>من <b>الإعدادات ← التواصل مع المسؤول</b> يمكنكم إرسال أفكاركم ومقترحاتكم وطلباتكم مباشرة إلى المسؤول. وعند انعدام الاتصال تُحفظ الرسالة وتُرسل تلقائياً لاحقاً.</li></ul>`
};
