"use strict";

require('dotenv').config();

const {
  SERIAL_PORT,
  SERIAL_BAUD_RATE,
  SERIAL_TIMEOUT,
  SERIAL_RECONNECT_INTERVAL,
  SERIAL_RECONNECT_ATTEMPTS,
  SERIAL_SEND_RETRY_INTERVAL,
} = process.env;

const serialConfig = {
  port: SERIAL_PORT,
  baudRate: parseInt(SERIAL_BAUD_RATE, 10) || 115200,
  portTimeout: parseInt(SERIAL_TIMEOUT, 10) || 2000,
  reconnectOnFailure: true,
  reconnectInterval: parseInt(SERIAL_RECONNECT_INTERVAL, 10) || 3000,
  reconnectAttempts: parseInt(SERIAL_RECONNECT_ATTEMPTS, 10) || 5,
  sendRetryInterval: parseInt(SERIAL_SEND_RETRY_INTERVAL, 10) || 500,
};

const logConfig = {
  logFilePath: process.env.LOG_FILE_PATH || 'logs/motor_telemetry.csv',
  loggingIntervalMs: parseInt(process.env.LOGGING_INTERVAL_MS, 10) || 100,
};

module.exports = { serialConfig, logConfig };
