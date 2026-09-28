const express = require('express');
const mineflayer = require('mineflayer');
const session = require('express-session');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'gizli-anahtar-veriqx-ultimate-v3',
    resave: false,
    saveUninitialized: true
}));

// 🔒 GİRİŞ BİLGİLERİ
const KULLANICI_ADI = 'WeriqX';
const SIFRE = '1108';

// 🏠 DEĞİŞTİRİLEBİLİR PANEL HAFIZASI
let botAyarlari = {
    host: '11806.aternos.me',
    port: 60211,
    version: '1.20.1',
    botname: 'WeriqX_724'
};

let aktifBot = null;
let botDurumu = "Bot Başlatılmadı (Bilgileri girip başlatın)";
let sohbetLoglari = [];
let antiAfkDongusu = null;

// Render'ın kapanmasını önleyen canlı tutma döngüsü
setInterval(() => {
    console.log("[Sistem] Web sunucusu arka planda kararlı şekilde uyanık.");
}, 30000);

// HTML Yapısı (Ters eğik çizgi hatasından tamamen arındırıldı)
function dynamicHTML(icerik) {
    return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>WeriqX Ultimate Kontrol Paneli</title>
        <style>
            body { font-family: 'Segoe UI', sans-serif; background: #141419; color: #fff; text-align: center; padding: 15px; margin: 0; }
            .container { max-width: 500px; margin: 20px auto; background: #1f1f2a; padding: 25px; border-radius: 15px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); box-sizing: border-box; border: 1px solid #2d2d3d; }
            h2 { color: #4caf50; margin-bottom: 20px; font-size: 24px; font-weight: 600; }
            .subtitle { color: #aaaaaa; font-size: 13px; margin-top: -15px; margin-bottom: 20px; }
            label { display: block; text-align: left; font-size: 12px; color: #b0bec5; margin-top: 10px; font-weight: bold; }
            input { width: 100%; padding: 12px; margin: 5px 0 12px 0; border: 1px solid #2d2d3d; border-radius: 8px; background: #2a2a3a; color: #fff; box-sizing: border-box; font-size: 14px; }
            input:focus { border-color: #4caf50; outline: none; background: #323246; }
            button { width: 100%; padding: 12px; border: none; border-radius: 8px; background: #4caf50; color: white; font-weight: bold; cursor: pointer; font-size: 16px; margin-top: 5px; }
            button:hover { background: #45a049; }
            .btn-danger { background: #f44336; margin-top: 15px; }
            .status { background: #262636; padding: 15px; border-radius: 8px; margin-top: 15px; text-align: left; font-size: 14px; line-height: 1.6; border-left: 5px solid #4caf50; }
            .log-title { text-align: left; font-weight: bold; margin-top: 20px; color: #ffa726; font-size: 14px; }
            .log-box { width: 100%; height: 180px; background: #0c0c10; border-radius: 8px; padding: 10px; overflow-y: auto; text-align: left; font-family: monospace; font-size: 12px; color: #00ff66; box-sizing: border-box; margin-top: 5px; border: 1px solid #2d2d3d; }
            .chat-send-form { display: flex; gap: 5px; margin-top: 8px; }
            .chat-send-form input { margin: 0; flex: 1; }
            .chat-send-form button { margin: 0; width: auto; padding: 0 20px; background: #2196f3; }
        </style>
    </head>
    <body><div class="container">${icerik}</div></body>
    </html>
    `;
}

app.get('/', (req, res) => {
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

    const logSatirlari = sohbetLoglari.map(log => `<div>${log}</div>`).join('');

    let formAlani = '';
    if (!aktifBot) {
        formAlani = `
            <form action="/baslat" method="POST">
                <label>Sunucu IP / Adresi / DynIP</label>
                <input type="text" name="host" value="${botAyarlari.host}" required autocomplete="off">
                
                <label>Port (Aternos Giriş Portu)</label>
                <input type="number" name="port" value="${botAyarlari.port}" required>
                
                <label>Minecraft Sürümü</label>
                <input type="text" name="version" value="${botAyarlari.version}" required autocomplete="off">
                
                <label>Bot İsmi (Oyundaki Nick)</label>
                <input type="text" name="botname" value="${botAyarlari.botname}" required autocomplete="off">
                
                <button type="submit">🟢 Yeni Özelliklerle Başlat</button>
            </form>
        `;
    } else {
        formAlani = `
            <form action="/durdur" method="POST">
                <button type="submit" class="btn-danger">❌ Botu Sunucudan Çıkar ve Ayarları Değiştir</button>
            </form>
        `;
    }

    res.send(dynamicHTML(`
        <h2>WeriqX Kontrol Paneli</h2>
        <div class="status">
            <strong>Durum:</strong> ${botDurumu}<br>
            <strong>Aktif Ayarlar:</strong> ${botAyarlari.host}:${botAyarlari.port} | Sürüm: ${botAyarlari.version}
        </div>

        ${formAlani}

        <div class="log-title">Oyun İçi Canlı Sohbet:</div>
        <div class="log-box" id="logs">${logSatirlari || 'Bağlantı pasif. Sohbet bekleniyor...'}</div>

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

app.post('/login', (req, res) => {
    if (req.body.username === KULLANICI_ADI && req.body.password === SIFRE) {
        req.session.loggedIn = true;
    }
    res.redirect('/');
});

app.post('/baslat', (req, res) => {
    if (!req.session.loggedIn || aktifBot) return res.redirect('/');

    const { host, port, version, botname } = req.body;
    
    botAyarlari = {
        host: host.trim(),
        port: parseInt(port),
        version: version.trim(),
        botname: botname.trim()
    };

    botDurumu = "⏳ Bağlanıyor...";
    sohbetLoglari = [`[Sistem] ${botAyarlari.host}:${botAyarlari.port} adresine bağlantı isteği gönderildi...`];

    try {
        aktifBot = mineflayer.createBot({
            host: botAyarlari.host,
            port: botAyarlari.port,
            username: botAyarlari.botname,
            version: botAyarlari.version,
            auth: 'offline',
            checkTimeoutInterval: 45000,
            connectTimeout: 45000,
            keepAlive: true,
            hideErrors: true
        });

        aktifBot.on('login', () => {
            botDurumu = "🟢 Giriş Yapıldı!";
            sohbetLoglari.push("[Sistem] Sunucu el sıkışması başarılı.");
        });

        aktifBot.on('spawn', () => {
            botDurumu = "🟢 OYUNUN İÇİNDE VE AKTİF!";
            sohbetLoglari.push("[Sistem] Bot haritada doğdu. Korumalar devrede.");
            
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
            botDurumu = "🔴 Çevrimdışı (Bağlantı Kesildi)";
            sohbetLoglari.push(`[Sistem] Sunucu bağlantıyı kesti.`);
            if (antiAfkDongusu) clearInterval(antiAfkDongusu);
            aktifBot = null;
        });

        aktifBot.on('error', (err) => {
            botDurumu = `❌ Sunucuya Bağlanamadı`;
            sohbetLoglari.push(`[Hata] Port yanlış veya Aternos kapalı.`);
            if (antiAfkDongusu) clearInterval(antiAfkDongusu);
            if (aktifBot) { try { aktifBot.end(); } catch(e){} }
            aktifBot = null;
        });

    } catch (error) {
        botDurumu = "❌ Başlatma Hatası";
        aktifBot = null;
    }

    setTimeout(() => { res.redirect('/'); }, 1000);
});

app.post('/mesajgonder', (req, res) => {
    if (req.session.loggedIn && aktifBot) {
        try { 
            aktifBot.chat(req.body.chatmsg); 
            sohbetLoglari.push(`> Siz: ${req.body.chatmsg}`); 
        } catch (e){}
    }
    res.redirect('/');
});

app.post('/durdur', (req, res) => {
    if (aktifBot) {
        try { aktifBot.end(); aktifBot.quit(); } catch(e){}
        aktifBot = null;
    }
    if (antiAfkDongusu) clearInterval(antiAfkDongusu);
    botDurumu = "Bot Başlatılmadı (Bilgileri girip başlatın)";
    res.redirect('/');
});

app.listen(process.env.PORT || 3000);
