// src/app/api/list/route.ts
import { NextRequest, NextResponse } from "next/server";
// @ts-ignore
import NeoCities from "neocities";
// import { getIronSession } from 'iron-session';
// import { sessionOptions } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { message: "Username and password are required." },
        { status: 400 }
      );
    }

    const apiClient = new NeoCities(username, password);

    const infoResponse: any = await new Promise((resolve, reject) => {
      apiClient.info(username, (resp: any) => {
        resolve(resp);
      });
    });

    console.log("infoResponse", infoResponse);

    return NextResponse.json(infoResponse, { status: 200 });
  } catch (error: any) {
    console.error("API Site Info Error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to fetch site info" },
      { status: 500 }
    );
  }
}
