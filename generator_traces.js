'use strict';

// Core Components to Setup a Tracer Signal

const { BasicTracerProvider, SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { Resource } = require('@opentelemetry/resources');
const { trace, context } = require('@opentelemetry/api')

// Components required for annotations

const { SemanticResourceAttributes,SemanticAttributes  } = require('@opentelemetry/semantic-conventions');
const {SpanKind, SpanStatusCode } = require('@opentelemetry/api')

// Exporters 

const {ConsoleSpanExporter} = require('@opentelemetry/sdk-trace-base');
const { OTLPTraceExporter} = require('@opentelemetry/exporter-otlp-http');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { ZipkinExporter } = require('@opentelemetry/exporter-zipkin');

// Faker for Dummy data generation

const { faker } = require('@faker-js/faker');

// Setup our Tracing Provider with a Semantic Resource Name
// https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/resource/semantic_conventions/README.md

const provider = new BasicTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'brisjs-otel-example',
    [SemanticResourceAttributes.SERVICE_VERSION]: '0.0.1'
  }),
});

// Configure Exporters. Note different exporters may have different Settings

const zipkin_exporter = new ZipkinExporter({
  url: `http://localhost:9411/api/v2/spans` 
})

const otlp_json_exporter = new OTLPTraceExporter({
  url: "http://localhost:8000/v1/traces"
})

const jaeger_exporter = new JaegerExporter(
  {
    endpoint: 'http://localhost:14268/api/traces'
  }
) 

// Register, providers exporters and span processors

provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
provider.addSpanProcessor(new SimpleSpanProcessor(otlp_json_exporter));
provider.addSpanProcessor(new SimpleSpanProcessor(jaeger_exporter));
provider.addSpanProcessor(new SimpleSpanProcessor(zipkin_exporter));

provider.register();

// Create a tracer Signal 

const tracer = trace.getTracer('brisjs-sample-traces');

// utility function to return different SpanStatus Codes
// this is set using the service_reliability setting. The more reliable the service the less likely we will generate a span error
// use numbers 0-1 i.e. 99% reliability would be 0.99

function generateRandomSpanErrors(error_threshold){
  if(Math.random() > error_threshold){
    return SpanStatusCode.OK
  }
  else {
    return SpanStatusCode.ERROR
  }
}

// this is the function that simulates a shopping cart. 

function simulateAShoppingCart(parent,service_number_to_simulate) {
  
  // this function will generate child spans. 
  const parent_span_context = trace.setSpan(context.active(), parent);
  
  // simulating services

  let span_name = new String(); 
  let service_reliability = 0.99
  let span_kind = SpanKind.CLIENT
  let service_typical_duration_in_milliseconds = 1000;
  // https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/trace/semantic_conventions/README.md
  let span_attributes = {}; 
  
  // simulate something similar to this: https://opentelemetry.io/docs/reference/specification/overview/#traces
  switch(service_number_to_simulate){
    case 0:
      span_name = "NODEJS PASSPORT VALIDATE USER TOKEN"
      span_kind = SpanKind.INTERNAL
      service_reliability = 0.99
      service_typical_duration_in_milliseconds = 200
      span_attributes = {
        [SemanticAttributes.ENDUSER_ID]: faker.internet.userName(),
        "brisjs.auth_strategy": "OIDC"
      }
      break;
    case 1:
      span_name = "REDIS SAVE SHOPPING CART"
      span_kind = SpanKind.CLIENT
      service_reliability = 0.99
      span_attributes = {
        [SemanticAttributes.DB_SYSTEM]: "redis",
        [SemanticAttributes.DB_REDIS_DATABASE_INDEX]: "0",
        "brisjs.cluster": true,
        "brisjs.runtime": "AWS EKS"
      }
      break;
    case 2:
      span_name = "VALIDATE CREDIT CARD EXTERNAL SERVICE"
      span_kind = SpanKind.CLIENT
      service_reliability = 0.1
      span_attributes = {
        [SemanticAttributes.HTTP_URL]: "http://www.3rdpartyverifier.com",
        [SemanticAttributes.HTTP_METHOD]: "POST",
        "brisjs.third_party" : true
        
      }
      break;
    case 3:
      span_name = "MYSQL INSERT INTO ORDERS"
      span_kind = SpanKind.CLIENT
      service_reliability = 0.1
      span_attributes = {
        [SemanticAttributes.DB_SYSTEM]: "MYSQL",
        [SemanticAttributes.DB_SQL_TABLE]: "orders",
        "brisjs.runtime": "AWS RDS"
      }
      break;
    case 4:
      span_name = "AMAZON SQS SEND EMAIL WITH ORDER STATUS"
      span_kind = SpanKind.PRODUCER
      service_reliability = 0.9
      span_attributes = {
        [SemanticAttributes.MESSAGING_SYSTEM]: "AmazonSQS",
        [SemanticAttributes.MESSAGING_DESTINATION]: "emailsToSend",
        [SemanticAttributes.MESSAGING_PROTOCOL]: "MQTT"
      }
      break;
    case 5:
        span_name = "RABBITMQ UPDATE STOCK ALLOCATIONS"
        span_kind = SpanKind.PRODUCER
        service_reliability = 0.9
        service_typical_duration_in_milliseconds = 500
        span_attributes = {
          [SemanticAttributes.MESSAGING_SYSTEM]: "RabbitMQ",
          [SemanticAttributes.MESSAGING_DESTINATION]: "stockAllocationUpdates",
          [SemanticAttributes.MESSAGING_PROTOCOL]: "AMQP"
        }
        break;

  }

  const span = tracer.startSpan(span_name, 
    {
      kind:span_kind,
      attributes:span_attributes
    }, 
    parent_span_context);
  


  span.addEvent(`Starting work on ${span_name}`);
  
  setTimeout(()=>{
    span.addEvent(`Finishing work on ${span_name}`);
    span.setStatus(generateRandomSpanErrors(service_reliability))
    span.end();
  },Math.random()*service_typical_duration_in_milliseconds)

}

setInterval(() => {
  const parentSpan = tracer.startSpan('Shopping Cart',{
    kind:SpanKind.SERVER
  });
  for (let i = 0; i < 6; i += 1) {
    simulateAShoppingCart(parentSpan,i);
  }
  // Be sure to end the span.
  parentSpan.end();
}, 5000);
