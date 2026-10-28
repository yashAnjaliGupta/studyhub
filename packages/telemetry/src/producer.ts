import { Kafka, CompressionTypes, Partitioners, type Producer } from 'kafkajs';
import { readFileSync } from 'fs';
import { join } from 'path';
import { isExamTelemetryEvent } from './event-types';

export * from './event-types';
// export * from './telemetry-event';

let kafka: Kafka | null = null;
let producerInstance: Producer | null = null;
let isConnected = false;

export function getKafkaBrokers(): string {
  const brokers = (process.env.KAFKA_BROKERS || process.env.KAFKA_BOOTSTRAP_SERVERS)?.trim();
  if (!brokers) {
    throw new Error('KAFKA_BROKERS or KAFKA_BOOTSTRAP_SERVERS environment variable is not defined. Please check your .env file.');
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

export function resolveKafkaTopic(event: Record<string, unknown>, explicitTopic?: string): string {
  if (explicitTopic) return explicitTopic;
  if (typeof event.topic === 'string' && event.topic) return event.topic;
  if (typeof event.topic_name === 'string' && event.topic_name) return event.topic_name;

  if (isExamTelemetryEvent(event)) {
    return process.env.KAFKA_EXAM_TOPIC ?? 'exam-telemetry';
  }

  return process.env.KAFKA_TOPIC ?? 'web_telemetry';
}

export async function sendTelemetryEvent(
  event: Record<string, unknown>,
  targetTopic?: string
): Promise<void> {
  const topic = resolveKafkaTopic(event, targetTopic);
  try {
    const p = await connectProducer();
    const eventType = (event.eventType || event.event_type || 'event') as string;
    console.log(`[Kafka Telemetry] Publishing to topic "${topic}":`, eventType, {
      attemptId: event.attemptId || event.attempt_id,
      questionId: event.questionId || event.question_id,
      userId: event.userId || event.user_id
    });

    const messageKey = (event.attemptId || event.attempt_id || event.userId || event.user_id || event.sessionId || event.session_id || undefined) as string | undefined;

    await p.send({
      topic,
      messages: [
        {
          key: messageKey,
          value: JSON.stringify(event),
        },
      ],
    });
  } catch (error) {
    console.error(`Failed to send telemetry event to topic ${topic}:`, error);
    throw error;
  }
}

export async function sendTelemetryBatch(
  events: Record<string, unknown>[],
  targetTopic?: string
): Promise<void> {
  if (!events || events.length === 0) return;
  const p = await connectProducer();

  // Group events by destination topic
  const topicGroups = new Map<string, Array<{ key?: string; value: string }>>();

  for (const event of events) {
    const topic = resolveKafkaTopic(event, targetTopic);
    const key = (event.attemptId || event.attempt_id || event.userId || event.user_id || event.sessionId || event.session_id || undefined) as string | undefined;
    const item = { key, value: JSON.stringify(event) };

    const group = topicGroups.get(topic) || [];
    group.push(item);
    topicGroups.set(topic, group);
  }

  for (const [topic, messages] of topicGroups.entries()) {
    try {
      await p.send({
        topic,
        messages,
      });
    } catch (err) {
      console.error(`Failed to send batch of ${messages.length} events to topic ${topic}:`, err);
      throw err;
    }
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
