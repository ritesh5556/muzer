import { prismaClient } from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (req: NextRequest) => {
    const session = await getServerSession();
    // TODO: You can get rid of the db call here 
    const user = await prismaClient.user.findFirst({
        where: {
            email: session?.user?.email ?? ""
        }
    });

    if (!user) {
        return NextResponse.json({
            message: "Unauthenticated"
        }, {
            status: 403,
            headers: {
                "Access-Control-Allow-Origin": "*", // Replace * with your allowed origin
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
            }
        });
    }

    return NextResponse.json({
        user
    }, {
        headers: {
            "Access-Control-Allow-Origin": "*", // Replace * with your allowed origin
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        }
    });
};

// Preflight request handler (OPTIONS request)
export const OPTIONS = () => {
    return new Response(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": "*", // Replace * with your allowed origin
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        }
    });
}

// don't static render
export const dynamic = 'force-dynamic';
