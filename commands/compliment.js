const compliments = [
    "Você é incrível do jeitinho que é!",
    "Você tem um ótimo senso de humor!",
    "Você é incrivelmente atencioso(a) e gentil.",
    "Você é mais forte do que imagina.",
    "Você ilumina o ambiente!",
    "Você é um(a) verdadeiro(a) amigo(a).",
    "Você me inspira!",
    "Sua criatividade não tem limites!",
    "Você tem um coração de ouro.",
    "Você faz a diferença no mundo.",
    "Sua positividade é contagiante!",
    "Você tem uma ética de trabalho incrível.",
    "Você traz o melhor das pessoas.",
    "Seu sorriso ilumina o dia de todos.",
    "Você é tão talentoso(a) em tudo que faz.",
    "Sua bondade torna o mundo um lugar melhor.",
    "Você tem uma perspectiva única e maravilhosa.",
    "Seu entusiasmo é realmente inspirador!",
    "Você é capaz de conquistar grandes coisas.",
    "Você sempre sabe como fazer alguém se sentir especial.",
    "Sua confiança é admirável.",
    "Você tem uma alma linda.",
    "Sua generosidade não tem limites.",
    "Você tem um ótimo olhar para detalhes.",
    "Sua paixão é realmente motivadora!",
    "Você é um(a) ouvinte incrível.",
    "Você é mais forte do que pensa!",
    "Seu riso é contagiante.",
    "Você tem um dom natural para fazer os outros se sentirem valorizados.",
    "Você torna o mundo melhor só por estar nele."
];

async function complimentCommand(sock, chatId, message) {
    try {
        if (!message || !chatId) {
            console.log('Invalid message or chatId:', { message, chatId });
            return;
        }

        let userToCompliment;
        
        // Check for mentioned users
        if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            userToCompliment = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
        }
        // Check for replied message
        else if (message.message?.extendedTextMessage?.contextInfo?.participant) {
            userToCompliment = message.message.extendedTextMessage.contextInfo.participant;
        }
        
        if (!userToCompliment) {
            await sock.sendMessage(chatId, { 
                text: 'Por favor, mencione alguém ou responda à mensagem para elogiar!'
            });
            return;
        }

        const compliment = compliments[Math.floor(Math.random() * compliments.length)];

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

        await sock.sendMessage(chatId, { 
            text: `Ei @${userToCompliment.split('@')[0]}, ${compliment}`,
            mentions: [userToCompliment]
        });
    } catch (error) {
        console.error('Error in compliment command:', error);
        if (error.data === 429) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            try {
                await sock.sendMessage(chatId, { 
                    text: 'Por favor, tente novamente em alguns segundos.'
                });
            } catch (retryError) {
                console.error('Erro ao enviar mensagem de tentativa:', retryError);
            }
        } else {
            try {
                await sock.sendMessage(chatId, { 
                    text: 'Ocorreu um erro ao enviar o elogio.'
                });
            } catch (sendError) {
                console.error('Erro ao enviar mensagem de erro:', sendError);
            }
        }
    }
}

module.exports = { complimentCommand };
