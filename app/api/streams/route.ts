import { prismaClient } from "@/app/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
//@ts-ignore
import youtubesearchapi from "youtube-search-api";
import { YT_REGEX } from "@/app/lib/utils";
import { getServerSession } from "next-auth";

const CreateStreamSchema = z.object({
    creatorId: z.string(),
    url: z.string()
});

const MAX_QUEUE_LEN = 20;

export async function POST(req: NextRequest) {
    try {
        console.log("Headers:", req.headers);

        const body = await req.json();
        if (!body) {
            return NextResponse.json(
                { message: "Request body is missing" },
                { status: 400 }
            );
        }

        const data = CreateStreamSchema.parse(body);

        const isYt = data.url.match(YT_REGEX);
        if (!isYt) {
            return NextResponse.json(
                { message: "Wrong URL format" },
                { status: 400 }
            );
        }

        const extractedId = data.url.split("?v=")[1];

        // Fetch video details from YouTube API
        console.log("Token : ", extractedId);
        const res = await youtubesearchapi.GetVideoDetails(extractedId);
        if (!res || !res.thumbnail) {
            console.error("Failed to fetch video details:", res);
            return NextResponse.json({ message: "Unable to fetch video details or thumbnails" }, { status: 400 });
        }


        // Sort thumbnails by width
        const thumbnails = res.thumbnail.thumbnails;
        thumbnails.sort((a: { width: number }, b: { width: number }) =>
            a.width < b.width ? -1 : 1
        );

        // Check if the creator has reached the max queue length
        const existingActiveStream = await prismaClient.stream.count({
            where: {
                userId: data.creatorId
            }
        });

        if (existingActiveStream > MAX_QUEUE_LEN) {
            return NextResponse.json(
                { message: "Already at limit" },
                { status: 400 }
            );
        }

        // Create the stream in the database
        const stream = await prismaClient.stream.create({
            data: {
                userId: data.creatorId,
                url: data.url,
                extractedId,
                type: "Youtube",
                title: res.title ?? "Cant find video",
                smallImg:
                    (thumbnails.length > 1
                        ? thumbnails[thumbnails.length - 2]?.url
                        : thumbnails[thumbnails.length - 1]?.url) ??
                    "https://cdn.pixabay.com/photo/2024/02/28/07/42/european-shorthair-8601492_640.jpg",
                bigImg:
                    thumbnails[thumbnails.length - 1]?.url ??
                    "https://cdn.pixabay.com/photo/2024/02/28/07/42/european-shorthair-8601492_640.jpg"
            }
        });

        return NextResponse.json({
            ...stream,
            hasUpvoted: false,
            upvotes: 0
        });
    } catch (e) {
        console.error("Error in POST:", e);
        return NextResponse.json(
            { message: "Error while adding a stream" },
            { status: 500 }
        );
    }
}

export async function GET(req: NextRequest) {
    try {
        const creatorId = req.nextUrl.searchParams.get("creatorId");
        const session = await getServerSession();

        // Check if the session is valid
        const user = await prismaClient.user.findFirst({
            where: {
                email: session?.user?.email ?? ""
            }
        });

        if (!user) {
            return NextResponse.json(
                { message: "Unauthenticated User" },
                { status: 403 }
            );
        }

        if (!creatorId) {
            return NextResponse.json(
                { message: "Creator ID is missing" },
                { status: 400 }
            );
        }

        const [streams, activeStream] = await Promise.all([
            prismaClient.stream.findMany({
                where: {
                    userId: creatorId,
                    played: false
                },
                include: {
                    _count: {
                        select: {
                            upvotes: true
                        }
                    },
                    upvotes: {
                        where: {
                            userId: user.id
                        }
                    }
                }
            }),
            prismaClient.currentStream.findFirst({
                where: {
                    userId: creatorId
                },
                include: {
                    stream: true
                }
            })
        ]);

        return NextResponse.json({
            streams: streams.map(({ _count, ...rest }) => ({
                ...rest,
                upvotes: _count.upvotes,
                haveUpvoted: rest.upvotes.length > 0
            })),
            activeStream
        });
    } catch (e) {
        console.error("Error in GET:", e);
        return NextResponse.json(
            { message: "Error while fetching streams" },
            { status: 500 }
        );
    }
}
