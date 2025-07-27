import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';

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
  instrumentations: [getNodeAutoInstrumentations(), new PinoInstrumentation()],
});

sdk.start();
