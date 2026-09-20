# ENABL - Site Operations Dashboard

A modern web application built for ENABL to manage wind & solar sites, monitor status, and track installation tasks.

## 🛠️ Tech Stack
- **Frontend:** React.js, Vite, CSS3 (Custom Responsive Styling)
- **Backend:** Node.js, Express.js
- **State Management:** React Hooks (`useState`, `useEffect`)

## ✨ Key Features
- **Key Metrics Overview:** Cards displaying total sites, active sites, total installations, and completed tasks.
- **Sites Management:**
  - View site details (ID, Site Name, Location, Status).
  - Search sites by name or location.
  - Filter sites by status (Active, Inactive, Pending).
  - Dynamic **Add New Site** form validation & instant table update.
- **Installation Tracking:** Tabbed interface for tracking ongoing site tasks.

## 🚀 How to Run the Project Locally

### Prerequisites
- Node.js installed on your machine

## Getting Started / Local Installation

To run this project locally on your machine, follow these steps:

### 1. Clone the Repository
\`\`\`bash
git clone https://github.com/Shabavudeen/enabl-site-operations-dashboard.git
cd enabl-site-operations-dashboard
\`\`\`

### 2. Backend Setup & Run
Navigate to the backend directory, install dependencies, and start the server:
\`\`\`bash
cd backend
npm install
npm start
\`\`\`

### 3. Frontend Setup & Run
Open a new terminal tab, navigate to the frontend directory, install dependencies, and run the development server:
\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`
