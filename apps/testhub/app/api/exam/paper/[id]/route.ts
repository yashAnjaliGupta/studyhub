import { NextRequest, NextResponse } from 'next/server';
import {
  getPaperFromDatabase,
  getPaperMetadataFromDatabase,
  extractAndPopulatePaper,
} from '../../../../../lib/paper-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rawParams = await params;
    const rawId = rawParams?.id;

    if (!rawId || typeof rawId !== 'string' || !rawId.trim()) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Valid paper ID parameter is required.' },
        { status: 400 }
      );
    }

    const id = decodeURIComponent(rawId).trim();
    const isMetadataOnly =
      request.nextUrl.searchParams.get('metadataOnly') === 'true' ||
      request.nextUrl.searchParams.get('statusOnly') === 'true';

    // Fast check: return only lightweight metadata without loading entire questions list
    if (isMetadataOnly) {
      const metadata = await getPaperMetadataFromDatabase(id);
      if (metadata && metadata.questionCount > 0) {
        return NextResponse.json({
          status: 'READY',
          metadata,
        });
      }
      return NextResponse.json({
        status: 'NOT_FOUND',
        message: 'Paper not yet populated in database.',
      });
    }

    const paper = await getPaperFromDatabase(id);

    if (paper && paper.questions && paper.questions.length > 0) {
      return NextResponse.json({
        status: 'READY',
        paper,
      });
    }

    return NextResponse.json({
      status: 'NOT_FOUND',
      message: 'Paper not yet populated in database.',
    });
  } catch (error) {
    console.error('[API /api/exam/paper/[id]] GET error:', error);
    return NextResponse.json(
      { status: 'ERROR', message: 'Failed to check paper status' },
      { status: 500 }
    );
  }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    try {
      const rawParams = await params;
      const rawId = rawParams?.id;

      if (!rawId || typeof rawId !== 'string' || !rawId.trim()) {
        return NextResponse.json(
          { status: 'ERROR', message: 'Valid paper ID parameter is required.' },
          { status: 400 }
        );
      }

      const id = decodeURIComponent(rawId).trim();
      const force = request.nextUrl.searchParams.get('force') === 'true';
      const examParam = request.nextUrl.searchParams.get('exam');

      // Check if it already exists (unless force is requested)
      if (!force) {
        let paper = await getPaperFromDatabase(id);
        if (paper && paper.questions.length > 0) {
          return NextResponse.json({
            status: 'READY',
            paper,
          });
        }
      }

      // Run AI extraction pipeline and populate tables
      const paper = await extractAndPopulatePaper(id, force, examParam);

      return NextResponse.json({
        status: 'READY',
        paper,
      });
    } catch (error) {
      console.error('[API /api/exam/paper/[id]] POST error:', error);
      return NextResponse.json(
        { status: 'ERROR', message: (error as Error).message || 'Extraction pipeline failed' },
        { status: 500 }
      );
    }
  }
