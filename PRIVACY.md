# Privacy / 隱私說明

This app has **no backend and no telemetry**. Everything runs on your own device.

- **Your ICBC credentials** (last name, driver's licence number, keyword) and all
  settings are stored **locally on your device** (encrypted via your OS keychain
  where available). They are **never** sent to the project authors or any third
  party.
- Your credentials are sent **only to ICBC's official servers** over HTTPS, to log
  in and check appointment availability, using the **same official endpoints the
  website uses**.
- If you enable **Telegram** notifications, only the notification text and your own
  bot token / chat id are sent to **Telegram's API** (to deliver the message). You
  provide these yourself and can remove them anytime.
- No analytics, no tracking, no accounts, no cloud storage.
- Local files (settings.json, state.json) are written owner-only (mode 0600) on
  macOS/Linux; on Windows that mode is advisory and the files inherit the userData
  folder's permissions.

---

本 App **沒有後端、沒有遙測**，一切都在你自己的裝置上執行。

- 你的 **ICBC 登入資訊**（姓、駕照號、keyword）與所有設定**只存在你本機**（可用時透過
  作業系統金鑰鏈加密），**絕不會**傳給作者或任何第三方。
- 這些資訊**只會用 HTTPS 傳到 ICBC 官方伺服器**，用於登入與查詢空位，**使用與官方網站
  相同的官方端點**。
- 若你啟用 **Telegram** 通知，只有通知文字與你自己的 bot token／chat id 會傳到
  **Telegram API**（用於送出訊息），且由你自行提供、隨時可移除。
- 無分析、無追蹤、無帳號、無雲端儲存。
- 本機檔案（settings.json、state.json）在 macOS/Linux 以僅擁有者可讀寫（0600）寫入；Windows 上此權限僅供參考，沿用 userData 資料夾權限。
