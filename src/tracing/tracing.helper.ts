import { Context, Span, SpanOptions, SpanStatusCode, trace } from '@opentelemetry/api';

const tracer = trace.getTracer('game-ws');

export async function withTracing<T>(
  name: string,
  options: SpanOptions,
  parentCtx: Context,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  return tracer.startActiveSpan(name, options, parentCtx, async (span) => {
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      throw error;
    }
  });
}
