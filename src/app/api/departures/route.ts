import { NextRequest, NextResponse } from 'next/server';
import { getDepartureBoard } from '@/services/darwin';
import { TflService } from '@/services/tfl';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const stationCrs = searchParams.get('stationCrs');
  const stationId = searchParams.get('stationId'); // TfL station ID
  const type = searchParams.get('type') || 'rail'; // 'rail' or 'dlr'
  const numRows = parseInt(searchParams.get('rows') || '10');

  // Handle DLR requests
  if (type === 'dlr') {
    if (!stationId) {
      return NextResponse.json({ error: 'Station ID is required for DLR' }, { status: 400 });
    }

    try {
      const tflService = new TflService();
      const departureBoard = await tflService.getDlrDepartures(stationId);
      
      return NextResponse.json(departureBoard);
    } catch (error) {
      console.error('TfL API error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch DLR departure information' }, 
        { status: 500 }
      );
    }
  }

  // Handle rail requests (Darwin API)
  if (type === 'rail') {
    if (!stationCrs) {
      return NextResponse.json({ error: 'Station CRS code is required' }, { status: 400 });
    }

    try {
      const departureBoard = await getDepartureBoard(stationCrs, numRows);
      
      return NextResponse.json(departureBoard);
    } catch (error) {
      console.error('Darwin API error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch departure information' }, 
        { status: 500 }
      );
    }
  }

  // Unknown type
  return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
}