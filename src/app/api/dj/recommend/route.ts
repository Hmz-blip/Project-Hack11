
import { NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import OpenAI from 'openai';
import YtDlpWrap from 'yt-dlp-exec';

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = 'nodejs'; // Ensure Node.js runtime for yt-dlp spawning
export const maxDuration = 30; // Allow 30 seconds for LLM + Search
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        // 1. Authentication
        const session = await getSession();
        const user = session?.user;

        if (!user) {
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
            const completion = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are a professional DJ. Convert the user's vibe description into a specific YouTube search query that yields the best music video results. Return ONLY the search query, nothing else. Example: 'chill lo-fi' -> 'lofi hip hop radio - beats to relax/study to'"
                    },
                    { role: "user", content: vibe }
                ],
                max_tokens: 50,
            });
            searchQuery = completion.choices[0].message.content?.trim() || vibe;
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
