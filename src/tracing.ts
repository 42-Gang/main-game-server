import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import * as module from 'module';

module.register('@opentelemetry/instrumentation/hook.mjs', import.meta.url);

if (!process.env.JAEGER_ENDPOINT) {
  throw new Error('JAEGER_ENDPOINT environment variable is not set');
}
console.log(`Using Jaeger endpoint: ${process.env.JAEGER_ENDPOINT}`);

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
        producerHook: (span, { topic, message }) =>
          span.setAttributes({
            'kafka.topic': topic,
            'kafka.message.key': message.key ? message.key.toString() : undefined,
            'kafka.message.value': message.value ? message.value.toString() : undefined,
          }),
        consumerHook: (span, { topic, message }) =>
          span.setAttributes({
            'kafka.topic': topic,
            'kafka.message.key': message.key ? message.key.toString() : undefined,
            'kafka.message.value': message.value ? message.value.toString() : undefined,
          }),
      },
    }),
  ],
});

sdk.start();
console.log('[DEBUG] OpenTelemetry SDK started with Jaeger exporter');
