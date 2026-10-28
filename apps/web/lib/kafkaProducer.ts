// Re-export telemetry producer from @repo/telemetry/producer
export {
  producer,
  connectProducer,
  sendTelemetryEvent,
  disconnectProducer,
  getKafkaClient,
  getKafkaProducer,
  getKafkaBrokers,
} from '@repo/telemetry/producer';