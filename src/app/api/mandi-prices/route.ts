import { NextResponse } from 'next/server';

const BASE_URL = 'https://api.data.gov.in/resource/';
const RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070';
const API_KEY = process.env.DATA_GOV_API_KEY || ''; // from .env

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const state = searchParams.get('state');
  const district = searchParams.get('district');
  const commodity = searchParams.get('commodity');

  if (!state || !district || !commodity) {
    return NextResponse.json({ error: 'Missing required query parameters' }, { status: 400 });
  }

  const url = `${BASE_URL}${RESOURCE_ID}?api-key=${API_KEY}&format=json&filters[state]=${encodeURIComponent(state)}&filters[district]=${encodeURIComponent(district)}&filters[commodity]=${encodeURIComponent(commodity)}&limit=50`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
        // Pass the error from the external API to the client
        const errorData = await res.json();
        return NextResponse.json({ error: errorData.message || 'Failed to fetch from external API' }, { status: res.status });
    }
    const json = await res.json();
    return NextResponse.json(json.records || []);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch mandi data' }, { status: 500 });
  }
}
