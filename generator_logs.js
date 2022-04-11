const { hrTime, hrTimeToNanoseconds } = require('@opentelemetry/core');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes,SemanticAttributes  } = require('@opentelemetry/semantic-conventions');
const { faker } = require('@faker-js/faker');


// Simple implementation of the SDK Specification https://opentelemetry.io/docs/reference/specification/logs/logging-library-sdk/
// LogEmitterProvider, LogProcessor, LogEmitter are not demonstrated 

// This is an oversimplifaction of what would be a exportable enum. For example SpanKind.SERVER

const LoggerSeverityText = {
    TRACE: 'TRACE' , 	 
    DEBUG: 'DEBUG',	
    INFO: 'INFO',	
    WARN : 'WARN',	
    ERROR: 'ERROR',	
    FATAL: 'FATAL'
};

const LoggerSeverityNumber = {
    TRACE:  1,
    TRACE2: 2,
    DEBUG:  5,
    DEBUG2: 6
}

// InstrumentationScope https://opentelemetry.io/docs/reference/specification/resource/semantic_conventions/#telemetry-sdk
// This is the equivalent of const logger = new LoggingProvider().getLogger('brisjs-sample-logs');
const BRISJS_LOGGER_INSTRUMENTATION_SCOPE  ={
    name : 'brisjs-sample-logs'
}

// Telemetry SDK Representation https://opentelemetry.io/docs/reference/specification/resource/semantic_conventions/#telemetry-sdk
const BRISJS_LOGGER_TELEMETRY_SDK  ={
    'telemetry.sdk.name' : 'brisjs-sample-logger',
    'telemetry.sdk.language' :	'nodejs',
    'telemetry.sdk.version' : '2022.4.1'
}

// This is the equivalent of const logger = new LoggingProvider(resource: = new Resource()).getLogger('brisjs-sample-logs');
const brisjs_logger_resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'brisjs-otel-example',
    [SemanticResourceAttributes.SERVICE_VERSION]: '0.0.1'
  })



// simulates in a simple representation of what ConsoleMetricExporter or ConsoleSpanExporter do

function ConsoleLogExporter() {
    const username = faker.internet.userName()
    console.log(
        JSON.stringify(
        {
            Timestamp: hrTimeToNanoseconds(hrTime()),
            ObservedTimestamp: hrTimeToNanoseconds(hrTime()),
            SeverityText: LoggerSeverityText.INFO,
            Body: `A user with username: ${username} logged in from with IP ${faker.internet.ipv4()}`,
            Resource: brisjs_logger_resource.attributes,
            InstrumentationScope: BRISJS_LOGGER_INSTRUMENTATION_SCOPE,
            Attributes:    { 
                [SemanticAttributes.ENDUSER_ID]: username,
                "brisjs.auth_strategy": "OIDC"
            }

        },null,4)
    )
}



setInterval(() => {
    const number_of_logs = parseInt(Math.random() * 10)
    for (let i = 0; i < number_of_logs; i += 1) {
        ConsoleLogExporter();
    }
  }, 5000);


