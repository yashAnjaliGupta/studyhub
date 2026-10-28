import { Kafka, CompressionTypes, Partitioners, type Producer } from 'kafkajs';
import { readFileSync } from 'fs';
import { join } from 'path';

export * from './event-types';
// export * from './telemetry-event';

let kafka: Kafka | null = null;
let producerInstance: Producer | null = null;
let isConnected = false;

export function getKafkaBrokers(): string {
  const brokers = process.env.KAFKA_BROKERS?.trim();
  if (!brokers) {
    throw new Error('KAFKA_BROKERS environment variable is not defined. Please check your .env file.');
  }

  const brokerPattern = /^([a-zA-Z0-9.-]+:\d+)(,([a-zA-Z0-9.-]+:\d+))*$/;
  if (!brokerPattern.test(brokers)) {
    throw new Error(`KAFKA_BROKERS format is invalid. Expected format: host:port or host1:port1,host2:port2. Received: ${brokers}`);
  }
  return brokers;
}

export function getKafkaClient(): Kafka {
  if (kafka) return kafka;

  const brokers = getKafkaBrokers();
  const sslEnabled =
    process.env.KAFKA_SSL === 'true' ||
    Boolean(process.env.KAFKA_SSL_CA_LOCATION) ||
    Boolean(process.env.KAFKA_SASL_MECHANISM);

  let sslConfig: boolean | object | undefined = undefined;

  if (sslEnabled) {
    const caLocation = process.env.KAFKA_SSL_CA_LOCATION;
    if (caLocation) {
      sslConfig = {
        ca: [readFileSync(join(process.cwd(), caLocation), 'utf8')],
        rejectUnauthorized: process.env.KAFKA_SSL_REJECT_UNAUTHORIZED !== 'false',
      };
    } else if (process.env.KAFKA_SSL_CA) {
      sslConfig = {
        ca: [process.env.KAFKA_SSL_CA],
        rejectUnauthorized: process.env.KAFKA_SSL_REJECT_UNAUTHORIZED !== 'false',
      };
    } else {
      const rejectUnauthorized = process.env.KAFKA_SSL_REJECT_UNAUTHORIZED === 'true';
      sslConfig = { rejectUnauthorized };
    }
  }

  const saslConfig = process.env.KAFKA_SASL_MECHANISM
    ? {
      mechanism: process.env.KAFKA_SASL_MECHANISM.toLowerCase(),
      username: process.env.KAFKA_SASL_USERNAME || '',
      password: process.env.KAFKA_SASL_PASSWORD || '',
    }
    : undefined;

  kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || 'studyhub-telemetry-producer',
    brokers: [brokers],
    ...(sslConfig && { ssl: sslConfig as any }),
    ...(saslConfig && { sasl: saslConfig as any }),
  });

  return kafka;
}

export function getKafkaProducer(): Producer {
  if (producerInstance) return producerInstance;

  const client = getKafkaClient();
  producerInstance = client.producer({
    createPartitioner: Partitioners.DefaultPartitioner,
    batchSize: 65536,
    lingerMs: 60000,
    compression: CompressionTypes.GZIP,
  } as any);

  return producerInstance;
}

export async function connectProducer(): Promise<Producer> {
  const p = getKafkaProducer();
  if (!isConnected) {
    await p.connect();
    isConnected = true;
  }
  return p;
}

export async function sendTelemetryEvent(event: Record<string, unknown>): Promise<void> {
  const topic = process.env.KAFKA_TOPIC ?? 'web_telemetry';
  try {
    const p = await connectProducer();
    console.log(topic, 'Event', event);
    await p.send({
      topic,
      messages: [
        {
          value: JSON.stringify(event),
        },
      ],
    });
  } catch (error) {
    console.error('Failed to send telemetry event:', error);
    throw error;
  }
}

export async function disconnectProducer(): Promise<void> {
  if (isConnected && producerInstance) {
    await producerInstance.disconnect();
    isConnected = false;
  }
}

// Lazy proxy for direct access to producer while preventing crash if env vars missing during import
export const producer = new Proxy({} as Producer, {
  get(_target, prop) {
    const p = getKafkaProducer();
    const val = (p as any)[prop];
    return typeof val === 'function' ? val.bind(p) : val;
  },
});
