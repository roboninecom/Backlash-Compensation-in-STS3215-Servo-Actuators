# Backlash Compensation in STS3215 Servo Actuators

This repository contains the source code, data analysis scripts, and LaTeX source for the research paper **"Backlash Compensation in STS3215 Servo Actuators"**.

The project demonstrates a practical method to eliminate mechanical backlash in low-cost Feetech STS3215 servos using a dual-motor configuration with controlled pretension.

---

## 📂 Project Structure

```text
├── cad/                         # Hardware design files (.step and .stl)
├── logs/                        # Output directory for telemetry data (CSV)
├── paper/                       # LaTeX source code of the article and figures
├── software/
│   ├── backlash_test/
│   │   ├── .env                     # Environment variables
│   │   ├── .gitignore               # Git ignore rules
│   │   ├── app.js                   # Main Node.js controller application
│   │   ├── config.js                # Serial port configuration
│   │   ├── package.json             # Node.js dependencies and scripts
│   │   ├── sweepConfig.js           # Configuration for motion sequences
│   │   └── TelemetryLogger.js       # Module for CSV data logging
│   ├── logs_calculation/
│   │   ├── log_calc.py              # Calculates backlash statistics
│   │   ├── log_calc_single.py       # Single-file backlash calculation
│   └── logs_visualisation/
│       ├── log_viz.py               # Generates graphs from telemetry CSVs (batch)
│       ├── log_viz_single.py        # Generates graphs from a single CSV
```

## 🛠 Hardware Requirements

![Test Stand Setup](paper/media/fig3_teststand.png)
*Figure: Mechanical test stand used for backlash measurements.*

To reproduce the experiments, you will need:
*   **Servos:** 2x Feetech STS3215 (configured in dual-mode) + additional servos for load testing.
*   **Controller:** USB-TTL Adapter (e.g., Feetech URT-1) connected to a PC.
*   **Power Supply:** 12V DC power supply capable of at least 3A.
*   **Mechanical Assembly:** Dual-servo bracket (see paper for details).

## 🚀 Getting Started

### 1. Controller Setup (Node.js)

The Node.js application manages the servos, executes motion profiles, and logs telemetry.

**Prerequisites:** Node.js (v14+), NPM.

```bash
cd software/backlash_test

# Install dependencies
npm install

# Configure environment variables
# Create a .env file or set these manually
export SERIAL_PORT=COM3           # Or /dev/ttyUSB0 on Linux/Mac
export SERIAL_BAUD_RATE=1000000
```

**Running the Experiment:**

To start the control loop and logging:

```bash
node app.js
```

*   Configuration for motion patterns and servo IDs is located in `sweepConfig.js`.
*   Logs are automatically saved to the `logs/` directory.

### 2. Data Analysis (Python)

Python scripts are provided to parse the CSV logs, calculate effective backlash, and generate the plots used in the paper.

**Prerequisites:** Python 3.8+, pandas, matplotlib, numpy.

```bash
# Install required packages
pip install pandas matplotlib numpy
```

**Visualizing Results:**

```bash
# Visualize a specific log file
python software/logs_visualisation/log_viz.py logs/motor_telemetry.csv

# Calculate backlash statistics
python software/logs_calculation/log_calc.py logs/motor_telemetry.csv
```

## 📄 Research Paper

The full text of the research paper is located in the `paper/` directory.
You can compile it using any standard LaTeX distribution (TeX Live, MiKTeX) or online editor (Overleaf).

## 👥 Author Information

**Boris Kotov**
*   Senior Software Engineer, Robotics Control Systems.
*   Email: [hello@robonine.com](mailto:hello@robonine.com)

**Company: Robonine**
*   Developing accessible robotic solutions for education and research.
*   Website: [robonine.com](https://robonine.com)

## 📜 License

This project and the associated paper are distributed under the **Creative Commons Attribution 4.0 International License (CC BY 4.0)**.
You are free to share and adapt the material as long as appropriate credit is given.
