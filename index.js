const mineflayer = require('mineflayer');
const express = require('express');
const app = express();

// Render sunucusunun uykuya geçmesini önlemek için basit bir web arayüzü
app.get('/', (req, res) => {
    res.send('Bot aktif ve çalışıyor!');
});
app.listen(process.env.PORT || 3000, () => {
    console.log('Web sunucusu başlatıldı.');
});

function createBot() {
    const bot = mineflayer.createBot({
        host: '11806.aternos.me', // Sunucunun IP adresini girin
        port: 60211,              // Portu girin
        username: 'AfkBotWeriqX',// Bot adı
        version: '1.20.1'         // Minecraft sürümü
    });

    bot.on('spawn', () => {
        console.log('Bot başarıyla sunucuya giriş yaptı!');
    });

    bot.on('end', () => {
        console.log('Bağlantı kesildi, 10 saniye sonra tekrar denenecek...');
        setTimeout(createBot, 10000);
    });

    bot.on('error', (err) => console.log('Hata: ', err));
}

createBot();
