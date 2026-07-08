import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'No API key' });
    }
    
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();
    
    return NextResponse.json({ models: data.models?.map((m: any) => m.name) || data });
  } catch (error) {
    return NextResponse.json({ error: String(error) });
  }
}
