const axios = require('axios');
const { channelInfo } = require('../lib/messageConfig');

async function characterCommand(sock, chatId, message) {
    let userToAnalyze;
    
    // Check for mentioned users
    if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        userToAnalyze = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
    }
    // Check for replied message
    else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
        userToAnalyze = message.message.extendedTextMessage.contextInfo.participant;
    }
    
    if (!userToAnalyze) {
        await sock.sendMessage(chatId, { 
            text: 'Por favor, mencione alguém ou responda à mensagem para analisar o caráter!', 
            ...channelInfo 
        });
        return;
    }

    try {
        // Get user's profile picture
        let profilePic;
        try {
            profilePic = await sock.profilePictureUrl(userToAnalyze, 'image');
        } catch {
            profilePic = 'https://i.imgur.com/2wzGhpF.jpeg'; // Default image if no profile pic
        }

        const traits = [
            "Inteligente", "Criativo(a)", "Determinado(a)", "Ambicioso(a)", "Carinhoso(a)",
            "Carismático(a)", "Confiante", "Empático(a)", "Energético(a)", "Amigável",
            "Generoso(a)", "Honesto(a)", "Bem-humorado(a)", "Imaginativo(a)", "Independente",
            "Intuitivo(a)", "Gentil", "Lógico(a)", "Leal", "Otimista",
            "Apaixonado(a)", "Paciente", "Persistente", "Confiável", "Inventivo(a)",
            "Sincero(a)", "Atencioso(a)", "Compreensivo(a)", "Versátil", "Sábio(a)"
        ];

        // Get 3-5 random traits
        const numTraits = Math.floor(Math.random() * 3) + 3; // Random number between 3 and 5
        const selectedTraits = [];
        for (let i = 0; i < numTraits; i++) {
            const randomTrait = traits[Math.floor(Math.random() * traits.length)];
            if (!selectedTraits.includes(randomTrait)) {
                selectedTraits.push(randomTrait);
            }
        }

        // Calculate random percentages for each trait
        const traitPercentages = selectedTraits.map(trait => {
            const percentage = Math.floor(Math.random() * 41) + 60; // Random number between 60-100
            return `${trait}: ${percentage}%`;
        });

        // Create character analysis message
        const analysis = `🔮 *Análise de Caráter* 🔮\n\n` +
            `👤 *Usuário:* ${userToAnalyze.split('@')[0]}\n\n` +
            `✨ *Principais Traços:*\n${traitPercentages.join('\n')}\n\n` +
            `🎯 *Nota Geral:* ${Math.floor(Math.random() * 21) + 80}%\n\n` +
            `Obs: Esta é uma análise divertida e não deve ser levada a sério!`;

        // Send the analysis with the user's profile picture
        await sock.sendMessage(chatId, {
            image: { url: profilePic },
            caption: analysis,
            mentions: [userToAnalyze],
            ...channelInfo
        });

    } catch (error) {
        console.error('Erro no comando character:', error);
        await sock.sendMessage(chatId, { 
            text: 'Falha ao analisar o caráter! Tente novamente mais tarde.',
            ...channelInfo 
        });
    }
}

module.exports = characterCommand; 