const settings = require("../settings");
async function aliveCommand(sock, chatId, message) {
    try {
    const message1 = `*🤖 Knight Bot está ativo!*\n\n` +
               `*Versão:* ${settings.version}\n` +
               `*Status:* Online\n` +
               `*Modo:* Público\n\n` +
               `*🌟 Funcionalidades:*\n` +
               `• Gerenciamento de grupos\n` +
               `• Proteção contra links\n` +
               `• Comandos divertidos\n` +
               `• E muito mais!\n\n` +
               `Digite *.menu* para ver todos os comandos`;

        await sock.sendMessage(chatId, {
            text: message1,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363161513685998@newsletter',
                    newsletterName: 'KnightBot MD',
                    serverMessageId: -1
                }
            }
        }, { quoted: message });
    } catch (error) {
        console.error('Error in alive command:', error);
    await sock.sendMessage(chatId, { text: 'O bot está ativo e funcionando!' }, { quoted: message });
    }
}

module.exports = aliveCommand;