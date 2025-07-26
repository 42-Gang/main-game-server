import { Kafka } from 'kafkajs';
import * as process from 'node:process';

const brokerEnv = process.env.KAFKA_BROKER;
if (!brokerEnv) {
  console.error('[Kafka] KAFKA_BROKER 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

console.log('[DEBUG] KAFKA_BROKER ENV:', process.env.KAFKA_BROKER);

export const kafka = new Kafka({
  brokers: brokerEnv.split(','),
  ssl: false,
});
export const producer = kafka.producer();

(async () => {
  await producer.connect();
})();
