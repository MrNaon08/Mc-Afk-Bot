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

const KULLANICI_ADI = 'WeriqX';
const SIFRE = '1108';

let aktifBot = null;
let botDurumu = "Bot Oluşturulmadı";
let botBilgileri = {};
let sohbetLoglari = [];

function dynamicHTML(icerik) {
    return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>WeriqX Bot Kontrol Paneli</title>
        <style>
            body { font-family: 'Segoe UI', sans-serif; background: #1e1e24; color: #fff; text-align: center; padding: 15px; margin: 0; }
            .container { max-width: 500px; margin: 20px auto; background: #2a2a35; padding: 25px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); box-sizing: border-box; }
            h2 { color: #4caf50; margin-bottom: 20px; font-size: 24px; }
            input, select { width: 100%; padding: 12px; margin: 10px 0; border: none; border-radius: 8px; background: #3e3e4f; color: #fff; box-sizing: border-box; font-size: 14px; }
            button { width: 100%; padding: 12px; border: none; border-radius: 8px; background: #4caf50; color: white; font-weight: bold; cursor: pointer; font-size: 16px; margin-top: 10px; }
            button:hover { background: #45a049; }
            .btn-danger { background: #f44336; margin-top: 20px; }
            .btn-danger:hover { background: #da190b; }
            .status { background: #3a3a4a; padding: 15px; border-radius: 8px; margin-top: 15px; font-size: 14px; text-align: left; line-height: 1.6; }
            .skin-img { width: 80px; height: 80px; margin: 10px 0; image-rendering: pixelated; border-radius: 8px; background: #15151a; padding: 5px; }
            .log-title { text-align: left; font-weight: bold; margin-top: 20px; color: #ffb74d; font-size: 14px; }
            .log-box { width: 100%; height: 180px; background: #15151a; border-radius: 8px; padding: 10px; overflow-y: auto; text-align: left; font-family: monospace; font-size: 12px; color: #00ff00; box-sizing: border-box; margin-top: 5px; border: 1px solid #3e3e4f; }
            .chat-send-form { display: flex; gap: 5px; margin-top: 8px; }
            .chat-send-form input { margin: 0; flex: 1; }
            .chat-send-form button { margin: 0; width: auto; padding: 0 20px; background: #2196f3; }
        </style>
    </head>
    <body>
        <div class="container">
            ${icerik}
        </div>
    </body>
    </html>
    `;
}

app.get('/', (req, res) => {
    if (!req.session.loggedIn) {
        return res.send(dynamicHTML(`
            <h2>Giriş Yap</h2>
            <form action="/login" method="POST">
                <input type="text" name="username" placeholder="Kullanıcı Adı" required>
                <input type="password" name="password" placeholder="Şifre" required>
                <button type="submit">Giriş Yap</button>
            </form>
        `));
    }

    if (!aktifBot) {
        return res.send(dynamicHTML(`
            <h2>Bot Oluştur</h2>
            <form action="/olustur" method="POST">
                <input type="text" name="host" placeholder="Sunucu IP Adresi" required>
                <input type="number" name="port" placeholder="Port" value="25565" required>
                <input type="text" name="version" placeholder="Sürüm" value="1.20.1" required>
                <input type="text" name="botname" placeholder="Bot İsmi" value="WeriqX_Bot" required>
                <button type="submit">Bot Oluştur</button>
            </form>
        `));
    }

    const skinUrl = `https://cravatar.eu{botBilgileri.name}/100.png`;
    const logSatirlari = sohbetLoglari.map(log => `<div>${log}</div>`).join('');

    res.send(dynamicHTML(`
        <h2>Bot Yönetim Paneli</h2>
        <div style="color: #8bc34a; font-weight: bold; margin-bottom: 5px;">Bağlantı Paneli Aktif</div>
        <img src="${skinUrl}" class="skin-img" alt="Minecraft Skin">
        
        <div class="status">
            <strong>Durum:</strong> ${botDurumu}<br>
            <strong>Bot Adı:</strong> ${botBilgileri.name}<br>
            <strong>Sunucu:</strong> ${botBilgileri.host}:${botBilgileri.port}<br>
            <strong>Sürüm:</strong> ${botBilgileri.version}
        </div>

        <div class="log-title">Oyun İçi Sohbet / Loglar:</div>
        <div class="log-box" id="logs">${logSatirlari || 'Mesaj bekleniyor...'}</div>

        <form action="/mesajgonder" method="POST" class="chat-send-form">
            <input type="text" name="chatmsg" placeholder="Sohbete yazın veya /komut gönderin" required autocomplete="off">
            <button type="submit">Gönder</button>
        </form>

        <form action="/durdur" method="POST">
            <button type="submit" class="btn-danger">❌ Botu Sunucudan Çıkar ve Kapat</button>
        </form>

        <script>
            const objDiv = document.getElementById("logs");
            if(objDiv) objDiv.scrollTop = objDiv.scrollHeight;
        </script>
    `));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === KULLANICI_ADI && password === SIFRE) req.session.loggedIn = true;
    res.redirect('/');
});

app.post('/olustur', (req, res) => {
    if (!req.session.loggedIn || aktifBot) return res.redirect('/');

    const { host, port, version, botname } = req.body;
    botBilgileri = { host, port: parseInt(port), version, name: botname };
    botDurumu = "⏳ Bağlanıyor (Aternos Kontrol Ediliyor)...";
    sohbetLoglari = ["[Sistem] Sunucu soketine istek gönderildi..."];

    try {
        aktifBot = mineflayer.createBot({
            host: botBilgileri.host,
            port: botBilgileri.port,
            username: botBilgileri.name,
            version: botBilgileri.version,
            connectTimeout: 45000, // Zaman aşımı süresini 45 saniyeye çıkardık
            checkTimeoutInterval: 45000,
            hideErrors: true
        });

        aktifBot.on('login', () => {
            botDurumu = "🟢 Giriş Onaylandı!";
            sohbetLoglari.push("[Sistem] Sunucu el sıkışması başarılı. Oturum açıldı.");
        });

        aktifBot.on('spawn', () => {
            botDurumu = "🟢 Oyunda ve Aktif!";
            sohbetLoglari.push("[Sistem] Bot dünyaya başarıyla doğdu.");
        });

        aktifBot.on('messagestr', (messageStr) => {
            const cleanMessage = messageStr.trim();
            if (cleanMessage) {
                if (sohbetLoglari.length > 50) sohbetLoglari.shift();
                sohbetLoglari.push(cleanMessage);
            }
        });

        aktifBot.on('end', (reason) => {
            botDurumu = `🔴 Bağlantı Kesildi`;
            sohbetLoglari.push(`[Sistem] Bağlantı koptu veya kapatıldı.`);
            aktifBot = null;
        });

        aktifBot.on('error', (err) => {
            botDurumu = `❌ Sunucuya Ulaşılamadı`;
            sohbetLoglari.push(`[Hata] Aternos kapalı, port değişmiş veya Render IP engellenmiş olabilir.`);
            aktifBot = null;
        });

    } catch (error) {
        botDurumu = `❌ Başlatma Hatası`;
        aktifBot = null;
    }

    res.redirect('/');
});

app.post('/mesajgonder', (req, res) => {
    if (!req.session.loggedIn || !aktifBot) return res.redirect('/');
    const { chatmsg } = req.body;
    if (chatmsg && chatmsg.trim() !== "") {
        try {
            aktifBot.chat(chatmsg); 
            sohbetLoglari.push(`> Siz: ${chatmsg}`);
        } catch (e){}
    }
    res.redirect('/');
});

app.post('/durdur', (req, res) => {
    if (!req.session.loggedIn) return res.redirect('/');
    if (aktifBot) {
        try { 
            aktifBot.end();
            aktifBot.quit(); 
        } catch(e){}
        aktifBot = null;
    }
    botDurumu = "Bot Oluşturulmadı";
    sohbetLoglari = [];
    res.redirect('/');
});

app.listen(process.env.PORT || 3000);
