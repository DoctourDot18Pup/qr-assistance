import { auth } from '@/lib/auth';
import { getUnreadCount } from '@/lib/db/queries/notifications';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = Number((session.user as { id: string }).id);

  const encoder = new TextEncoder();
  let intervalId: ReturnType<typeof setInterval>;
  let pingId: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    start(controller) {
      const send = async () => {
        try {
          const unreadCount = await getUnreadCount(userId);
          const data = `data: ${JSON.stringify({ unreadCount })}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch {
          controller.close();
        }
      };

      const ping = () => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ ping: true })}\n\n`));
        } catch {
          controller.close();
        }
      };

      send();
      intervalId = setInterval(send, 5000);
      pingId = setInterval(ping, 15000);
    },
    cancel() {
      clearInterval(intervalId);
      clearInterval(pingId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
