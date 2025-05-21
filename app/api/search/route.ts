import { NextRequest, NextResponse } from "next/server";
//@ts-ignore
import youtubesearchapi from "youtube-search-api";

export async function GET(req: NextRequest) {
    try {
        const searchQuery = req.nextUrl.searchParams.get("q");
        
        if (!searchQuery) {
            return NextResponse.json(
                { message: "Search query is required" },
                { status: 400 }
            );
        }

        const results = await youtubesearchapi.GetListByKeyword(searchQuery, false, 10);
        
        if (!results || !results.items) {
            return NextResponse.json(
                { message: "No results found" },
                { status: 404 }
            );
        }

        const formattedResults = results.items.map((item: any) => ({
            id: item.id,
            title: item.title,
            thumbnail: item.thumbnail.thumbnails[item.thumbnail.thumbnails.length - 1].url,
            url: `https://www.youtube.com/watch?v=${item.id}`
        }));

        return NextResponse.json(formattedResults);
    } catch (error) {
        console.error("Error in search:", error);
        return NextResponse.json(
            { message: "Error while searching videos" },
            { status: 500 }
        );
    }
} 