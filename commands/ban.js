const fs = require('fs');
const { channelInfo } = require('../lib/messageConfig');

async function banCommand(sock, chatId, message) {
    let userToBan;
    
    // Check for mentioned users
    if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        userToBan = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
    }
    // Check for replied message
    else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
        userToBan = message.message.extendedTextMessage.contextInfo.participant;
    }
    
    if (!userToBan) {
        await sock.sendMessage(chatId, { 
            text: 'Por favor, mencione o usuário ou responda à mensagem dele para banir!', 
            ...channelInfo 
        });
        return;
    }

    try {
        // Add user to banned list
        const bannedUsers = JSON.parse(fs.readFileSync('./data/banned.json'));
        if (!bannedUsers.includes(userToBan)) {
            bannedUsers.push(userToBan);
            fs.writeFileSync('./data/banned.json', JSON.stringify(bannedUsers, null, 2));
            
            await sock.sendMessage(chatId, { 
                text: `@${userToBan.split('@')[0]} banido com sucesso!`,
                mentions: [userToBan],
                ...channelInfo 
            });
        } else {
            await sock.sendMessage(chatId, { 
                text: `${userToBan.split('@')[0]} já está banido!`,
                mentions: [userToBan],
                ...channelInfo 
            });
        }
    } catch (error) {
        console.error('Erro no comando ban:', error);
        await sock.sendMessage(chatId, { text: 'Falha ao banir o usuário!', ...channelInfo });
    }
}

module.exports = banCommand;
