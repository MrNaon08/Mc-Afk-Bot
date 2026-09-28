const express = require('express');
const mineflayer = require('mineflayer');
const session = require('express-session');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'gizli-anahtar-veriqx-ultimate',
    resave: false,
    saveUninitialized: true
}));

// 🔒 GİRİŞ BİLGİLERİ
const KULLANICI_ADI = 'WeriqX';
const SIFRE = '1108';

// 🏠 VARSAYILAN SABİT AYARLAR (Form ilk açıldığında otomatik dolacak alanlar)
const VARSAYILAN_AYARLAR = {
    host: '11806.aternos.me',
    port: 60211,
    version: '1.20.1',
    botname: 'WeriqX_724'
};

// Global Değişkenler
let aktifBot = null;
let botDurumu = "Bot Başlatılmadı";
let baglantiHatasiVarMi = false;
let sonKullanilanAyarlar = { ...VARSAYILAN_AYARLAR };
let sohbetLoglari = [];
let antiAfkDongusu = null;

// HTML Tema Motoru
function dynamicHTML(icerik) {
    return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>WeriqX Ultimate Bot Kontrol Paneli</title>
        <style>
            body { font-family: 'Segoe UI', sans-serif; background: #141419; color: #fff; text-align: center; padding: 15px; margin: 0; }
            .container { max-width: 500px; margin: 20px auto; background: #1f1f2a; padding: 25px; border-radius: 15px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); box-sizing: border-box; border: 1px solid #2d2d3d; }
            h2 { color: #4caf50; margin-bottom: 20px; font-size: 24px; font-weight: 600; }
            .subtitle { color: #aaaaaa; font-size: 13px; margin-top: -15px; margin-bottom: 20px; }
            label { display: block; text-align: left; font-size: 12px; color: #b0bec5; margin-top: 10px; font-weight: bold; }
            input { width: 100%; padding: 12px; margin: 5px 0 12px 0; border: 1px solid #2d2d3d; border-radius: 8px; background: #2a2a3a; color: #fff; box-sizing: border-box; font-size: 14px; transition: 0.3s; }
            input:focus { border-color: #4caf50; outline: none; background: #323246; }
            button { width: 100%; padding: 12px; border: none; border-radius: 8px; background: #4caf50; color: white; font-weight: bold; cursor: pointer; font-size: 16px; margin-top: 5px; box-shadow: 0 4px 6px rgba(76,175,80,0.2); }
            button:hover { background: #45a049; }
            .btn-danger { background: #f44336; margin-top: 15px; box-shadow: 0 4px 6px rgba(244,67,54,0.2); }
            .btn-danger:hover { background: #da190b; }
            .btn-orange { background: #ff9800; box-shadow: 0 4px 6px rgba(255,152,0,0.2); }
            .btn-orange:hover { background: #e68a00; }
            .status { background: #262636; padding: 15px; border-radius: 8px; margin-top: 15px; text-align: left; font-size: 14px; line-height: 1.6; border-left: 5px solid #4caf50; }
            .status.error-status { border-left-color: #f44336; background: #321f1f; }
            .error-box { background: #f44336; color: white; padding: 10px; border-radius: 8px; font-size: 13px; font-weight: bold; margin-bottom: 15px; text-align: left; }
            .log-title { text-align: left; font-weight: bold; margin-top: 20px; color: #ffa726; font-size: 14px; }
            .log-box { width: 100%; height: 180px; background: #0c0c10; border-radius: 8px; padding: 10px; overflow-y: auto; text-align: left; font-family: monospace; font-size: 12px; color: #00ff66; box-sizing: border-box; margin-top: 5px; border: 1px solid #2d2d3d; }
            .chat-send-form { display: flex; gap: 5px; margin-top: 8px; }
            .chat-send-form input { margin: 0; flex: 1; }
            .chat-send-form button { margin: 0; width: auto; padding: 0 20px; background: #2196f3; box-shadow: none; }
        </style>
    </head>
    <body><div class="container">${icerik}</div></body>
    </html>
    `;
}

// 1. Ana Sayfa Yönetimi
app.get('/', (req, res) => {
    // Giriş Kontrolü
    if (!req.session.loggedIn) {
        return res.send(dynamicHTML(`
            <h2>WeriqX Güvenlik Duvarı</h2>
            <div class="subtitle">Yalnızca yetkili kurucu giriş yapabilir.</div>
            <form action="/login" method="POST">
                <input type="text" name="username" placeholder="Kullanıcı Adı" required autocomplete="off">
                <input type="password" name="password" placeholder="Şifre" required>
                <button type="submit">Sisteme Giriş Yap</button>
            </form>
        `));
    }

    // Durum 1: Bot henüz oluşturulmadıysa veya bağlantı hatası alındıysa (ÖZEL AYAR VE DİNAMİK IP MENÜSÜ)
    if (!aktifBot) {
        let menuIcerik = "";
        
        if (baglantiHatasiVarMi) {
            menuIcerik += `
                <div class="error-box">
                    ⚠️ BAĞLANTI HATASI: Sunucuya ulaşılamadı! Aternos kapalı olabilir veya port eskimiş olabilir. Lütfen aşağıdaki bilgileri güncelleyip (gerekirse DynIP girip) tekrar deneyin.
                </div>
                <h2>Dinamik Yeniden Bağlanma Menüsü</h2>
            `;
        } else {
            menuIcerik += `<h2>Bot Yapılandırma Menüsü</h2>`;
        }

        menuIcerik += `
            <div class="subtitle">Bilgileri değiştirebilir veya direkt başlatabilirsiniz.</div>
            <form action="/baslat" method="POST">
                <label>Sunucu IP Adresi / DynIP</label>
                <input type="text" name="host" value="${sonKullanilanAyarlar.host}" required autocomplete="off">
                
                <label>Bağlantı Portu (Port)</label>
                <input type="number" name="port" value="${sonKullanilanAyarlar.port}" required>
                
                <label>Minecraft Sürümü</label>
                <input type="text" name="version" value="${sonKullanilanAyarlar.version}" required autocomplete="off">
                
                <label>Bot Kullanıcı Adı (Nick)</label>
                <input type="text" name="botname" value="${sonKullanilanAyarlar.botname}" required autocomplete="off">
                
                <button type="submit" class="${baglantiHatasiVarMi ? 'btn-orange' : ''}">
                    ${baglantiHatasiVarMi ? '⚡ Yeni Bilgilerle Tekrar Dene' : '🟢 Botu Sunucuya Sok'}
                </button>
            </form>
        `;
        return res.send(dynamicHTML(menuIcerik));
    }

    // Durum 2: Bot Başarıyla Sunucuya Girdiyse (CANLI KONTROL PANELI)
    const logSatirlari = sohbetLoglari.map(log => `<div>${log}</div>`).join('');
    return res.send(dynamicHTML(`
        <h2>WeriqX Canlı Kontrol Paneli</h2>
        <div class="status">
            <strong>Durum:</strong> ${botDurumu}<br>
            <strong>Bağlı Sunucu:</strong> ${sonKullanilanAyarlar.host}:${sonKullanilanAyarlar.port}<br>
            <strong>Aktif Karakter:</strong> ${sonKullanilanAyarlar.botname} (${sonKullanilanAyarlar.version})
        </div>

        <div class="log-title">Oyun İçi Canlı Sohbet:</div>
        <div class="log-box" id="logs">${logSatirlari || 'Sunucudan paketler senkronize ediliyor...'}</div>

        <form action="/mesajgonder" method="POST" class="chat-send-form">
            <input type="text" name="chatmsg" placeholder="Sohbete yazın veya /komut gönderin" required autocomplete="off">
            <button type="submit">Gönder</button>
        </form>

        <form action="/durdur" method="POST">
            <button type="submit" class="btn-danger">❌ Botu Sunucudan Çıkar</button>
        </form>

        <script>
            const objDiv = document.getElementById("logs");
            if(objDiv) objDiv.scrollTop = objDiv.scrollHeight;
        </script>
    `));
});

// 2. Giriş Paket İşlemleri
app.post('/login', (req, res) => {
    if (req.body.username === KULLANICI_ADI && req.body.password === SIFRE) {
        req.session.loggedIn = true;
    }
    res.redirect('/');
});

// 3. Botu Dinamik/Sabit Verilerle Başlatma
app.post('/baslat', (req, res) => {
    if (!req.session.loggedIn || aktifBot) return res.redirect('/');

    const { host, port, version, botname } = req.body;
    
    // Kullanıcının siteden gönderdiği bilgileri hafızaya alıyoruz
    sonKullanilanAyarlar = {
        host: host.trim(),
        port: parseInt(port),
        version: version.trim(),
        botname: botname.trim()
    };

    botDurumu = "⏳ Bağlantı protokolü yürütülüyor...";
    sohbetLoglari = [`[Sistem] ${sonKullanilanAyarlar.host}:${sonKullanilanAyarlar.port} adresine el sıkışma isteği gönderildi...`];
    baglantiHatasiVarMi = false;

    try {
        aktifBot = mineflayer.createBot({
            host: sonKullanilanAyarlar.host,
            port: sonKullanilanAyarlar.port,
            username: sonKullanilanAyarlar.botname,
            version: sonKullanilanAyarlar.version,
            auth: 'offline',
            checkTimeoutInterval: 30000,
            connectTimeout: 30000,
            keepAlive: true,
            hideErrors: true
        });

        aktifBot.on('login', () => {
            botDurumu = "🟢 Giriş Onaylandı!";
            sohbetLoglari.push("[Sistem] Sunucu kimliği doğruladı. Dünyaya giriş yapılıyor.");
        });

        aktifBot.on('spawn', () => {
            botDurumu = "🟢 OYUNUN İÇİNDE VE AKTİF!";
            sohbetLoglari.push("[Sistem] Başarıyla doğdunuz. Anti-AFK aktif edildi.");
            baglantiHatasiVarMi = false;

            if (antiAfkDongusu) clearInterval(antiAfkDongusu);
            antiAfkDongusu = setInterval(() => {
                if (aktifBot && aktifBot.entity) {
                    aktifBot.look(Math.random() * 3.14, (Math.random() - 0.5) * 0.4, true);
                    aktifBot.setControlState('jump', true);
                    setTimeout(() => { if(aktifBot) aktifBot.setControlState('jump', false); }, 200);
                }
            }, 25000);
        });

        aktifBot.on('messagestr', (messageStr) => {
            if (sohbetLoglari.length > 60) sohbetLoglari.shift();
            
