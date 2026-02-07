
const YtDlpWrap = require('yt-dlp-exec');

async function main() {
    try {
        console.log('Testing yt-dlp-exec...');
        const output = await YtDlpWrap('ytsearch1:hello', {
            getId: true,
            noWarnings: true,
            defaultSearch: 'ytsearch1'
        });
        console.log('Output:', output);
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
