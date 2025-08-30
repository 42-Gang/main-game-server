import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PrismaInstrumentation } from '@prisma/instrumentation';
import { Span } from '@opentelemetry/api';

if (!process.env.JAEGER_ENDPOINT) {
  throw new Error('JAEGER_ENDPOINT environment variable is not set');
}
console.log(`Using Jaeger endpoint: ${process.env.JAEGER_ENDPOINT}`);

interface KafkajsMessage {
  key?: Buffer | string | null;
  value: Buffer | string | null;
  partition?: number;
  headers?: Record<string, Buffer | string | (Buffer | string)[] | undefined>;
  timestamp?: string;
}

const kafkaMessageHook = (
  span: Span,
  { topic, message }: { topic: string; message: KafkajsMessage },
) =>
  span.setAttributes({
    'kafka.topic': topic,
    'kafka.message.key': message.key ? message.key.toString() : undefined,
    'kafka.message.value.length': message.value ? message.value.length : undefined,
  });

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.JAEGER_ENDPOINT,
    headers: {},
  }),
  serviceName: 'main-game-service',
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-kafkajs': {
        enabled: true,
        producerHook: kafkaMessageHook,
        consumerHook: kafkaMessageHook,
      },
    }),
    new PrismaInstrumentation(),
  ],
});

sdk.start();
console.log('[DEBUG] OpenTelemetry SDK started with Jaeger exporter');
