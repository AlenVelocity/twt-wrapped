import { NextRequest } from 'next/server';

// Store progress updates in memory
const progressStore = new Map<string, number>();

// Store cleanup functions
const cleanupStore = new Map<string, () => void>();

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username');
  if (!username) {
    return new Response('Username is required', { status: 400 });
  }

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  // Send initial progress
  const initialProgress = progressStore.get(username) || 0;
  await writer.write(
    encoder.encode(`data: ${JSON.stringify({ type: 'progress', username, progress: initialProgress })}\n\n`)
  );

  // Set up interval to check for progress updates
  const interval = setInterval(async () => {
    const progress = progressStore.get(username) || 0;
    try {
      await writer.write(
        encoder.encode(`data: ${JSON.stringify({ type: 'progress', username, progress })}\n\n`)
      );

      if (progress === 100) {
        clearInterval(interval);
        writer.close();
        progressStore.delete(username);
        cleanupStore.delete(username);
      }
    } catch (error) {
      clearInterval(interval);
      progressStore.delete(username);
      cleanupStore.delete(username);
    }
  }, 1000);

  // Store cleanup function
  const cleanup = () => {
    clearInterval(interval);
    progressStore.delete(username);
    cleanupStore.delete(username);
  };
  cleanupStore.set(username, cleanup);

  // Clean up when the connection is closed
  req.signal.addEventListener('abort', cleanup);

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

export function emit(username: string, progress: number) {
  progressStore.set(username, progress);
  
  // If progress is 100 or there was an error (progress reset to 0),
  // clean up after a short delay
  if (progress === 100 || progress === 0) {
    setTimeout(() => {
      const cleanup = cleanupStore.get(username);
      if (cleanup) {
        cleanup();
      }
    }, 2000);
  }
}

export const runtime = 'edge'; 