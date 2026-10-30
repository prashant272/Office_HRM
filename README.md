# Office HRM & Field Management System

A comprehensive, production-ready Office Human Resource Management (HRM) and Field Sales Tracking platform with real-time continuous session monitoring, in-person field visit OTP verification, Cloudflare R2 evidence storage, and automated attendance geofencing.

---

## 🌟 Key Features

### 🏢 Two Distinct Portals
- **Admin Console:**
  - Real-time employee heartbeat & inactivity alerts (>10 minutes inactive).
  - Attendance logs, browser session audit trail, and correction request approvals.
  - Field Sales Meeting verification review (selfie, client business card, OTP verification status).
  - Employee directory, departments, shift scheduling, and salary details.
- **Employee Portal:**
  - Mobile-responsive dashboard with punch clock (Clock In / Clock Out).
  - 5-Step Field Sales Meeting Execution Wizard:
    1. Client & Location details
    2. Real-time WhatsApp (Wabridge API) & Email (Gmail SMTP) 6-digit OTP verification
    3. On-site live device camera selfie capture
    4. Client business card upload
    5. Meeting notes, outcomes & review submission
  - Cloudflare R2 cloud evidence uploads.
  - Attendance history and correction request submission.
  - AI Performance & Productivity radar.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS, Lucide React, Recharts, Axios, Moment.js.
- **Backend:** Node.js, Express, Socket.IO, Mongoose, JWT, Nodemailer, Axios.
- **Database:** MongoDB Atlas.
- **Cloud Storage:** Cloudflare R2 (S3-compatible object storage).
- **Communication:** Wabridge WhatsApp API, Gmail SMTP.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- MongoDB Atlas or local MongoDB instance

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Fill in your MongoDB URI, Wabridge, Gmail SMTP, and Cloudflare R2 keys
node server.js
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

The application will be accessible at `http://localhost:5173`.

---

## 🔐 Default Seed Credentials

- **Admin Account:**
  - Email: `admin@office.com`
  - Password: `adminpassword123`
  - Role: `admin`

- **Employee Account:**
  - Email: `rahul.verma@office.com`
  - Password: `employee123`
  - Role: `employee`

---

## 📄 License
This project is licensed under the MIT License.
