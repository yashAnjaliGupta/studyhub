import { Kafka, CompressionTypes, Partitioners } from 'kafkajs'
import { readFileSync } from 'fs'
import { join } from 'path'
import { config } from 'dotenv'

// Load environment variables from .env file
config()

// Kafka configuration from environment variables
let kafkaBrokers = process.env.KAFKA_BROKERS
if (!kafkaBrokers) {
  throw new Error('KAFKA_BROKERS environment variable is not defined. Please check your .env file.')
}

// Trim whitespace
kafkaBrokers = kafkaBrokers.trim()

// Validate broker format (should be host:port or comma-separated list of host:port)
const brokerPattern = /^([a-zA-Z0-9.-]+:\d+)(,([a-zA-Z0-9.-]+:\d+))*$/
if (!brokerPattern.test(kafkaBrokers)) {
  throw new Error(`KAFKA_BROKERS format is invalid. Expected format: host:port or host1:port1,host2:port2. Received: ${kafkaBrokers}`)
}
console.log('Kafka brokers:', kafkaBrokers)

const kafkaTopic = process.env.KAFKA_TOPIC ?? 'web_telemetry'

// SSL/SASL configuration (optional, for secure connections)
const sslEnabled =
  process.env.KAFKA_SSL === 'true' ||
  Boolean(process.env.KAFKA_SSL_CA_LOCATION) ||
  Boolean(process.env.KAFKA_SASL_MECHANISM)

let sslConfig: boolean | object | undefined = undefined

if (sslEnabled) {
  const caLocation = process.env.KAFKA_SSL_CA_LOCATION
  if (caLocation) {
    sslConfig = {
      ca: [readFileSync(join(process.cwd(), caLocation), 'utf8')],
      rejectUnauthorized: process.env.KAFKA_SSL_REJECT_UNAUTHORIZED !== 'false',
    }
  } else if (process.env.KAFKA_SSL_CA) {
    sslConfig = {
      ca: [process.env.KAFKA_SSL_CA],
      rejectUnauthorized: process.env.KAFKA_SSL_REJECT_UNAUTHORIZED !== 'false',
    }
  } else {
    // Default to rejectUnauthorized: false when CA cert is not provided (e.g. Aiven custom CA),
    // unless explicitly configured via KAFKA_SSL_REJECT_UNAUTHORIZED
    const rejectUnauthorized = process.env.KAFKA_SSL_REJECT_UNAUTHORIZED === 'true'
    sslConfig = { rejectUnauthorized }
  }
}

const saslConfig = process.env.KAFKA_SASL_MECHANISM
  ? ({
    mechanism: process.env.KAFKA_SASL_MECHANISM.toLowerCase(),
    username: process.env.KAFKA_SASL_USERNAME || '',
    password: process.env.KAFKA_SASL_PASSWORD || ''
  } as any)
  : undefined

// Create a Kafka client
const kafka = new Kafka({
  clientId: 'studyhub-telemetry-producer',
  brokers: [kafkaBrokers],
  ...(sslConfig && { ssl: sslConfig }),
  ...(saslConfig && { sasl: saslConfig })
})

// Create a producer with batching settings
export const producer = kafka.producer({
  createPartitioner: Partitioners.DefaultPartitioner,
  batchSize: 65536,    // 64KB - good balance for JSON telemetry
  lingerMs: 60000,     // Wait up to 60 seconds to fill batch (as requested)
  compression: CompressionTypes.GZIP
} as any)

let isConnected = false

// Connect the producer (idempotent)
export async function connectProducer() {
  if (!isConnected) {
    await producer.connect()
    isConnected = true
  }
}

// Send a telemetry event
export async function sendTelemetryEvent(event: Record<string, unknown>) {
  try {
    await connectProducer()
    console.log(kafkaTopic, 'Event', event)
    await producer.send({
      topic: kafkaTopic,
      messages: [
        {
          value: JSON.stringify(event),
        },
      ],
    })
  } catch (error) {
    console.error('Failed to send telemetry event:', error)
    throw error
  }
}

// Disconnect producer (optional, for graceful shutdown)
export async function disconnectProducer() {
  if (isConnected) {
    await producer.disconnect()
    isConnected = false
  }
}