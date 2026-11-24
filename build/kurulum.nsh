; İHA Müfredat Sistemi — NSIS eki (electron-builder nsis.include).
; Eski kurulum (kabuk 2/3, ≤3.4 eski kanal) aynı klasörde resources\app\ açık klasörüyle çalışıyordu. Electron önce
; resources\app klasörünü yüklediğinden, yeni app.asar'ın kullanılması için o klasör kaldırılır. Kullanıcı kayıtları
; %APPDATA%\IHAMufredatSistemi içindedir; bu ek oraya DOKUNMAZ. Eski "Programlar" kaydı ve sürüm numaralı eski kısayollar
; (İHA Müfredat Sistemi vX.Y) da temizlenir; eski kaldırıcı yeni kurulumu silmesin.
!macro customInstall
  IfFileExists "$INSTDIR\resources\app\main.js" 0 ihaEskiYok
    RMDir /r "$INSTDIR\resources\app"
    DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\IHAMufredatSistemi"
    Delete "$DESKTOP\İHA Müfredat Sistemi v*.lnk"
    Delete "$SMPROGRAMS\İHA Müfredat Sistemi\İHA Müfredat Sistemi v*.lnk"
    RMDir "$SMPROGRAMS\İHA Müfredat Sistemi"
  ihaEskiYok:
!macroend
