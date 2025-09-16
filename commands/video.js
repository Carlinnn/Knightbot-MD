const axios = require('axios');
const yts = require('yt-search');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const princeVideoApi = {
    base: 'https://api.princetechn.com/api/download/ytmp4',
    apikey: process.env.PRINCE_API_KEY || 'prince_tech_api_azfsbshfb',
    async fetchMeta(videoUrl) {
        const params = new URLSearchParams({ apikey: this.apikey, url: videoUrl });
        const url = `${this.base}?${params.toString()}`;
        const { data } = await axios.get(url, { timeout: 20000, headers: { 'user-agent': 'Mozilla/5.0', accept: 'application/json' } });
        return data;
    }
};

async function videoCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        const searchQuery = text.split(' ').slice(1).join(' ').trim();
        
        
        if (!searchQuery) {
            await sock.sendMessage(chatId, { text: 'Qual vídeo você deseja baixar?' }, { quoted: message });
            return;
        }

        // Determine if input is a YouTube link
        let videoUrl = '';
        let videoTitle = '';
        let videoThumbnail = '';
        if (searchQuery.startsWith('http://') || searchQuery.startsWith('https://')) {
            videoUrl = searchQuery;
        } else {
            // Search YouTube for the video
            const { videos } = await yts(searchQuery);
            if (!videos || videos.length === 0) {
                await sock.sendMessage(chatId, { text: 'Nenhum vídeo encontrado!' }, { quoted: message });
                return;
            }
            videoUrl = videos[0].url;
            videoTitle = videos[0].title;
            videoThumbnail = videos[0].thumbnail;
        }

        // Send thumbnail immediately
        try {
            const ytId = (videoUrl.match(/(?:youtu\.be\/|v=)([a-zA-Z0-9_-]{11})/) || [])[1];
            const thumb = videoThumbnail || (ytId ? `https://i.ytimg.com/vi/${ytId}/sddefault.jpg` : undefined);
            const captionTitle = videoTitle || searchQuery;
            if (thumb) {
                await sock.sendMessage(chatId, {
                    image: { url: thumb },
                    caption: `*${captionTitle}*\nBaixando...`
                }, { quoted: message });
            }
        } catch (e) { console.error('[VIDEO] thumb error:', e?.message || e); }
        

        // Validate YouTube URL
        let urls = videoUrl.match(/(?:https?:\/\/)?(?:youtu\.be\/|(?:www\.|m\.)?youtube\.com\/(?:watch\?v=|v\/|embed\/|shorts\/|playlist\?list=)?)([a-zA-Z0-9_-]{11})/gi);
        if (!urls) {
            await sock.sendMessage(chatId, { text: 'Este não é um link válido do YouTube!' }, { quoted: message });
            return;
        }

        // PrinceTech video API
        let videoDownloadUrl = '';
        let title = '';
        try {
            const meta = await princeVideoApi.fetchMeta(videoUrl);
            if (meta?.success && meta?.result?.download_url) {
                videoDownloadUrl = meta.result.download_url;
                title = meta.result.title || 'vídeo';
            } else {
                await sock.sendMessage(chatId, { text: 'Falha ao buscar o vídeo na API.' }, { quoted: message });
                return;
            }
        } catch (e) {
            console.error('[VIDEO] prince api error:', e?.message || e);
            await sock.sendMessage(chatId, { text: 'Falha ao buscar o vídeo na API.' }, { quoted: message });
            return;
        }
        const filename = `${title}.mp4`;

        // Try sending the video directly from the remote URL (like play.js)
        try {
            await sock.sendMessage(chatId, {
                video: { url: videoDownloadUrl },
                mimetype: 'video/mp4',
                fileName: filename,
                caption: `*${title}*\n\n> *_Downloaded by Knight Bot MD_*`
            }, { quoted: message });
            return;
        } catch (directSendErr) {
            console.log('[video.js] Direct send from URL failed:', directSendErr.message);
        }

        // If direct send fails, fallback to downloading and converting
        // Download the video file first
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
        const tempFile = path.join(tempDir, `${Date.now()}.mp4`);
        const convertedFile = path.join(tempDir, `converted_${Date.now()}.mp4`);
        
        let buffer;
        let download403 = false;
        try {
            const videoRes = await axios.get(videoDownloadUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                    'Referer': 'https://youtube.com/'
                },
                responseType: 'arraybuffer'
            });
            buffer = Buffer.from(videoRes.data);
        } catch (err) {
            if (err.response && err.response.status === 403) {
                // try alternate URL pattern as best-effort
                download403 = true;
            } else {
                await sock.sendMessage(chatId, { text: 'Falha ao baixar o arquivo de vídeo.' }, { quoted: message });
                return;
            }
        }
        // Fallback: try another URL if 403
        if (download403) {
            let altUrl = videoDownloadUrl.replace(/(cdn|s)\d+/, 's5');
            try {
                const videoRes = await axios.get(altUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                        'Referer': 'https://youtube.com/'
                    },
                    responseType: 'arraybuffer'
                });
                buffer = Buffer.from(videoRes.data);
            } catch (err2) {
                await sock.sendMessage(chatId, { text: 'Falha ao baixar o vídeo de outro servidor (CDN).' }, { quoted: message });
                return;
            }
        }
        if (!buffer || buffer.length < 1024) {
            await sock.sendMessage(chatId, { text: 'O arquivo baixado está vazio ou muito pequeno.' }, { quoted: message });
            return;
        }
        
        fs.writeFileSync(tempFile, buffer);

        try {
            await execPromise(`ffmpeg -i "${tempFile}" -c:v libx264 -c:a aac -preset veryfast -crf 26 -movflags +faststart "${convertedFile}"`);
            // Check if conversion was successful
            if (!fs.existsSync(convertedFile)) {
                await sock.sendMessage(chatId, { text: 'Arquivo convertido não encontrado.' }, { quoted: message });
                return;
            }
            const stats = fs.statSync(convertedFile);
            const maxSize = 62 * 1024 * 1024; // 62MB
            if (stats.size > maxSize) {
                await sock.sendMessage(chatId, { text: 'O vídeo é muito grande para ser enviado no WhatsApp.' }, { quoted: message });
                return;
            }
            // Try sending the converted video
            try {
                await sock.sendMessage(chatId, {
                    video: { url: convertedFile },
                    mimetype: 'video/mp4',
                    fileName: filename,
                    caption: `*${title}*`
                }, { quoted: message });
            } catch (sendErr) {
                console.error('[VIDEO] send url failed, trying buffer:', sendErr?.message || sendErr);
                const videoBuffer = fs.readFileSync(convertedFile);
                await sock.sendMessage(chatId, {
                    video: videoBuffer,
                    mimetype: 'video/mp4',
                    fileName: filename,
                    caption: `*${title}*`
                }, { quoted: message });
            }
            
        } catch (conversionError) {
            console.error('[VIDEO] conversion failed, trying original file:', conversionError?.message || conversionError);
            try {
                if (!fs.existsSync(tempFile)) {
                    await sock.sendMessage(chatId, { text: 'Arquivo temporário não encontrado.' }, { quoted: message });
                    return;
                }
                const origStats = fs.statSync(tempFile);
                const maxSize = 62 * 1024 * 1024; // 62MB
                if (origStats.size > maxSize) {
                    await sock.sendMessage(chatId, { text: 'O vídeo é muito grande para ser enviado no WhatsApp.' }, { quoted: message });
                    return;
                }
            } catch {}
            // Try sending the original file
            try {
                await sock.sendMessage(chatId, {
                    video: { url: tempFile },
                    mimetype: 'video/mp4',
                    fileName: filename,
                    caption: `*${title}*`
                }, { quoted: message });
            } catch (sendErr2) {
                console.error('[VIDEO] send original url failed, trying buffer:', sendErr2?.message || sendErr2);
                const videoBuffer = fs.readFileSync(tempFile);
                await sock.sendMessage(chatId, {
                    video: videoBuffer,
                    mimetype: 'video/mp4',
                    fileName: filename,
                    caption: `*${title}*`
                }, { quoted: message });
            }
        }

        // Clean up temp files
        setTimeout(() => {
            try {
                if (fs.existsSync(tempFile)) {
                    fs.unlinkSync(tempFile);
                }
                if (fs.existsSync(convertedFile)) {
                    fs.unlinkSync(convertedFile);
                }
            } catch (cleanupErr) {
                console.error('[VIDEO] cleanup error:', cleanupErr?.message || cleanupErr);
            }
        }, 3000);


    } catch (error) {
        console.error('[VIDEO] Command Error:', error?.message || error);
    await sock.sendMessage(chatId, { text: 'Falha no download: ' + (error?.message || 'Erro desconhecido') }, { quoted: message });
    }
}

module.exports = videoCommand; 