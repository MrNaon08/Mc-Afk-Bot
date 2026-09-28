const express = require('express');
const mineflayer = require('mineflayer');
const session = require('express-session');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'gizli-anahtar-veriqx',
    resave: false,
    saveUninitialized: true
}));

// 🔒 GİRİŞ VE SUNUCU AYARLARINIZ (BURADAN DEĞİŞTİREBİLİRSİNİZ)
const KULLANICI_ADI = 'WeriqX';
const SIFRE = '1108';

const SUNUCU_BILGILERI = {
    host: 'halibut.aternos.host',   // Sabit Aternos IP adresiniz
    port: 60211,                // Aternos'un güncel 5 haneli portu (Değişirse sadece buradan güncelleyin)
    version: '1.20.1',          // Sunucunuzun tam Minecraft sürümü
    botname: 'WeriqX_724'       // Botun oyundaki adı
};

let aktifBot = null;
let botDurumu = "Bot Başlatılmadı";
let sohbetLoglari = [];
let antiAfkDongusu = null;

// HTML Panel Tasarımı
function dynamicHTML(icerik) {
    return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>WeriqX Kalıcı Bot Paneli</title>
        <style>
            body { font-family: 'Segoe UI', sans-serif; background: #1a1a1f; color: #fff; text-align: center; padding: 15px; margin: 0; }
            .container { max-width: 500px; margin: 20px auto; background: #23232e; padding: 25px; border-radius: 15px; box-shadow: 0 4px 20px rgba(0,0,0,0.6); box-sizing: border-box; }
            h2 { color: #4caf50; margin-bottom: 20px; font-size: 24px; }
            input { width: 100%; padding: 12px; margin: 10px 0; border: none; border-radius: 8px; background: #323242; color: #fff; box-sizing: border-box; font-size: 14px; }
            button { width: 100%; padding: 12px; border: none; border-radius: 8px; background: #4caf50; color: white; font-weight: bold; cursor: pointer; font-size: 16px; margin-top: 10px; }
            button:hover { background: #45a049; }
            .btn-danger { background: #f44336; margin-top: 20px; }
            .status { background: #2f2f3d; padding: 15px; border-radius: 8px; margin-top: 15px; text-align: left; font-size: 14px; line-height: 1.6; border-left: 5px solid #4caf50; }
            .log-title { text-align: left; font-weight: bold; margin-top: 20px; color: #ffa726; font-size: 14px; }
            .log-box { width: 100%; height: 200px; background: #111116; border-radius: 8px; padding: 10px; overflow-y: auto; text-align: left; font-family: monospace; font-size: 12px; color: #00ff66; box-sizing: border-box; margin-top: 5px; border: 1px solid #323242; }
            .chat-send-form { display: flex; gap: 5px; margin-top: 8px; }
            .chat-send-form input { margin: 0; flex: 1; }
            .chat-send-form button { margin: 0; width: auto; padding: 0 20px; background: #2196f3; }
        </style>
    </head>
    <body><div class="container">${icerik}</div></body>
    </html>
    `;
}

// 1. Ana Sayfa (Giriş veya Panel)
app.get('/', (req, res) => {
    if (!req.session.loggedIn) {
        return res.send(dynamicHTML(`
            <h2>WeriqX Sistem Girişi</h2>
            <form action="/login" method="POST">
                <input type="text" name="username" placeholder="Kullanıcı Adı" required autocomplete="off">
                <input type="password" name="password" placeholder="Şifre" required>
                <button type="submit">Sisteme Giriş Yap</button>
            </form>
        `));
    }

    const logSatirlari = sohbetLoglari.map(log => `<div>${log}</div>`).join('');

    res.send(dynamicHTML(`
        <h2>Bot Yönetim Paneli</h2>
        <div class="status">
            <strong>Durum:</strong> ${botDurumu}<br>
            <strong>Hedef Sunucu:</strong> ${SUNUCU_BILGILERI.host}:${SUNUCU_BILGILERI.port}<br>
            <strong>Bot Kimliği:</strong> ${SUNUCU_BILGILERI.botname} (${SUNUCU_BILGILERI.version})
        </div>

        <!-- Tetikleme Butonları (Sadece Aç/Kapat) -->
        ${!aktifBot ? 
            `<form action="/baslat" method="POST"><button type="submit">🟢 Botu Sunucuya Sok</button></form>` : 
            `<form action="/durdur" method="POST"><button type="submit" class="btn-danger">❌ Botu Sunucudan Çıkar</button></form>`
        }

        <div class="log-title">Oyun İçi Canlı Sohbet:</div>
        <div class="log-box" id="logs">${logSatirlari || 'Bot çevrimdışı. Bağlantı bekleniyor...'}</div>

        <form action="/mesajgonder" method="POST" class="chat-send-form">
            <input type="text" name="chatmsg" placeholder="Sohbete yazın veya /komut gönderin" required autocomplete="off">
            <button type="submit">Gönder</button>
        </form>

        <script>
            const objDiv = document.getElementById("logs");
            if(objDiv) objDiv.scrollTop = objDiv.scrollHeight;
        </script>
    `));
});

// 2. Giriş Kontrolü
app.post('/login', (req, res) => {
    if (req.body.username === KULLANICI_ADI && req.body.password === SIFRE) req.session.loggedIn = true;
    res.redirect('/');
});

// 3. Botu Sabit Ayarlarla Başlatma Fonksiyonu
app.post('/baslat', (req, res) => {
    if (!req.session.loggedIn || aktifBot) return res.redirect('/');

    botDurumu = "⏳ Aternos el sıkışması yapılıyor...";
    sohbetLoglari = ["[Sistem] Sabit IP üzerinden paketler gönderiliyor..."];

    try {
        aktifBot = mineflayer.createBot({
            host: SUNUCU_BILGILERI.host,
            port: SUNUCU_BILGILERI.port,
            username: SUNUCU_BILGILERI.botname,
            version: SUNUCU_BILGILERI.version,
            auth: 'offline',
            checkTimeoutInterval: 45000,
            connectTimeout: 45000,
            keepAlive: true,
            hideErrors: true
        });

        aktifBot.on('login', () => {
            botDurumu = "🟢 Sunucu Girişi Onaylandı!";
            sohbetLoglari.push("[Sistem] Başarıyla doğrulama yapıldı.");
        });

        aktifBot.on('spawn', () => {
            botDurumu = "🟢 OYUNUN İÇİNDE VE AKTİF!";
            sohbetLoglari.push("[Sistem] Karakter dünyada fiziksel olarak doğdu.");
            
            // Anti-AFK Gelişmiş Döngü (Farklı yönlere bakarak sunucu algoritmalarını yanıltır)
            if (antiAfkDongusu) clearInterval(antiAfkDongusu);
            antiAfkDongusu = setInterval(() => {
                if (aktifBot && aktifBot.entity) {
                    aktifBot.look(Math.random() * 3.14, (Math.random() - 0.5) * 0.4, true);
                    aktifBot.setControlState('jump', true);
                    setTimeout(() => { if(aktifBot) aktifBot.setControlState('jump', false); }, 200);
                }
            }, 20000);
        });

        aktifBot.on('messagestr', (messageStr) => {
            if (sohbetLoglari.length > 60) sohbetLoglari.shift();
            sohbetLoglari.push(messageStr.trim());
        });

        aktifBot.on('end', (reason) => {
            botDurumu = `🔴 Çevrimdışı (Bağlantı Kesildi)`;
            sohbetLoglari.push(`[Sistem] Sunucu bağlantıyı sonlandı: ${reason}`);
            if (antiAfkDongusu) clearInterval(antiAfkDongusu);
            aktifBot = null;
        });

        aktifBot.on('error', (err) => {
            botDurumu = `❌ Sunucuya Bağlanılamadı`;
            sohbetLoglari.push(`[Hata] Aternos kapalı veya koddaki port numarası eski.`);
            if (antiAfkDongusu) clearInterval(antiAfkDongusu);
            aktifBot = null;
        });

    } catch (error) {
        botDurumu = `❌ Başlatma Hatası`;
        aktifBot = null;
    }
    res.redirect('/');
});

// 4. Panelden Mesaj/Komut Gönderme
app.post('/mesajgonder', (req, res) => {
    if (req.session.loggedIn && aktifBot) {
        try { 
            aktifBot.chat(req.body.chatmsg); 
            sohbetLoglari.push(`> Siz: ${req.body.chatmsg}`); 
        } catch (e){}
    }
    res.redirect('/');
});

// 5. Botu Güvenli Kapatma
app.post('/durdur', (req, res) => {
    if (aktifBot) {
        try { 
            aktifBot.end(); 
            aktifBot.quit(); 
        } catch(e){}
        aktifBot = null;
    }
    if (antiAfkDongusu) clearInterval(antiAfkDongusu);
    botDurumu = "Bot Başlatılmadı";
    sohbetLoglari.push("[Sistem] Bot kullanıcı komutuyla sunucudan çıkarıldı.");
    res.redirect('/');
});

app.listen(process.env.PORT || 3000);
