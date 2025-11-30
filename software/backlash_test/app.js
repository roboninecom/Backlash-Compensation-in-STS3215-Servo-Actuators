"use strict";

const path = require('path');

const { StsInstruction, StsRegisterSchemaKeys, StsManager, StsMotor } = require('StsServo');
const { TelemetryLogger } = require('./TelemetryLogger');

const { serialConfig, logConfig } = require('./config');
const { motorSweepConfigs } = require('./sweepConfig');

const {
  CURRENT_POSITION,
  CURRENT_SPEED,
  CURRENT_LOAD,
  CURRENT_CURRENT,
  CURRENT_TEMPERATURE,
  SERVO_STATUS,
  MOVING_STATUS
} = StsRegisterSchemaKeys;

const motors = [];
const motorsById = new Map();
const motorStates = new Map();
let sweepStarted = false;
let telemetryLogTimer = null;
let logger = null;

function buildHeaders(motorIds) {
  const headers = ['timestamp'];
  for (const id of motorIds) {
    headers.push(
      `target pos (${id})`,
      `pos (${id})`,
      `speed (${id})`,
      `load (${id})`,
      `current (${id})`,
      `temp (${id})`,
      `status (${id})`,
      `moving (${id})`
    );
  }
  return headers;
}

function startTelemetryLogging(motorIds) {
  const intervalMs = logConfig.loggingIntervalMs || 500;

  telemetryLogTimer = setInterval(() => {
    const timestamp = new Date().toISOString();

    const row = [timestamp];
    let hasData = false;

    for (const motorId of motorIds) {
      const state = motorStates.get(motorId);
      const motor = motorsById.get(motorId);
      const telemetry = motor?.lastTelemetry ?? {};
      const targetPosition = state?.lastCommanded ?? null;

      row.push(
        targetPosition ?? '',
        telemetry?.[CURRENT_POSITION] ?? '',
        telemetry?.[CURRENT_SPEED] ?? '',
        telemetry?.[CURRENT_LOAD] ?? '',
        telemetry?.[CURRENT_CURRENT] ?? '',
        telemetry?.[CURRENT_TEMPERATURE] ?? '',
        telemetry?.[SERVO_STATUS] ?? '',
        telemetry?.[MOVING_STATUS] ?? ''
      );

      if (
        targetPosition != null ||
        telemetry?.[CURRENT_POSITION] != null ||
        telemetry?.[CURRENT_SPEED] != null ||
        telemetry?.[CURRENT_LOAD] != null ||
        telemetry?.[CURRENT_CURRENT] != null ||
        telemetry?.[CURRENT_TEMPERATURE] != null ||
        telemetry?.[SERVO_STATUS] != null ||
        telemetry?.[MOVING_STATUS] != null
      ) {
        hasData = true;
      }
    }

    if (hasData) {
      logger.appendRow(row).catch((err) => {
        console.error(`Telemetry log write failed (${filePath}):`, err);
      });
    }
  }, intervalMs);
}

function startSweepTest(stsManager) {
  if (motors.length < motorSweepConfigs.length) {
    console.warn(`Expected ${motorSweepConfigs.length} motors, got ${motors.length}. Sweep test skipped.`);
    return;
  }

  const missingIds = motorSweepConfigs
    .map(cfg => cfg.index)
    .filter(id => !motorsById.has(id));

  if (missingIds.length) {
    console.warn(`Missing motors for IDs: ${missingIds.join(', ')}. Sweep test skipped.`);
    return;
  }

  sweepStarted = true;
  console.log('Starting motor sweep test');

  motorSweepConfigs.forEach((cfg) => {
    const motor = motorsById.get(cfg.index);
    if (!motor) return;
    if (!Array.isArray(cfg.positions) || cfg.positions.length === 0) {
      console.warn(`No positions configured for motor ${cfg.index}. Sweep skipped.`);
      return;
    }

    const targetIds = [cfg.index];
    let positionIndex = 0;
    let initialized = false;

    const state = motorStates.get(cfg.index) ?? {
      config: cfg,
      lastCommanded: null,
      lastCommandedAt: null,
      timer: null
    };

    motorStates.set(cfg.index, state);

    const sanitizeInterval = (value) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
    };

    const fallbackIntervalMs =
      sanitizeInterval(
        Array.isArray(cfg.intervalsMs) && cfg.intervalsMs.length ? cfg.intervalsMs[0] : cfg.intervalMs
      ) ?? 1000;

    const getIntervalForIndex = (index) => {
      const intervals = Array.isArray(cfg.intervalsMs) ? cfg.intervalsMs : null;
      if (intervals?.length) {
        const candidate = sanitizeInterval(intervals[index % intervals.length]);
        if (candidate != null) {
          return candidate;
        }
      }
      return fallbackIntervalMs;
    };

    const scheduleNextMove = (delayMs = fallbackIntervalMs) => {
      if (state.timer) {
        clearTimeout(state.timer);
        state.timer = null;
      }
      const safeDelay = sanitizeInterval(delayMs) ?? fallbackIntervalMs;
      state.timer = setTimeout(() => {
        void writePosition();
      }, safeDelay);
    };

    const writePosition = async () => {
      const currentIndex = positionIndex;
      const targetPosition = cfg.positions[currentIndex];
      const dwellMs = getIntervalForIndex(currentIndex);
      positionIndex = (positionIndex + 1) % cfg.positions.length;

      const payload = initialized
        ? {
            [StsRegisterSchemaKeys.TARGET_POSITION]: targetPosition
          }
        : {
            [StsRegisterSchemaKeys.TORQUE_SWITCH]: 1,
            [StsRegisterSchemaKeys.RUNNING_SPEED]: cfg.speed,
            [StsRegisterSchemaKeys.ACCELERATION]: cfg.accel,
            [StsRegisterSchemaKeys.TARGET_POSITION]: targetPosition
          };

      try {
        await stsManager.Write(payload, targetIds);
        initialized = true;
        state.lastCommanded = targetPosition;
        state.lastCommandedAt = Date.now();
      } catch (err) {
        console.error(`Failed to update motor ${cfg.index}:`, err);
      } finally {
        scheduleNextMove(dwellMs);
      }
    };

    scheduleNextMove(cfg.startDelayMs ?? 0);
  });
}

async function init() {
  try {
    const sts = new StsInstruction(serialConfig);
    sts.on('error', (err) => console.error(err));

    const stsManager = StsManager.getInstance(sts);
    stsManager.on('error', (err) => console.error('StsManager error:', err));
    stsManager.on('discovery', (ids) => {
      console.log(`Servos found: ${ids}`);
      for (const id of ids) {
        if (!motorsById.has(id)) {
          const motor = new StsMotor(id);
          motors.push(motor);
          motorsById.set(id, motor);
        }
      }

      const headers = buildHeaders(ids);
      const filePath = path.isAbsolute(logConfig.logFilePath) ? logConfig.logFilePath : path.join(__dirname, logConfig.logFilePath);
      logger = new TelemetryLogger(filePath, headers);
      startTelemetryLogging(ids);

      const allConfiguredMotorsPresent = motorSweepConfigs.every(cfg => motorsById.has(cfg.index));
      if (!sweepStarted && allConfiguredMotorsPresent) {
        startSweepTest(stsManager);
      }
    });
    
    await sts.ConnectFailsafe();
  } catch (err) {
    console.error("Initialization failed:", err);
  }
}

init().catch(console.error);
