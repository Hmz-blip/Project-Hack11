
import { NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
// @ts-ignore
import * as ytDlpExec from 'yt-dlp-exec';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

export const maxDuration = 30; // 30 seconds max duration for Vercel Free Tier (or Pro default)
export const dynamic = 'force-dynamic';

// Workaround for Next.js 14+ bundling issue where __dirname is mocked to /
const getYtDlpWrap = () => {
    try {
        const binPath = path.resolve(process.cwd(), 'node_modules/yt-dlp-exec/bin/yt-dlp');
        // @ts-ignore
        const create = ytDlpExec.create || ytDlpExec.default.create || ytDlpExec.default;

        if (typeof ytDlpExec.create === 'function') {
            return ytDlpExec.create(binPath);
        }
        return ytDlpExec.default || ytDlpExec;
    } catch (e) {
        console.error("Failed to initialize yt-dlp wrapper:", e);
        return ytDlpExec.default || ytDlpExec;
    }
};

const YtDlpWrap = getYtDlpWrap();


export async function POST(req: Request) {
    try {
        // 1. Authentication
        const session = await auth0.getSession();
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { vibe } = await req.json();

        if (!vibe) {
            return NextResponse.json({ error: 'Vibe is required' }, { status: 400 });
        }

        console.log(`[DJ] Processing vibe: ${vibe}`);

        // 2. LLM Translation (Vibe -> Search Query)
        let searchQuery = vibe;
        try {
            const prompt = `You are a professional DJ. Convert the user's vibe description into a specific YouTube search query that yields the best music video results. Return ONLY the search query, nothing else. Example: 'chill lo-fi' -> 'lofi hip hop radio - beats to relax/study to'. User's vibe: ${vibe}`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            searchQuery = response.text().trim() || vibe;

            console.log(`[DJ] Generated Query: ${searchQuery}`);
        } catch (llmError) {
            console.error("LLM Error, falling back to raw vibe:", llmError);
        }

        // 3. Fetch Music IDs via yt-dlp
        // We use "ytsearch5:" to get top 5 results
        const ytSearchQuery = `ytsearch5:${searchQuery}`;

        // yt-dlp-exec wrapper
        const output = await YtDlpWrap(ytSearchQuery, {
            getId: true,
            flatPlaylist: true,
            noWarnings: true,
            defaultSearch: 'ytsearch5'
        });

        // Output is newline separated IDs
        // Sometimes output might be an object if using specific flags, but with getId it's usually stdout string
        // Let's parse it carefully.

        console.log("yt-dlp output:", output);

        // YtDlpWrap returns a Promise<string> (stdout) by default if not tailored otherwise
        const videoIds = (output as unknown as string).split('\n').filter(id => id.length > 5);

        return NextResponse.json({
            playlist: videoIds,
            query: searchQuery
        });

    } catch (error) {
        console.error('[DJ] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
