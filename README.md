<div align="center">
  <img src="https://via.placeholder.com/150x150.png?text=MedFlow+Logo" alt="MedFlow Logo" width="120" height="120" />
  <h1>🏥 MedFlow</h1>
  <p><strong>Next-Generation Hospital Resource Management & Patient Simulation Platform</strong></p>

  [![React](https://img.shields.io/badge/React-18-blue.svg?style=for-the-badge&logo=react)](https://reactjs.org/)
  [![Node.js](https://img.shields.io/badge/Node.js-Backend-green.svg?style=for-the-badge&logo=nodedotjs)](https://nodejs.org/)
  [![Socket.io](https://img.shields.io/badge/Socket.io-Realtime-black.svg?style=for-the-badge&logo=socketdotio)](https://socket.io/)
  [![Vite](https://img.shields.io/badge/Vite-Bundler-646CFF.svg?style=for-the-badge&logo=vite)](https://vitejs.dev/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791.svg?style=for-the-badge&logo=postgresql)](https://postgresql.org/)
</div>

<br />

## 🌟 Overview

**MedFlow** is a comprehensive, real-time hospital management simulator designed to model and optimize patient flow, resource allocation, and department load. Through live data synchronization and advanced simulation algorithms, MedFlow allows hospital administrators to visualize the entire healthcare ecosystem in action—from emergency room triage to ICU bed availability.

Whether managing standard operations or stress-testing a "surge" scenario, MedFlow provides actionable insights to minimize patient wait times and maximize clinical efficiency.

---

## ✨ Key Features

- 🚦 **Live Priority Queue**: Dynamically sorts patients based on triage urgency, wait time, and condition severity.
- 🎛️ **Simulation Visualizer**: Watch real-time hospital flow as patients move through departments (Emergency, Cardiology, Orthopedics).
- 📊 **Analytics Dashboard**: Compare scheduling strategies (FCFS vs. Urgency-based) and view key performance indicators (KPIs).
- 🛌 **Hospital Operations**: Track utilization of crucial resources like General Beds, ICU Beds, Operating Rooms, Doctors, and Nurses.
- ⚡ **Surge & Failure Scenarios**: Test system resilience by enabling "Surge Mode" or simulating resource failures (e.g., an ICU bed going offline).
- 📝 **Patient Intake Form**: Inject custom patient profiles into the live simulation loop.

---

## 🏗️ System Architecture

MedFlow uses a decoupled client-server architecture, relying heavily on WebSockets for real-time state synchronization between the simulation engine and the visual dashboard.

```mermaid
graph TD;
    subgraph Frontend [React + Vite Dashboard]
        A[Dashboard/UI] --> B[Socket.IO Client]
        B --> C[State Management/Hooks]
        C --> D[Visualizer / Charts]
    end

    subgraph Backend [Node.js + Express]
        E[API Routes] --> F[Simulation Engine]
        G[Socket.IO Gateway] <--> F
    end

    subgraph Database [Persistence]
        H[(PostgreSQL Database)]
    end

    B <-->|Real-time Events| G
    A -->|REST Requests| E
    F -->|Read/Write State| H
```

---

## 🗄️ Database Schema (ER Diagram)

The core PostgreSQL database models the relationship between Patients, physical Resources, their Allocations, and time-series Metrics.

```mermaid
erDiagram
    PATIENTS ||--o{ RESOURCE_ALLOCATIONS : has
    RESOURCES ||--o{ RESOURCE_ALLOCATIONS : assigned_to

    PATIENTS {
        string id PK
        string name
        int age
        string department
        jsonb vitals
        jsonb symptoms
        numeric critical_level
        numeric deterioration_rate
        int treatment_duration
        string status
        numeric priority_score
        jsonb required_resources
    }

    RESOURCES {
        string id PK
        string name
        string type
        string specialization
        string status
        string current_patient_id FK
        int total_busy_time
    }

    RESOURCE_ALLOCATIONS {
        int id PK
        string patient_id FK
        string resource_id FK
        int allocated_at_sim_time
        int released_at_sim_time
        string status
    }

    SIMULATION_METRICS {
        int id PK
        int sim_time_minutes
        int waiting_count
        int active_treatment_count
        int completed_count
        numeric avg_wait_time_minutes
        numeric icu_occupancy_rate
    }
```

---

## 💻 Tech Stack

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Pure CSS (`styles.css`, `operations.css`, etc.)
- **Icons**: Lucide React
- **Realtime**: Socket.IO-Client

### Backend
- **Runtime**: Node.js & Express
- **Language**: TypeScript
- **Realtime**: Socket.IO
- **Validation**: Zod
- **Database**: PostgreSQL (pg)

---

## 🚀 Getting Started (Step-by-Step Guide)

Follow these instructions to get a local copy of MedFlow up and running. This includes setting up the database, backend server, and frontend client.

### Prerequisites

Before you begin, ensure you have the following installed on your machine:
- **[Node.js](https://nodejs.org/en/)** (v16 or higher)
- **[PostgreSQL](https://postgresql.org/)** (v12 or higher). Alternatively, you can use a cloud provider like [Supabase](https://supabase.com/) or [Neon](https://neon.tech/).
- **Git**

---

### Step 1: Clone the repository

First, clone the repository to your local machine and navigate into the project directory:

```bash
git clone https://github.com/talibuilds/MedFlow.git
cd MedFlow
```

---

### Step 2: Database Setup

MedFlow requires a PostgreSQL database to store patient and simulation data.

1. **Start PostgreSQL**: Make sure your local PostgreSQL service is running.
2. **Create a Database**: Open your terminal or a UI tool like pgAdmin/DBeaver and run:
   ```sql
   CREATE DATABASE medflow;
   ```
3. **Database URL**: Note your connection string. It will look something like this:
   `postgresql://username:password@localhost:5432/medflow`
4. **Note**: You do *not* need to manually run the SQL schema files. The backend is configured to automatically initialize the database schema upon first launch.

---

### Step 3: Backend Setup

The backend handles the simulation engine and real-time WebSockets.

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Create environment variables:
   Create a `.env` file in the root of the `backend` folder and add your database URL:
   ```env
   PORT=5000
   DATABASE_URL="postgresql://username:password@localhost:5432/medflow"
   DEBUG_SQL=false
   ```
   *(Be sure to replace `username` and `password` with your actual Postgres credentials).*

4. Start the backend development server:
   ```bash
   npm run dev
   ```
   You should see console logs indicating that the server is running on `http://localhost:5000` and the database schema has been initialized.

---

### Step 4: Frontend Setup

The frontend provides the React UI dashboard.

1. Open a **new terminal window** (keep the backend running) and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```

---

### Step 5: View the Application

Once both servers are running, open your browser and navigate to:
👉 **[http://localhost:5173](http://localhost:5173)**

You are now running the MedFlow Hospital Simulation platform!

---

## 📸 Screenshots

*(Replace these placeholder links with actual screenshots of your application)*

| Dashboard Overview | Live Simulation |
| :---: | :---: |
| <img src="https://via.placeholder.com/400x250.png?text=Dashboard+Screenshot" alt="Dashboard" /> | <img src="https://via.placeholder.com/400x250.png?text=Simulation+Screenshot" alt="Visualizer" /> |
| **Hospital Operations** | **Analytics & Strategy** |
| <img src="https://via.placeholder.com/400x250.png?text=Operations+Screenshot" alt="Operations" /> | <img src="https://via.placeholder.com/400x250.png?text=Analytics+Screenshot" alt="Analytics" /> |

---

## 🤝 Contributing

Contributions make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
  <b>Built with ❤️ for better healthcare resource management.</b>
</div>
