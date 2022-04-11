'use strict';

// Core Components to Setup a Metric Signal

const { MeterProvider } = require('@opentelemetry/sdk-metrics-base');
const { Resource } = require('@opentelemetry/resources');

// Components required for annotations

const { SemanticResourceAttributes,SemanticAttributes  } = require('@opentelemetry/semantic-conventions');

// Exporters 

const { OTLPMetricExporter   } = require('@opentelemetry/exporter-otlp-http');
const { ConsoleMetricExporter} = require('@opentelemetry/sdk-metrics-base');
const { PrometheusExporter } = require('@opentelemetry/exporter-prometheus');

// various exporter configurations
const console_exporter = new ConsoleMetricExporter();
const otlp_json_exporter = new OTLPMetricExporter({
  url: 'http://localhost:8000/v1/metrics',
});

// Thanks https://github.com/open-telemetry/opentelemetry-js/tree/main/examples/prometheus

const prometheus_options = {
                port: 9464, 
                startServer: true};
const prometheus_exporter = new PrometheusExporter(prometheus_options);

// Setup our Metrics Provider with a Semantic Resource Name
// only one exporter per meter provider :( 

const meter = new MeterProvider({
  interval: 5000,
  exporter: prometheus_exporter,
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'brisjs-otel-example',
    [SemanticResourceAttributes.SERVICE_VERSION]: '0.0.1'
  }),
}).getMeter('brisjs-sample-metrics');

// Labels for two of our services

const redis_labels = {  
                  'brisjs.pid': process.pid, 
                  'brishs.environment': 'staging',
                  [SemanticAttributes.DB_REDIS_DATABASE_INDEX]: "0" ,
                  [SemanticAttributes.DB_SYSTEM]: "redis"
}

const sqs_labels = {  
  'brisjs.pid': process.pid, 
  'brishs.environment': 'staging',
  [SemanticAttributes.MESSAGING_SYSTEM]: "AmazonSQS",
  [SemanticAttributes.MESSAGING_DESTINATION]: "emailsToSend",
  [SemanticAttributes.MESSAGING_PROTOCOL]: "MQTT"
}

const mysql_labels = {
  [SemanticAttributes.DB_SYSTEM]: "MYSQL",
  [SemanticAttributes.DB_SQL_TABLE]: "orders",
  "brisjs.runtime": "AWS RDS"
}

// create a couple of metrics
// thanks https://www.npmjs.com/package/@opentelemetry/sdk-metrics-base :D 

const requestCounter = meter.createCounter('redis_number_of_save_cards', {
  description: 'Number of Saved Cards to Redis',
});


const upDownCounter = meter.createUpDownCounter('amazon_sqs_number_of_emails_to_send', {
  description: 'Number of Emails for SQS Queue to Process',
});


// a differente way of creating a gauge

meter.createValueObserver('mqysql_order_inserts', {
  description: 'Example of a sync observable gauge with callback',
}, (observableResult) => {
  observableResult.observe(getRandomMySQLOrderInserts(), mysql_labels);
});

function getRandomMySQLOrderInserts() {
  console.log('Invoking getRandomMySQLOrderInserts()')
  return parseInt(Math.random() *10);
}



// Generate Random Data. 

setInterval(() => {
  requestCounter.add(10, redis_labels);
  upDownCounter.add(Math.random() > 0.5 ? 20 : -10, sqs_labels);
}, 1000);