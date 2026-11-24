// Asistan Agent (ortak-cekirdek/web/dist/fc-agent.js): bütün uygulamalardaki çalışmayı izler (yalnız sayılar), öneri verir.
// Bildirim + sağ altta ✦ panel; Ayarlar'da "Admin ile iletişim" kartının önünde kendi kartı. fc-agent.js'yi çekirdekten yeniden kopyalayarak güncellenir.
(function () {
  if (!window.FCAgent) return;
  FCAgent.mount({
    app: "iha-mufredat",
    version: (function () { try { return window.APP_VERSION; } catch (e) { return ''; } })(),
    lang: function () { try { return (document.documentElement.lang) || document.documentElement.lang || 'tr'; } catch (e) { return document.documentElement.lang || 'tr'; } },
    theme: 'auto',
    sync: true,
    settingsBefore: ["Yönetici İletişimi", "Contact the Administrator", "التواصل مع المسؤول"],
    ai: function () { try { return (function(){var c=JSON.parse(localStorage.getItem('iha_danisman_ayar_v1')||'{}'); var p=c.saglayici||'gemini'; return c.anahtar&&/^(gemini|openai|anthropic|groq)$/.test(p)?{provider:p,key:c.anahtar,model:c.model||undefined}:null;})(); } catch (e) { return null; } }
  });
})();
